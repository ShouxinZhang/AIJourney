import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { Client } from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../../../');
const readModelPath = path.join(repoRoot, 'web', 'src', 'data', 'read-model.json');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ 缺少 DATABASE_URL，无法导入到 PostgreSQL。');
  process.exit(1);
}

function flattenTree(nodes, parentId = null, rows = []) {
  nodes.forEach((node, index) => {
    const children = Array.isArray(node.children) ? node.children : [];

    rows.push({
      id: node.id,
      label: node.label,
      summary: node.description ?? null,
      color: node.color ?? null,
      parent_id: parentId,
      doc_path: node.docPath ?? null,
      doc_markdown: node.content ?? null,
      doc_hash: node.content ? crypto.createHash('sha256').update(node.content).digest('hex') : null,
      sort_order: index,
      dependencies: Array.isArray(node.dependencies) ? node.dependencies : [],
      children,
    });

    if (children.length > 0) {
      flattenTree(children, node.id, rows);
    }
  });

  return rows;
}

async function main() {
  const raw = await fs.readFile(readModelPath, 'utf8');
  const parsed = JSON.parse(raw);
  const tree = parsed?.tree;

  if (!Array.isArray(tree) || tree.length === 0) {
    throw new Error('read-model.json 缺少有效 tree，无法导入数据库。');
  }

  const rows = flattenTree(tree);

  const dependencyRows = [];
  rows.forEach((row) => {
    row.dependencies.forEach((targetId) => {
      dependencyRows.push({
        source_id: row.id,
        target_id: targetId,
        kind: 'semantic',
      });
    });
  });

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(`
      alter table knowledge_nodes
        add column if not exists doc_markdown text,
        add column if not exists doc_hash text,
        add column if not exists doc_synced_at timestamptz
    `);

    await client.query('begin');

    await client.query('delete from knowledge_dependencies');
    await client.query('delete from knowledge_nodes');

    for (const row of rows) {
      await client.query(
        `insert into knowledge_nodes (
          id, label, summary, color, parent_id, doc_path, doc_markdown, doc_hash, doc_synced_at, sort_order
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, case when $7 is null then null else now() end, $9)`,
        [
          row.id,
          row.label,
          row.summary,
          row.color,
          row.parent_id,
          row.doc_path,
          row.doc_markdown,
          row.doc_hash,
          row.sort_order,
        ],
      );
    }

    for (const dep of dependencyRows) {
      await client.query(
        `insert into knowledge_dependencies (source_id, target_id, kind)
         values ($1, $2, $3)
         on conflict (source_id, target_id, kind) do nothing`,
        [dep.source_id, dep.target_id, dep.kind],
      );
    }

    await client.query('commit');

    console.log(
      `✅ 导入完成: 节点 ${rows.length} 条, 依赖 ${dependencyRows.length} 条 -> PostgreSQL`,
    );
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`❌ 导入失败: ${error.message}`);
  process.exitCode = 1;
});
