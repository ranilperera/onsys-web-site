import { describe, it, expect } from 'vitest';
import { mergeMessages, lastTimestamp, type ChatMessage } from '../chatMessages';

const optimistic = (role: ChatMessage['role'], content: string): ChatMessage => ({ role, content });
const stored = (id: string, role: ChatMessage['role'], content: string): ChatMessage => ({
  id,
  role,
  content,
  createdAt: `2026-09-02T00:00:${id.padStart(2, '0')}.000Z`,
});

describe('mergeMessages', () => {
  it('retires the optimistic copy when the server confirms it', () => {
    // The reported bug: everything the visitor typed appeared twice once a
    // human joined and polling began.
    const shown = [stored('01', 'ASSISTANT', 'Hi — how can I help?'), optimistic('VISITOR', 'hi')];
    const merged = mergeMessages(shown, [stored('02', 'VISITOR', 'hi')]);

    expect(merged).toHaveLength(2);
    expect(merged.filter((m) => m.content === 'hi')).toHaveLength(1);
    expect(merged[1].id).toBe('02');
  });

  it('retires an optimistic system notice the same way', () => {
    // The escalation notice is both returned by the POST and persisted, which
    // is why "I've passed this to our team" showed up twice.
    const notice = "I've passed this to our team — someone will reply here shortly.";
    const merged = mergeMessages([optimistic('SYSTEM', notice)], [stored('05', 'SYSTEM', notice)]);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('05');
  });

  it('keeps both when the visitor really did send the same text twice', () => {
    const shown = [optimistic('VISITOR', 'hi'), optimistic('VISITOR', 'hi')];
    const merged = mergeMessages(shown, [stored('01', 'VISITOR', 'hi'), stored('02', 'VISITOR', 'hi')]);

    expect(merged.filter((m) => m.content === 'hi')).toHaveLength(2);
    expect(merged.every((m) => m.id)).toBe(true);
  });

  it('does not drop a second pending copy when only the first is confirmed', () => {
    // One-for-one matching matters here: a set-based check would remove both
    // and the visitor would watch their own message vanish.
    const shown = [optimistic('VISITOR', 'hi'), optimistic('VISITOR', 'hi')];
    const merged = mergeMessages(shown, [stored('01', 'VISITOR', 'hi')]);

    expect(merged.filter((m) => m.content === 'hi')).toHaveLength(2);
    expect(merged.filter((m) => !m.id)).toHaveLength(1);
  });

  it('ignores rows it already has', () => {
    const shown = [stored('01', 'VISITOR', 'hi')];
    expect(mergeMessages(shown, [stored('01', 'VISITOR', 'hi')])).toBe(shown);
  });

  it('appends genuinely new agent replies', () => {
    const shown = [stored('01', 'VISITOR', 'hi')];
    const merged = mergeMessages(shown, [stored('02', 'AGENT', 'Hello, Ranil here.')]);

    expect(merged).toHaveLength(2);
    expect(merged[1].content).toBe('Hello, Ranil here.');
  });

  it('does not match across roles', () => {
    // Same text from a different speaker is a different message.
    const shown = [optimistic('VISITOR', 'hello')];
    const merged = mergeMessages(shown, [stored('01', 'AGENT', 'hello')]);

    expect(merged).toHaveLength(2);
  });

  it('returns the same array when nothing is new, so React can skip the render', () => {
    const shown = [stored('01', 'VISITOR', 'hi')];
    expect(mergeMessages(shown, [])).toBe(shown);
  });
});

describe('lastTimestamp', () => {
  it('reads the newest message', () => {
    expect(lastTimestamp([stored('01', 'VISITOR', 'a'), stored('02', 'AGENT', 'b')])).toBe(
      '2026-09-02T00:00:02.000Z',
    );
  });

  it('is null for an empty history, so the first poll asks for everything', () => {
    expect(lastTimestamp([])).toBeNull();
  });
});
