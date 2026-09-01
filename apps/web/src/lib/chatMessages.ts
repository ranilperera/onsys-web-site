export interface ChatMessage {
  id?: string;
  role: 'VISITOR' | 'ASSISTANT' | 'AGENT' | 'SYSTEM';
  content: string;
  authorName?: string | null;
  citations?: Array<{ title: string; url: string }> | null;
  createdAt?: string;
}

/**
 * Reconcile polled server messages with what the widget is already showing.
 *
 * The widget appends some messages the moment it has the text — the visitor's
 * own message, the assistant's reply, the escalation notice — because the POST
 * response carries strings rather than database rows. Those local copies have
 * no `id`. The server persists all of it, so the poll later hands back the real
 * row, whose id has never been seen, and the message appears twice.
 *
 * Server rows win: an optimistic copy is retired as soon as its counterpart
 * arrives. Matching is one-for-one rather than by set membership, because a
 * visitor who genuinely sends "hi" twice has two pending copies, and dropping
 * both when the first is confirmed would make the second disappear until the
 * next poll.
 */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const knownIds = new Set(current.map((m) => m.id).filter(Boolean) as string[]);
  const fresh = incoming.filter((m) => !m.id || !knownIds.has(m.id));
  if (fresh.length === 0) return current;

  const pending = [...current];
  for (const confirmed of fresh) {
    const i = pending.findIndex(
      (p) => !p.id && p.role === confirmed.role && p.content === confirmed.content,
    );
    if (i !== -1) pending.splice(i, 1);
  }

  return [...pending, ...fresh];
}

/** Timestamp the next poll should ask for messages after. */
export function lastTimestamp(messages: ChatMessage[]): string | null {
  return messages.length ? (messages[messages.length - 1].createdAt ?? null) : null;
}
