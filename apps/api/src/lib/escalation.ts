/**
 * Deterministic escalation triage.
 *
 * Kept free of database and model imports deliberately: this is pure policy,
 * it runs before we spend an LLM call, and it must stay trivially testable.
 */

const ESCALATION_PATTERNS: RegExp[] = [
  /\b(speak|talk|chat)\s+(to|with)\s+(a\s+)?(human|person|someone|agent|consultant|engineer|dba)\b/,
  /\breal (person|human)\b/,
  /\b(operator|representative)\b/,
  /\bcall me\b/,
  /\b(complaint|complain|frustrat|useless|unhelpful)\w*\b/,
];

/**
 * Something is broken right now.
 *
 * Deliberately separate from wantsHuman: chat is not an incident intake
 * channel. A P1 raised here would carry no reference number and start no SLA
 * clock, so these messages are answered with the 24/7 number rather than
 * queued behind whoever happens to be watching Teams. The team is still
 * notified, but as a heads-up — not as the system of record.
 */
const INCIDENT_PATTERNS: RegExp[] = [
  /\b(outage|offline|not working|emergency|critical|incident|breach|ransomware)\b/,
  /\b(database|server|site|website|system|production|prod|instance)\b[^.!?]{0,40}\bdown\b/,
  /\bdown\b[^.!?]{0,20}\b(right now|since|this morning|completely)\b/,
  /\b(data ?loss|corrupt(ed|ion)?|cannot restore|can't restore|failed over)\b/,
];

/**
 * True when a message should go straight to a human — an explicit request, or
 * a visitor unhappy enough that an AI answer is the wrong response regardless
 * of how confident the model is.
 */
export function wantsHuman(message: string): boolean {
  const text = message.toLowerCase();
  return ESCALATION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * True when the visitor is reporting a live incident and should be pointed at
 * the phone instead.
 *
 * "down" is only treated as an incident next to something that can actually be
 * down. On its own it matches "our costs are down" and "the price came down",
 * and sending that visitor an outage script reads as though nobody is
 * listening.
 */
export function reportsIncident(message: string): boolean {
  const text = message.toLowerCase();
  return INCIDENT_PATTERNS.some((pattern) => pattern.test(text));
}
