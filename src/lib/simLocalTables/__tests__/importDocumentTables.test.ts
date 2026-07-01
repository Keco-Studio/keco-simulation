import { describe, expect, it } from 'vitest';
import { parseMarkdownTablesToLocalTableDrafts } from '../importDocumentTables';

describe('import document tables', () => {
  it('creates independent local table drafts for multiple markdown tables', () => {
    let n = 0;
    const drafts = parseMarkdownTablesToLocalTableDrafts(
      [
        '## Characters',
        '| id | name |',
        '| --- | --- |',
        '| c1 | Hero |',
        '',
        '## Skills',
        '| id | power |',
        '| --- | --- |',
        '| s1 | 1.5 |',
      ].join('\n'),
      { now: 1000, idFactory: () => `id-${++n}` },
    );

    expect(drafts).toHaveLength(2);
    expect(drafts[0].meta.name).toBe('Characters');
    expect(drafts[1].meta.name).toBe('Skills');
    expect(drafts[0].meta.id).not.toBe(drafts[1].meta.id);
    expect(drafts[0].rows[0].values).toEqual({ id: 'c1', name: 'Hero' });
    expect(drafts[1].rows[0].values).toEqual({ id: 's1', power: '1.5' });
  });
});
