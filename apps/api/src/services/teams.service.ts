import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { env, graphConfigured, teamsConfigured } from '../lib/env';
import { logger } from '../lib/logger';

/**
 * Teams escalation for the chat widget.
 *
 * Two supported transports, chosen automatically:
 *
 * A) Incoming Webhook (TEAMS_WEBHOOK_URL) — simplest. Posts an Adaptive Card
 *    into the channel. One-way: staff see the enquiry and click through to the
 *    admin console to reply. No Azure app registration needed.
 *
 * B) Graph channel messages (TEAMS_TEAM_ID + TEAMS_CHANNEL_ID) — richer.
 *    Posts a real channel message and returns its id, so staff can reply *in
 *    the Teams thread* and those replies are pulled back into the widget by
 *    `fetchThreadReplies` (polled by the chat route). Requires the app
 *    registration to hold ChannelMessage.Send + ChannelMessage.Read.All
 *    application permissions with admin consent.
 *
 * Replies can also be pushed to us instead of polled — see
 * POST /api/chat/teams-reply, which a Power Automate flow can call.
 */

let cachedClient: Client | null = null;

/**
 * Microsoft only permits application-only POSTs to a channel for the migration
 * / import API — a normal app-only post is rejected with 401 regardless of the
 * permissions granted or the admin consent given. It is a platform rule, not a
 * misconfiguration, so once we have seen it there is no point paying for a
 * token acquisition and a round-trip on every subsequent escalation.
 */
let graphChannelPostBlocked = false;

const isAppOnlyPostRefusal = (error: unknown): boolean =>
  /application-only context only for import purposes/i.test(
    (error as { message?: string })?.message ?? '',
  );

function getGraphClient(): Client {
  if (cachedClient) return cachedClient;
  const credential = new ClientSecretCredential(
    env.GRAPH_TENANT_ID!,
    env.GRAPH_CLIENT_ID!,
    env.GRAPH_CLIENT_SECRET!,
  );
  cachedClient = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken('https://graph.microsoft.com/.default');
        if (!token) throw new Error('Failed to acquire Microsoft Graph access token');
        return token.token;
      },
    },
  });
  return cachedClient;
}

export interface EscalationPayload {
  sessionId: string;
  visitorName?: string | null;
  visitorEmail?: string | null;
  entryUrl?: string | null;
  reason?: string | null;
  transcript: Array<{ role: string; content: string }>;
}

const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Makes a value safe to drop into an Adaptive Card's JSON.
 *
 * A Power Automate flow substitutes these fields directly into card JSON, so a
 * visitor who types a double quote — or simply presses Enter mid-message —
 * would produce invalid JSON and fail the run with a schema error that says
 * nothing about the real cause. Emitting the escape sequences keeps the card
 * valid, and \n still renders as a line break inside a TextBlock.
 */
const jsonSafe = (v: string) =>
  v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');

function buildAdaptiveCard(payload: EscalationPayload) {
  const lastMessages = payload.transcript.slice(-6);

  return {
    // Flat copies of everything a Power Automate flow needs. Teams ignores
    // unknown top-level properties when it renders the card, but a flow can
    // read triggerBody()?['sessionId'] directly instead of indexing into
    // attachments[0].content.body[1].facts[4] — which silently starts pointing
    // at the wrong visitor the first time anyone reorders the card.
    kind: 'chat-escalation',
    sessionId: payload.sessionId,
    visitorName: jsonSafe(payload.visitorName || 'Anonymous'),
    visitorEmail: jsonSafe(payload.visitorEmail || ''),
    entryUrl: jsonSafe(payload.entryUrl || ''),
    reason: jsonSafe(payload.reason || 'Requested a human'),
    transcriptText: lastMessages
      .map((m) => jsonSafe(`${m.role === 'VISITOR' ? 'Visitor' : 'Assistant'}: ${m.content}`))
      .join('\\n'),
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          msteams: { width: 'Full' },
          body: [
            {
              type: 'TextBlock',
              text: '🔔 Live chat needs a human',
              weight: 'Bolder',
              size: 'Large',
              color: 'Attention',
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Visitor', value: payload.visitorName || 'Anonymous' },
                { title: 'Email', value: payload.visitorEmail || '—' },
                { title: 'Page', value: payload.entryUrl || '—' },
                { title: 'Reason', value: payload.reason || 'Requested a human' },
                { title: 'Session', value: payload.sessionId },
              ],
            },
            {
              type: 'TextBlock',
              text: 'Recent conversation',
              weight: 'Bolder',
              spacing: 'Medium',
              wrap: true,
            },
            ...lastMessages.map((m) => ({
              type: 'TextBlock',
              text: `**${m.role === 'VISITOR' ? 'Visitor' : 'Assistant'}:** ${m.content}`,
              wrap: true,
              spacing: 'Small',
            })),
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'Reply to this visitor',
              // Query string, not a path segment: /admin/chat is a single
              // console with an in-page session list, so /admin/chat/<id>
              // has no route and 404s.
              url: `${env.SITE_URL}/admin/chat?session=${payload.sessionId}`,
            },
          ],
        },
      },
    ],
  };
}

export interface EscalationResult {
  delivered: boolean;
  threadId?: string;
  transport: 'webhook' | 'graph' | 'none';
}

