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
  /\b(outage|down|offline|not working|emergency|urgent|critical|incident|breach|ransomware)\b/,
  /\bcall me\b/,
  /\b(complaint|complain|frustrat|useless|unhelpful)\w*\b/,
];

/**
 * True when a message should go straight to a human — either an explicit
 * request, or something time-critical enough that an AI answer is the wrong
 * response regardless of how confident the model is.
 */
export function wantsHuman(message: string): boolean {
  const text = message.toLowerCase();
  return ESCALATION_PATTERNS.some((pattern) => pattern.test(text));
}
