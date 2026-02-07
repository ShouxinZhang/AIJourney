import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../../../');
const docsRoot = path.join(repoRoot, 'docs', 'knowledge');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ 缺少 DATABASE_URL，无法执行文档 CRUD。');
  process.exit(1);
}

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

function safeResolveDocPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  const absolute = path.resolve(docsRoot, normalized);
  const docsRootWithSep = `${docsRoot}${path.sep}`;

  if (!absolute.startsWith(docsRootWithSep)) {
    throw new Error(`非法 doc_path（越界）: ${relativePath}`);
  }
  return absolute;
}

function templateMarkdown(title) {
  return `# ${title}\n\n## 摘要\n\n待补充\n\n## 详细内容\n\n- 业务背景：待补充\n- 关键步骤：待补充\n- 风险与边界：待补充\n`;
}

function printUsage() {
  console.log(`
用法:
  node crud-doc.mjs create --node-id <id> [--title <title>] [--force]
  node crud-doc.mjs delete --node-id <id>
  node crud-doc.mjs path --node-id <id>
`);
}

async function getNode(client, nodeId) {
  const result = await client.query(
    'select id, label, doc_path from knowledge_nodes where id = $1',
    [nodeId],
  );

  const node = result.rows[0];
  if (!node) {
    throw new Error(`节点不存在: ${nodeId}`);
  }
  if (!node.doc_path) {
    throw new Error(`节点 ${nodeId} 未配置 doc_path`);
  }

  return node;
}

async function createDoc(client, flags) {
  const nodeId = flags['node-id'];
  if (!nodeId) {
    throw new Error('create 需要 --node-id');
  }

  const node = await getNode(client, nodeId);
  const absolutePath = safeResolveDocPath(node.doc_path);

  let exists = false;
  try {
    await fs.access(absolutePath);
    exists = true;
  } catch {
    exists = false;
  }

  if (exists && flags.force !== 'true') {
    throw new Error(`文档已存在: ${node.doc_path}（如需覆盖请加 --force）`);
  }

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, templateMarkdown(flags.title ?? node.label), 'utf8');

  console.log(`✅ 文档已创建: ${node.doc_path}`);
}

async function deleteDoc(client, flags) {
  const nodeId = flags['node-id'];
  if (!nodeId) {
    throw new Error('delete 需要 --node-id');
  }

  const node = await getNode(client, nodeId);
  const absolutePath = safeResolveDocPath(node.doc_path);

  try {
    await fs.access(absolutePath);
  } catch {
    throw new Error(`文档不存在: ${node.doc_path}`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${absolutePath}.bak-${timestamp}`;

  await fs.copyFile(absolutePath, backupPath);
  await fs.unlink(absolutePath);

  console.log(`✅ 文档已删除: ${node.doc_path}`);
  console.log(`📦 备份文件: ${path.relative(repoRoot, backupPath)}`);
}

async function printDocPath(client, flags) {
  const nodeId = flags['node-id'];
  if (!nodeId) {
    throw new Error('path 需要 --node-id');
  }

  const node = await getNode(client, nodeId);
  console.log(`docs/knowledge/${node.doc_path}`);
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
    if (command === 'create') {
      await createDoc(client, flags);
      return;
    }

    if (command === 'delete') {
      await deleteDoc(client, flags);
      return;
    }

    if (command === 'path') {
      await printDocPath(client, flags);
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
