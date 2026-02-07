import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../../../');
const docsRoot = path.join(repoRoot, 'docs', 'knowledge');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ 缺少 DATABASE_URL，无法同步 Markdown 到 PostgreSQL。');
  process.exit(1);
}

function safeResolveDocPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  const absolute = path.resolve(docsRoot, normalized);
  const docsRootWithSep = `${docsRoot}${path.sep}`;

  if (!absolute.startsWith(docsRootWithSep)) {
    throw new Error(`非法 doc_path（越界）: ${relativePath}`);
  }
  return absolute;
}

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function pickSummaryFromMarkdown(markdown) {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  return lines[0] ?? '';
}

async function ensureColumns(client) {
  await client.query(`
    alter table knowledge_nodes
      add column if not exists doc_markdown text,
      add column if not exists doc_hash text,
      add column if not exists doc_synced_at timestamptz
  `);
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  let updated = 0;
  let skipped = 0;
  let missing = 0;

  try {
    await ensureColumns(client);

    const result = await client.query(`
      select id, doc_path, doc_hash
      from knowledge_nodes
      where doc_path is not null
      order by id
    `);

    if (result.rows.length === 0) {
      console.log('ℹ 未找到可同步的文档节点（doc_path 为空）。');
      return;
    }

    await client.query('begin');

    for (const row of result.rows) {
      const absolutePath = safeResolveDocPath(row.doc_path);

      let markdown;
      try {
        markdown = await fs.readFile(absolutePath, 'utf8');
      } catch {
        missing += 1;
        console.warn(`⚠️ 跳过: 文档不存在 ${row.doc_path}`);
        continue;
      }

      const nextHash = hashContent(markdown);
      if (row.doc_hash === nextHash) {
        skipped += 1;
        continue;
      }

      const summary = pickSummaryFromMarkdown(markdown);

      await client.query(
        `
          update knowledge_nodes
          set
            summary = $1,
            doc_markdown = $2,
            doc_hash = $3,
            doc_synced_at = now()
          where id = $4
        `,
        [summary || null, markdown, nextHash, row.id],
      );

      updated += 1;
    }

    await client.query('commit');

    console.log(
      `✅ Markdown -> DB 同步完成: 总计 ${result.rows.length}, 更新 ${updated}, 跳过 ${skipped}, 缺失 ${missing}`,
    );
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`❌ 同步失败: ${error.message}`);
  process.exitCode = 1;
});
