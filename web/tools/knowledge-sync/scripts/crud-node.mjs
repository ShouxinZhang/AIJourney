import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import {
  ensureKnowledgeNodeColumns,
  parseFlags,
  safeResolveDocPath,
} from './_shared.mjs';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ 缺少 DATABASE_URL，无法执行节点 CRUD。');
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../../../');
const docsRoot = path.join(repoRoot, 'docs', 'knowledge');

function parseIntOrDefault(value, defaultValue = 0) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function toBooleanFlag(value) {
  if (value === undefined) return false;
  return value === 'true' || value === '1' || value === 'yes';
}

function printUsage() {
  console.log(`
用法:
  node crud-node.mjs create --id <id> --label <label> [--kind <folder|node>] [--parent-id <id>] [--summary <text>] [--color <hex>] [--doc-path <path>] [--sort-order <n>] [--skip-doc true]
  node crud-node.mjs update --id <id> [--label <label>] [--summary <text>] [--color <hex>] [--parent-id <id>] [--doc-path <path>] [--sort-order <n>]
  node crud-node.mjs delete --id <id>           # 删除到垃圾桶（软删除）
  node crud-node.mjs restore --id <id>          # 从垃圾桶恢复子树
  node crud-node.mjs list [--include-trashed true]
`);
}

function templateMarkdown(title, summary) {
  return `# ${title}\n\n## 摘要\n\n${summary || '待补充'}\n\n## 详细内容\n\n- 业务背景：待补充\n- 关键步骤：待补充\n- 风险与边界：待补充\n`;
}

async function resolveRootId(client, parentId) {
  if (!parentId) return null;

  const result = await client.query(
    `
      with recursive chain as (
        select id, parent_id from knowledge_nodes where id = $1 and coalesce(is_trashed, false) = false
        union all
        select n.id, n.parent_id
        from knowledge_nodes n
        join chain c on n.id = c.parent_id
      )
      select id
      from chain
      where parent_id is null
      limit 1
    `,
    [parentId],
  );

  return result.rows[0]?.id ?? null;
}

async function resolveDocPath(client, flags) {
  if (flags['doc-path']) {
    return flags['doc-path'];
  }

  const parentId = flags['parent-id'] ?? null;
  const rootId = (await resolveRootId(client, parentId)) ?? flags.id;
  return `${rootId}/${flags.id}.md`;
}

