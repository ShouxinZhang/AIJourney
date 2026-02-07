import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import {
  ensureKnowledgeNodeColumns,
  pickSummaryFromMarkdown,
  safeResolveDocPath,
} from './_shared.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../../../');
const docsRoot = path.join(repoRoot, 'docs', 'knowledge');
const outputPath = path.join(repoRoot, 'web', 'src', 'data', 'read-model.json');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ 缺少 DATABASE_URL，无法从 PostgreSQL 同步 read-model。');
  process.exit(1);
}

function ensureTreeValidity(records) {
  const byId = new Map(records.map((item) => [item.id, item]));

  for (const node of records) {
    if (node.parent_id && !byId.has(node.parent_id)) {
      throw new Error(`节点 ${node.id} 的 parent_id=${node.parent_id} 不存在`);
    }
  }

  const childrenById = new Map();
  for (const node of records) {
    const parentId = node.parent_id;
    if (!parentId) continue;

    if (!childrenById.has(parentId)) {
      childrenById.set(parentId, []);
    }
    childrenById.get(parentId).push(node.id);
  }

  const visiting = new Set();
  const visited = new Set();

  const dfs = (id) => {
    if (visiting.has(id)) {
      throw new Error(`检测到循环依赖（父子关系）: ${id}`);
    }
    if (visited.has(id)) {
      return;
    }

    visiting.add(id);
    for (const childId of childrenById.get(id) ?? []) {
      dfs(childId);
    }
    visiting.delete(id);
    visited.add(id);
  };

  for (const node of records) {
    dfs(node.id);
  }
}

async function loadNodeRows(client) {
  const result = await client.query(`
    select
      id,
      label,
      summary,
      color,
      parent_id,
      doc_path,
      doc_markdown,
      sort_order
    from knowledge_nodes
    where coalesce(is_trashed, false) = false
    order by
      case when parent_id is null then 0 else 1 end,
      parent_id,
      sort_order,
      id
  `);
  return result.rows;
}

async function loadDependencyRows(client) {
  const result = await client.query(`
    select source_id, target_id
    from knowledge_dependencies
    order by source_id, target_id
  `);
  return result.rows;
}

async function loadDocFallbackByNodeId(records, childrenById) {
  const fallbackById = new Map();

  for (const node of records) {
    const isLeaf = (childrenById.get(node.id) ?? []).length === 0;
    if (!isLeaf || !node.doc_path) {
      continue;
    }

    try {
      const absolutePath = safeResolveDocPath(docsRoot, node.doc_path);
      const markdown = await fs.readFile(absolutePath, 'utf8');
      const summary = pickSummaryFromMarkdown(markdown);
      fallbackById.set(node.id, { markdown, summary: summary || undefined });
    } catch (error) {
      console.warn(`⚠️ 读取文档失败（${node.id} -> ${node.doc_path}）: ${error.message}`);
    }
  }

  return fallbackById;
}

async function buildTree(records, dependencies) {
  ensureTreeValidity(records);

  const byId = new Map(records.map((item) => [item.id, item]));
  const childrenById = new Map();

  for (const node of records) {
    if (!childrenById.has(node.id)) {
      childrenById.set(node.id, []);
    }
  }

  for (const node of records) {
    if (!node.parent_id) continue;
    childrenById.get(node.parent_id).push(node.id);
  }

  const depsBySource = new Map();
  for (const dep of dependencies) {
    if (!depsBySource.has(dep.source_id)) {
      depsBySource.set(dep.source_id, []);
    }
    depsBySource.get(dep.source_id).push(dep.target_id);
  }

  const docFallbackById = await loadDocFallbackByNodeId(records, childrenById);

  const buildNode = (nodeId, inheritedColor = null) => {
    const row = byId.get(nodeId);
    const childrenIds = childrenById.get(nodeId) ?? [];
    const currentColor = row.color ?? inheritedColor;
    const kind = childrenIds.length > 0 || !row.doc_path ? 'folder' : 'node';

    const fallback = docFallbackById.get(nodeId);
    const markdown = row.doc_markdown ?? fallback?.markdown;
    const description = row.summary ?? fallback?.summary ?? undefined;

    const next = {
      id: row.id,
      label: row.label,
      kind,
      ...(description ? { description } : {}),
      ...(currentColor ? { color: currentColor } : {}),
      ...(row.doc_path ? { docPath: row.doc_path } : {}),
      ...(markdown ? { content: markdown } : {}),
      ...(depsBySource.has(row.id) ? { dependencies: depsBySource.get(row.id) } : {}),
      ...(childrenIds.length
        ? {
            children: childrenIds.map((childId) => buildNode(childId, currentColor)),
          }
        : {}),
    };

    return next;
  };

  const rootIds = records.filter((item) => item.parent_id === null).map((item) => item.id);
  return rootIds.map((rootId) => buildNode(rootId, null));
}

async function main() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();

  try {
    await ensureKnowledgeNodeColumns(client);

    const [nodes, dependencies] = await Promise.all([
      loadNodeRows(client),
      loadDependencyRows(client),
    ]);

    if (nodes.length === 0) {
      throw new Error('knowledge_nodes 为空，无法生成 read-model。');
    }

    const tree = await buildTree(nodes, dependencies);
    const payload = {
      meta: {
        generatedAt: new Date().toISOString(),
        source: 'postgres-markdown-sync',
      },
      tree,
    };

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    console.log(
      `✅ 同步完成: ${path.relative(repoRoot, outputPath)}（节点 ${nodes.length}，关系 ${dependencies.length}）`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`❌ 同步失败: ${error.message}`);
  process.exitCode = 1;
});
