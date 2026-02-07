import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ 缺少 DATABASE_URL，无法执行节点 CRUD。');
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../../../');
const docsRoot = path.join(repoRoot, 'docs', 'knowledge');

function parseFlags(args) {
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
  node crud-node.mjs create --id <id> --label <label> [--parent-id <id>] [--summary <text>] [--color <hex>] [--doc-path <path>] [--sort-order <n>] [--skip-doc true]
  node crud-node.mjs update --id <id> [--label <label>] [--summary <text>] [--color <hex>] [--parent-id <id>] [--doc-path <path>] [--sort-order <n>]
  node crud-node.mjs delete --id <id>
  node crud-node.mjs list
`);
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

function templateMarkdown(title, summary) {
  return `# ${title}\n\n## 摘要\n\n${summary || '待补充'}\n\n## 详细内容\n\n- 业务背景：待补充\n- 关键步骤：待补充\n- 风险与边界：待补充\n`;
}

async function ensureColumns(client) {
  await client.query(`
    alter table knowledge_nodes
      add column if not exists doc_markdown text,
      add column if not exists doc_hash text,
      add column if not exists doc_synced_at timestamptz
  `);
}

async function resolveRootId(client, parentId) {
  if (!parentId) return null;

  const result = await client.query(
    `
      with recursive chain as (
        select id, parent_id from knowledge_nodes where id = $1
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

  const skipDoc = toBooleanFlag(flags['skip-doc']);
  let createdDocAbsolutePath = null;
  let createdDocPath = null;

  try {
    await client.query('begin');

    const docPath = await resolveDocPath(client, flags);
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
      const absolutePath = safeResolveDocPath(docPath);
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

    console.log(`✅ 已创建节点: ${flags.id}`);
    if (!skipDoc) {
      console.log(`✅ 已创建文档: ${safeResolveDocPath(createdDocPath).replace(`${repoRoot}/`, '')}`);
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

  const currentResult = await client.query('select id, doc_path from knowledge_nodes where id = $1', [flags.id]);
  const current = currentResult.rows[0];
  if (!current) {
    throw new Error(`节点不存在: ${flags.id}`);
  }

  let movedDoc = null;

  try {
    await client.query('begin');

    if ('doc-path' in flags && current.doc_path && flags['doc-path'] && flags['doc-path'] !== current.doc_path) {
      const oldPath = safeResolveDocPath(current.doc_path);
      const newPath = safeResolveDocPath(flags['doc-path']);

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

async function archiveDocsBeforeDelete(client, rootNodeId) {
  const txId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(16).slice(2, 8)}`;

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
    const source = safeResolveDocPath(row.doc_path);
    try {
      await fs.access(source);
    } catch {
      continue;
    }

    const archiveRelative = path.join('_archive', txId, row.doc_path).replace(/\\/g, '/');
    const archive = safeResolveDocPath(archiveRelative);

    await fs.mkdir(path.dirname(archive), { recursive: true });
    await fs.rename(source, archive);
    movedDocs.push({ source, archive, id: row.id });
  }

  return movedDocs;
}

async function restoreMovedDocs(movedDocs) {
  for (let i = movedDocs.length - 1; i >= 0; i -= 1) {
    const moved = movedDocs[i];
    try {
      await fs.mkdir(path.dirname(moved.source), { recursive: true });
      await fs.rename(moved.archive, moved.source);
    } catch {
      // ignore restore errors
    }
  }
}

async function deleteNode(client, flags) {
  if (!flags.id) {
    throw new Error('delete 需要 --id');
  }

  const currentResult = await client.query('select id from knowledge_nodes where id = $1', [flags.id]);
  if (currentResult.rowCount === 0) {
    throw new Error(`节点不存在: ${flags.id}`);
  }

  const movedDocs = [];

  try {
    await client.query('begin');

    const archived = await archiveDocsBeforeDelete(client, flags.id);
    movedDocs.push(...archived);

    await client.query('delete from knowledge_nodes where id = $1', [flags.id]);
    await client.query('commit');

    console.log(`✅ 已删除节点（含子树）: ${flags.id}`);
    console.log(`✅ 已归档文档: ${movedDocs.length} 个`);
  } catch (error) {
    await client.query('rollback');
    await restoreMovedDocs(movedDocs);
    throw error;
  }
}

async function listNodes(client) {
  const result = await client.query(`
    select id, label, parent_id, doc_path, sort_order
    from knowledge_nodes
    order by coalesce(parent_id, ''), sort_order, id
  `);

  result.rows.forEach((row) => {
    console.log([row.id, row.label, row.parent_id ?? '-', row.doc_path ?? '-', row.sort_order].join('\t'));
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
    await ensureColumns(client);

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

    if (command === 'list') {
      await listNodes(client);
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
