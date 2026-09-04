/**
 * Identity-keyed list operations for the page editor's blocks.
 *
 * Stored blocks are plain JSON with no id of their own, so the editor assigns
 * one when it loads them. That identity is what lets React tell the rows
 * apart: the first version of this editor keyed the list by array index, and
 * because each JSON editor keeps its own text in component state, removing a
 * block left the surviving component at that index holding the *removed*
 * block's text — which it then wrote back into the array on the next
 * keystroke, resurrecting a section the author had deleted.
 *
 * The operations live here rather than inline in the component so the rule
 * they encode — address a block by id, never by position — is testable.
 */

export type LooseBlock = Record<string, unknown> & { type: string };

export interface EditorBlock {
  id: string;
  block: LooseBlock;
}

let counter = 0;

/** Ids only need to be unique within one editing session, not stable across them. */
export function nextBlockId(): string {
  counter += 1;
  return `b${counter}`;
}

/** Wrap stored blocks for editing. */
export function withIds(blocks: LooseBlock[]): EditorBlock[] {
  return blocks.map((block) => ({ id: nextBlockId(), block }));
}

/**
 * Unwrap for saving.
 *
 * The id is held beside the block rather than on it precisely so this step
 * cannot forget to strip it — there is nothing to strip.
 */
export function stripIds(blocks: EditorBlock[]): LooseBlock[] {
  return blocks.map((b) => b.block);
}

export function updateById(
  blocks: EditorBlock[],
  id: string,
  next: LooseBlock,
): EditorBlock[] {
  return blocks.map((b) => (b.id === id ? { ...b, block: next } : b));
}

export function removeById(blocks: EditorBlock[], id: string): EditorBlock[] {
  return blocks.filter((b) => b.id !== id);
}

/**
 * Move a block by `delta` positions, clamped at both ends.
 *
 * Returns the original array when the move would fall off the end, so a
 * caller can treat an out-of-range move as a no-op without checking first.
 */
export function moveAt(blocks: EditorBlock[], index: number, delta: number): EditorBlock[] {
  const target = index + delta;
  if (index < 0 || index >= blocks.length || target < 0 || target >= blocks.length) {
    return blocks;
  }
  const next = [...blocks];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