async function createNode(client, flags) {
  if (!flags.id || !flags.label) {
    throw new Error('create 需要 --id 与 --label');
  }

  const rawKind = String(flags.kind ?? 'node').trim().toLowerCase();
  const kind = rawKind === 'folder' ? 'folder' : rawKind === 'node' ? 'node' : null;
  if (!kind) {
    throw new Error('create 的 --kind 仅支持 folder 或 node');
  }

  if (kind === 'folder' && flags['doc-path']) {
    throw new Error('folder 类型不支持 --doc-path，请移除该参数');
  }

  const skipDoc = kind === 'folder' || toBooleanFlag(flags['skip-doc']);
  let createdDocAbsolutePath = null;
  let createdDocPath = null;

  try {
    await client.query('begin');
    if (flags['parent-id']) {
      const parent = await client.query(
        'select id from knowledge_nodes where id = $1 and coalesce(is_trashed, false) = false',
        [flags['parent-id']],
      );
      if (parent.rowCount === 0) {
        throw new Error(`父节点不存在或已在垃圾桶中: ${flags['parent-id']}`);
      }
    }

    const docPath = kind === 'folder' ? null : await resolveDocPath(client, flags);
    createdDocPath = docPath;

    await client.query(
      `
        insert into knowledge_nodes (id, label, summary, color, parent_id, doc_path, sort_order)
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        flags.id,
        flags.label,
        flags.summary ?? null,
        flags.color ?? null,
        flags['parent-id'] ?? null,
        docPath,
        parseIntOrDefault(flags['sort-order'], 0),
      ],
    );

    if (!skipDoc) {
      if (!docPath) {
        throw new Error('node 类型缺少 doc_path，无法创建文档');
      }
      const absolutePath = safeResolveDocPath(docsRoot, docPath);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });

      try {
        await fs.access(absolutePath);
        throw new Error(`文档已存在: ${docPath}`);
      } catch (error) {
        if (error?.code !== 'ENOENT') {
          throw error;
        }
      }

      await fs.writeFile(absolutePath, templateMarkdown(flags.label, flags.summary), 'utf8');
      createdDocAbsolutePath = absolutePath;
    }

    await client.query('commit');

    console.log(`✅ 已创建${kind === 'folder' ? '文件夹' : '节点'}: ${flags.id}`);
    if (!skipDoc) {
      console.log(`✅ 已创建文档: ${safeResolveDocPath(docsRoot, createdDocPath).replace(`${repoRoot}/`, '')}`);
    }
  } catch (error) {
    await client.query('rollback');

    if (createdDocAbsolutePath) {
      try {
        await fs.unlink(createdDocAbsolutePath);
      } catch {
        // ignore cleanup errors
      }
    }

    throw error;
  }
}

async function updateNode(client, flags) {
  if (!flags.id) {
    throw new Error('update 需要 --id');
  }

  const currentResult = await client.query(
    'select id, doc_path from knowledge_nodes where id = $1 and coalesce(is_trashed, false) = false',
    [flags.id],
  );
  const current = currentResult.rows[0];
  if (!current) {
    throw new Error(`节点不存在或已在垃圾桶中: ${flags.id}`);
  }

  let movedDoc = null;

  try {
    await client.query('begin');

    if ('doc-path' in flags && current.doc_path && flags['doc-path'] && flags['doc-path'] !== current.doc_path) {
      const oldPath = safeResolveDocPath(docsRoot, current.doc_path);
      const newPath = safeResolveDocPath(docsRoot, flags['doc-path']);

      try {
        await fs.access(oldPath);
        await fs.mkdir(path.dirname(newPath), { recursive: true });
        await fs.rename(oldPath, newPath);
        movedDoc = { oldPath, newPath };
      } catch (error) {
        if (error?.code !== 'ENOENT') {
          throw error;
        }
      }
    }

    const fields = [];
    const values = [];

    const pushField = (column, value) => {
      fields.push(`${column} = $${values.length + 1}`);
      values.push(value);
    };

    if ('label' in flags) pushField('label', flags.label);
    if ('summary' in flags) pushField('summary', flags.summary);
    if ('color' in flags) pushField('color', flags.color);
    if ('parent-id' in flags) pushField('parent_id', flags['parent-id'] || null);
    if ('doc-path' in flags) pushField('doc_path', flags['doc-path'] || null);
    if ('sort-order' in flags) pushField('sort_order', parseIntOrDefault(flags['sort-order'], 0));

    if (fields.length === 0) {
      throw new Error('update 至少需要一个可更新字段');
    }

    values.push(flags.id);
    await client.query(
      `
        update knowledge_nodes
        set ${fields.join(', ')}
        where id = $${values.length}
      `,
      values,
    );

    await client.query('commit');
    console.log(`✅ 已更新节点: ${flags.id}`);
  } catch (error) {
    await client.query('rollback');

    if (movedDoc) {
      try {
        await fs.mkdir(path.dirname(movedDoc.oldPath), { recursive: true });
        await fs.rename(movedDoc.newPath, movedDoc.oldPath);
      } catch {
        // ignore rollback doc restore errors
      }
    }

    throw error;
  }
}

async function moveDocsToTrash(client, rootNodeId, txId) {
  const result = await client.query(
    `
      with recursive subtree as (
        select id, parent_id, doc_path
        from knowledge_nodes
        where id = $1
        union all
        select n.id, n.parent_id, n.doc_path
        from knowledge_nodes n
        join subtree s on n.parent_id = s.id
      )
      select id, doc_path from subtree where doc_path is not null
    `,
    [rootNodeId],
  );

  const movedDocs = [];

  for (const row of result.rows) {
    const source = safeResolveDocPath(docsRoot, row.doc_path);
    try {
      await fs.access(source);
    } catch {
      continue;
    }

    const trashRelative = path.join('_trash', txId, row.doc_path).replace(/\\/g, '/');
    const trash = safeResolveDocPath(docsRoot, trashRelative);

    await fs.mkdir(path.dirname(trash), { recursive: true });
    await fs.rename(source, trash);
    movedDocs.push({ source, trash, id: row.id });
  }

  return movedDocs;
}

async function restoreMovedDocs(movedDocs) {
  for (let i = movedDocs.length - 1; i >= 0; i -= 1) {
    const moved = movedDocs[i];
    try {
      await fs.mkdir(path.dirname(moved.source), { recursive: true });
      await fs.rename(moved.trash, moved.source);
    } catch {
      // ignore restore errors
    }
  }
}

async function deleteNode(client, flags) {
  if (!flags.id) {
    throw new Error('delete 需要 --id');
  }

  const currentResult = await client.query(
    'select id from knowledge_nodes where id = $1 and coalesce(is_trashed, false) = false',
    [flags.id],
  );
  if (currentResult.rowCount === 0) {
    throw new Error(`节点不存在或已在垃圾桶中: ${flags.id}`);
  }

  const movedDocs = [];
  const txId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(16).slice(2, 8)}`;

  try {
    await client.query('begin');

    const moved = await moveDocsToTrash(client, flags.id, txId);
    movedDocs.push(...moved);

    await client.query(
      `
        with recursive subtree as (
          select id, parent_id
          from knowledge_nodes
          where id = $1
          union all
          select n.id, n.parent_id
          from knowledge_nodes n
          join subtree s on n.parent_id = s.id
        )
        update knowledge_nodes n
        set
          is_trashed = true,
          trashed_at = now(),
          trashed_parent_id = n.parent_id,
          trash_tx_id = $2
        where n.id in (select id from subtree)
      `,
      [flags.id, txId],
    );
    await client.query('commit');

    console.log(`✅ 已删除到垃圾桶（含子树）: ${flags.id}`);
    console.log(`✅ 垃圾桶批次: ${txId}`);
    console.log(`✅ 已移动文档到 _trash: ${movedDocs.length} 个`);
  } catch (error) {
    await client.query('rollback');
    await restoreMovedDocs(movedDocs);
    throw error;
  }
}

async function restoreNode(client, flags) {
  if (!flags.id) {
    throw new Error('restore 需要 --id');
  }

  const rootResult = await client.query(
    'select id, parent_id, trash_tx_id from knowledge_nodes where id = $1 and coalesce(is_trashed, false) = true',
    [flags.id],
  );
  const root = rootResult.rows[0];
  if (!root) {
    throw new Error(`节点不在垃圾桶中: ${flags.id}`);
  }

  if (root.parent_id) {
    const parent = await client.query(
      'select id from knowledge_nodes where id = $1 and coalesce(is_trashed, false) = true',
      [root.parent_id],
    );
    if (parent.rowCount > 0) {
      throw new Error(`父节点仍在垃圾桶中，请先恢复父节点: ${root.parent_id}`);
    }
  }

  const movedDocs = [];

  try {
    await client.query('begin');

    const subtree = await client.query(
      `
        with recursive subtree as (
          select id, parent_id, doc_path, trash_tx_id
          from knowledge_nodes
          where id = $1
          union all
          select n.id, n.parent_id, n.doc_path, n.trash_tx_id
          from knowledge_nodes n
          join subtree s on n.parent_id = s.id
        )
        select id, doc_path, trash_tx_id
        from subtree
        where doc_path is not null and coalesce(trash_tx_id, '') <> ''
      `,
      [flags.id],
    );

    for (const row of subtree.rows) {
      const source = safeResolveDocPath(docsRoot, path.join('_trash', row.trash_tx_id, row.doc_path).replace(/\\/g, '/'));
      const target = safeResolveDocPath(docsRoot, row.doc_path);
      try {
        await fs.access(source);
      } catch {
        continue;
      }
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.rename(source, target);
      movedDocs.push({ source, target });
    }

    await client.query(
      `
        with recursive subtree as (
          select id
          from knowledge_nodes
          where id = $1
          union all
          select n.id
          from knowledge_nodes n
          join subtree s on n.parent_id = s.id
        )
        update knowledge_nodes n
        set
          is_trashed = false,
          trashed_at = null,
          trashed_parent_id = null,
          trash_tx_id = null
        where n.id in (select id from subtree)
      `,
      [flags.id],
    );

    await client.query('commit');
    console.log(`✅ 已从垃圾桶恢复节点（含子树）: ${flags.id}`);
    console.log(`✅ 已恢复文档: ${movedDocs.length} 个`);
  } catch (error) {
    await client.query('rollback');
    for (let i = movedDocs.length - 1; i >= 0; i -= 1) {
      const moved = movedDocs[i];
      try {
        await fs.mkdir(path.dirname(moved.source), { recursive: true });
        await fs.rename(moved.target, moved.source);
      } catch {
        // ignore restore rollback errors
      }
    }
    throw error;
  }
}

async function listNodes(client, flags) {
  const includeTrashed = toBooleanFlag(flags['include-trashed']);
  const query = includeTrashed
    ? `
      select id, label, parent_id, doc_path, sort_order, is_trashed
      from knowledge_nodes
      order by is_trashed, coalesce(parent_id, ''), sort_order, id
    `
    : `
      select id, label, parent_id, doc_path, sort_order, is_trashed
      from knowledge_nodes
      where coalesce(is_trashed, false) = false
      order by coalesce(parent_id, ''), sort_order, id
    `;
  const result = await client.query(query);

  result.rows.forEach((row) => {
    console.log([row.id, row.label, row.parent_id ?? '-', row.doc_path ?? '-', row.sort_order, row.is_trashed].join('\t'));
  });
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (!command) {
    printUsage();
    process.exit(1);
  }

  const flags = parseFlags(rest);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await ensureKnowledgeNodeColumns(client);

    if (command === 'create') {
      await createNode(client, flags);
      return;
    }

    if (command === 'update') {
      await updateNode(client, flags);
      return;
    }

    if (command === 'delete') {
      await deleteNode(client, flags);
      return;
    }

    if (command === 'restore') {
      await restoreNode(client, flags);
      return;
    }

    if (command === 'list') {
      await listNodes(client, flags);
      return;
    }

    printUsage();
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`❌ 执行失败: ${error.message}`);
  process.exitCode = 1;
});
