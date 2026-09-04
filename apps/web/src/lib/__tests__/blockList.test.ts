import { describe, it, expect } from 'vitest';
import { moveAt, removeById, stripIds, updateById, withIds } from '../blockList';

const blocks = () =>
  withIds([
    { type: 'cardGrid', heading: 'Practices' },
    { type: 'platformChips', heading: 'Stack' },
    { type: 'logoGrid', heading: 'Certifications' },
    { type: 'ctaBand', heading: 'Talk to us' },
  ]);

describe('withIds / stripIds', () => {
  it('gives every block a distinct id', () => {
    const list = blocks();
    expect(new Set(list.map((b) => b.id)).size).toBe(4);
  });

  it('never writes the id into the block that gets stored', () => {
    // The id is an editing concern. If it reached the database it would fail
    // the block schema on the next save.
    for (const block of stripIds(blocks())) {
      expect(block).not.toHaveProperty('id');
      expect(Object.keys(block).sort()).toEqual(['heading', 'type']);
    }
  });

  it('round-trips the blocks unchanged', () => {
    const original = [{ type: 'richText', html: '<p>Hi</p>' }];
    expect(stripIds(withIds(original))).toEqual(original);
  });
});

describe('removeById', () => {
  it('removes the block that was asked for', () => {
    const list = blocks();
    const after = removeById(list, list[2].id);
    expect(after.map((b) => b.block.type)).toEqual(['cardGrid', 'platformChips', 'ctaBand']);
  });

  it('leaves every survivor paired with its own block', () => {
    // The actual regression: addressing blocks by index meant the block after
    // a removal inherited the removed block's editor state, and a later
    // keystroke wrote the deleted section back into the page.
    const list = blocks();
    const removed = list[1];
    const after = removeById(list, removed.id);

    expect(after.some((b) => b.id === removed.id)).toBe(false);
    for (const survivor of after) {
      expect(survivor.block).toBe(list.find((b) => b.id === survivor.id)?.block);
    }
  });

  it('is a no-op for an id that is not present', () => {
    expect(removeById(blocks(), 'nope')).toHaveLength(4);
  });

  it('does not mutate the array it is given', () => {
    const list = blocks();
    removeById(list, list[0].id);
    expect(list).toHaveLength(4);
  });
});

describe('updateById', () => {
  it('replaces only the addressed block', () => {
    const list = blocks();
    const after = updateById(list, list[1].id, { type: 'platformChips', heading: 'Changed' });
    expect(after[1].block.heading).toBe('Changed');
    expect(after[0].block).toBe(list[0].block);
    expect(after[2].block).toBe(list[2].block);
  });

  it('keeps the id stable across an edit', () => {
    const list = blocks();
    expect(updateById(list, list[0].id, { type: 'cardGrid' })[0].id).toBe(list[0].id);
  });

  it('still addresses the right block after an earlier one is removed', () => {
    const list = blocks();
    const after = removeById(list, list[0].id);
    const edited = updateById(after, after[0].id, { type: 'platformChips', heading: 'Edited' });
    expect(edited.map((b) => b.block.heading)).toEqual(['Edited', 'Certifications', 'Talk to us']);
  });
});

describe('moveAt', () => {
  it('swaps a block with the one above it', () => {
    expect(moveAt(blocks(), 1, -1).map((b) => b.block.type)).toEqual([
      'platformChips',
      'cardGrid',
      'logoGrid',
      'ctaBand',
    ]);
  });

  it('carries the id along with the block', () => {
    const list = blocks();
    const moved = moveAt(list, 0, 1);
    expect(moved[1].id).toBe(list[0].id);
    expect(moved[1].block).toBe(list[0].block);
  });

  it('returns the list unchanged at either end', () => {
    const list = blocks();
    expect(moveAt(list, 0, -1)).toBe(list);
    expect(moveAt(list, 3, 1)).toBe(list);
  });

  it('does not mutate the array it is given', () => {
    const list = blocks();
    const types = list.map((b) => b.block.type);
    moveAt(list, 0, 1);
    expect(list.map((b) => b.block.type)).toEqual(types);
  });
});

describe('a full remove-then-edit-then-save cycle', () => {
  it('drops the removed section from what gets stored', () => {
    const list = blocks();
    const after = removeById(list, list[2].id);
    // Editing a survivor afterwards must not resurrect the removed block.
    const edited = updateById(after, after[0].id, { type: 'cardGrid', heading: 'Practices v2' });
    const stored = stripIds(edited);

    expect(stored.map((b) => b.type)).toEqual(['cardGrid', 'platformChips', 'ctaBand']);
    expect(stored.some((b) => b.type === 'logoGrid')).toBe(false);
    expect(stored[0].heading).toBe('Practices v2');
  });
});
