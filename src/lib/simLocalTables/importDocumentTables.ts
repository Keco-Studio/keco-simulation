import type { SimLocalColumnDef, SimTableMeta, SimTableRow } from './types';

export type SimLocalTableImportDraft = {
  meta: SimTableMeta;
  rows: SimTableRow[];
};

type ParseOptions = {
  now?: number;
  idFactory?: () => string;
};

function defaultIdFactory(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `import_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function splitMarkdownRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isMarkdownTableSeparator(line: string): boolean {
  const cells = splitMarkdownRow(line);
  if (cells.length === 0) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function headingText(line: string): string | null {
  const match = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
  return match ? match[1].trim() : null;
}

function makeColumnKey(label: string, index: number, used: Set<string>): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || `column_${index + 1}`;
  let key = base;
  let suffix = 2;
  while (used.has(key)) {
    key = `${base}_${suffix++}`;
  }
  used.add(key);
  return key;
}

export function parseMarkdownTablesToLocalTableDrafts(
  markdown: string,
  options: ParseOptions = {},
): SimLocalTableImportDraft[] {
  const now = options.now ?? Date.now();
  const idFactory = options.idFactory ?? defaultIdFactory;
  const lines = markdown.split(/\r?\n/);
  const drafts: SimLocalTableImportDraft[] = [];
  let lastHeading: string | null = null;
  let tableIndex = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const heading = headingText(lines[i]);
    if (heading) {
      lastHeading = heading;
      continue;
    }

    if (!lines[i].includes('|') || i + 1 >= lines.length || !isMarkdownTableSeparator(lines[i + 1])) {
      continue;
    }

    const labels = splitMarkdownRow(lines[i]);
    const used = new Set<string>();
    const columns: SimLocalColumnDef[] = labels.map((label, index) => ({
      key: makeColumnKey(label, index, used),
      label: label || `Column ${index + 1}`,
      dataType: 'string',
    }));

    const rows: SimTableRow[] = [];
    let rowLine = i + 2;
    while (rowLine < lines.length && lines[rowLine].includes('|')) {
      const cells = splitMarkdownRow(lines[rowLine]);
      if (cells.length > 0) {
        const values: Record<string, unknown> = {};
        columns.forEach((column, index) => {
          values[column.key] = cells[index] ?? '';
        });
        rows.push({ id: idFactory(), values });
      }
      rowLine += 1;
    }

    const id = idFactory();
    tableIndex += 1;
    const name = lastHeading || `Imported table ${tableIndex}`;
    drafts.push({
      meta: {
        id,
        name,
        columnKeys: columns.map((column) => column.key),
        columnLabels: columns.map((column) => column.label),
        columns,
        createdAt: now,
        updatedAt: now,
        dirty: false,
      },
      rows,
    });

    i = rowLine - 1;
  }

  return drafts;
}