export async function escalateToTeams(payload: EscalationPayload): Promise<EscalationResult> {
  if (!teamsConfigured) {
    logger.warn({ sessionId: payload.sessionId }, 'Teams not configured — escalation not delivered');
    return { delivered: false, transport: 'none' };
  }

  // Prefer Graph when fully configured: it gives us a thread id for two-way chat.
  if (env.TEAMS_TEAM_ID && env.TEAMS_CHANNEL_ID && graphConfigured && !graphChannelPostBlocked) {
    try {
      const transcriptHtml = payload.transcript
        .slice(-6)
        .map(
          (m) =>
            `<p><b>${m.role === 'VISITOR' ? 'Visitor' : 'Assistant'}:</b> ${escapeHtml(m.content)}</p>`,
        )
        .join('');

      const body = {
        subject: `Live chat — ${payload.visitorName || 'Anonymous visitor'}`,
        body: {
          contentType: 'html',
          content: `<h3>🔔 Live chat needs a human</h3>
            <p><b>Visitor:</b> ${escapeHtml(payload.visitorName || 'Anonymous')}<br/>
               <b>Email:</b> ${escapeHtml(payload.visitorEmail || '—')}<br/>
               <b>Page:</b> ${escapeHtml(payload.entryUrl || '—')}<br/>
               <b>Session:</b> ${payload.sessionId}</p>
            <p><i>Reply in this thread and your message goes straight back to the visitor.</i></p>
            <hr/>${transcriptHtml}`,
        },
      };

      const res = await getGraphClient()
        .api(`/teams/${env.TEAMS_TEAM_ID}/channels/${env.TEAMS_CHANNEL_ID}/messages`)
        .post(body);

      logger.info({ sessionId: payload.sessionId, threadId: res.id }, 'Escalated to Teams via Graph');
      return { delivered: true, threadId: res.id, transport: 'graph' };
    } catch (error) {
      if (isAppOnlyPostRefusal(error)) {
        graphChannelPostBlocked = true;
        logger.warn(
          'Teams Graph posting is not available: Microsoft only allows app-only channel posts for '
            + 'migration/import. Falling back to TEAMS_WEBHOOK_URL for the rest of this process. '
            + 'Set TEAMS_WEBHOOK_URL (Teams channel → ⋯ → Workflows) and unset TEAMS_TEAM_ID/'
            + 'TEAMS_CHANNEL_ID to silence this.',
        );
      } else {
        logger.error({ err: error, sessionId: payload.sessionId }, 'Graph Teams post failed, trying webhook');
      }
      // fall through to webhook
    }
  }

  if (env.TEAMS_WEBHOOK_URL) {
    try {
      const res = await fetch(env.TEAMS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildAdaptiveCard(payload)),
      });
      if (!res.ok) throw new Error(`Teams webhook returned ${res.status}`);
      logger.info({ sessionId: payload.sessionId }, 'Escalated to Teams via webhook');
      return { delivered: true, transport: 'webhook' };
    } catch (error) {
      logger.error({ err: error, sessionId: payload.sessionId }, 'Teams webhook post failed');
    }
  }

  return { delivered: false, transport: 'none' };
}

export interface TeamsReply {
  id: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

/**
 * Pull replies posted by staff in the Teams thread so they can be surfaced in
 * the visitor's widget. Returns [] when Graph two-way mode isn't configured.
 */
export async function fetchThreadReplies(threadId: string): Promise<TeamsReply[]> {
  if (!env.TEAMS_TEAM_ID || !env.TEAMS_CHANNEL_ID || !graphConfigured) return [];

  try {
    const res = await getGraphClient()
      .api(`/teams/${env.TEAMS_TEAM_ID}/channels/${env.TEAMS_CHANNEL_ID}/messages/${threadId}/replies`)
      .get();

    const values: any[] = res?.value ?? [];
    return values
      .filter((m) => m?.body?.content)
      .map((m) => ({
        id: m.id as string,
        authorName: (m.from?.user?.displayName as string) || 'Onsys',
        // Teams returns HTML; strip tags for the widget bubble.
        content: String(m.body.content)
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .trim(),
        createdAt: new Date(m.createdDateTime),
      }))
      .filter((m) => m.content.length > 0);
  } catch (error) {
    logger.error({ err: error, threadId }, 'Failed to fetch Teams thread replies');
    return [];
  }
}

/** Notify the channel that a new lead came through the contact form. */
export async function notifyLeadToTeams(lead: {
  name: string;
  email: string;
  company?: string | null;
  service?: string | null;
  message?: string | null;
}): Promise<void> {
  if (!env.TEAMS_WEBHOOK_URL) return;

  try {
    await fetch(env.TEAMS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Same reason as buildAdaptiveCard: a flow reads these flat. `kind` is
        // what lets one webhook serve both notifications — a lead has no
        // session to reply into, so the flow must not offer a reply box for it.
        kind: 'lead',
        visitorName: lead.name,
        visitorEmail: lead.email,
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              type: 'AdaptiveCard',
              version: '1.4',
              body: [
                { type: 'TextBlock', text: '📩 New website enquiry', weight: 'Bolder', size: 'Large' },
                {
                  type: 'FactSet',
                  facts: [
                    { title: 'Name', value: lead.name },
                    { title: 'Email', value: lead.email },
                    { title: 'Company', value: lead.company || '—' },
                    { title: 'Service', value: lead.service || '—' },
                  ],
                },
                ...(lead.message
                  ? [{ type: 'TextBlock', text: lead.message, wrap: true, spacing: 'Medium' }]
                  : []),
              ],
            },
          },
        ],
      }),
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to post lead notification to Teams');
  }
}
