import path from 'node:path';

export function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = 'true';
      continue;
    }

    flags[key] = next;
    i += 1;
  }

  return flags;
}

export function safeResolveDocPath(docsRoot, relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  const absolute = path.resolve(docsRoot, normalized);
  const docsRootWithSep = `${docsRoot}${path.sep}`;

  if (!absolute.startsWith(docsRootWithSep)) {
    throw new Error(`非法 doc_path（越界）: ${relativePath}`);
  }

  return absolute;
}

export function pickSummaryFromMarkdown(markdown) {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  return lines[0] ?? '';
}

export async function ensureKnowledgeNodeColumns(client) {
  await client.query(`
    alter table knowledge_nodes
      add column if not exists doc_markdown text,
      add column if not exists doc_hash text,
      add column if not exists doc_synced_at timestamptz,
      add column if not exists is_trashed boolean not null default false,
      add column if not exists trashed_at timestamptz,
      add column if not exists trashed_parent_id text,
      add column if not exists trash_tx_id text
  `);
}
