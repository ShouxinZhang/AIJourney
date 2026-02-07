import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../../../');
const readModelPath = path.join(repoRoot, 'web', 'src', 'data', 'read-model.json');
const docsRoot = path.join(repoRoot, 'docs', 'knowledge');
const force = process.argv.includes('--force');

function collectLeafNodes(nodes, leaves = []) {
  for (const node of nodes) {
    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length === 0) {
      leaves.push(node);
      continue;
    }
    collectLeafNodes(children, leaves);
  }
  return leaves;
}

function buildMarkdown(node) {
  return `# ${node.label}\n\n## 摘要\n\n${node.description ?? '待补充'}\n\n## 详细内容\n\n- 业务背景：待补充\n- 实施要点：待补充\n- 风险与边界：待补充\n`;
}

async function writeLeafDoc(node) {
  if (!node.docPath) {
    return { skipped: 1, created: 0, updated: 0 };
  }

  const relativePath = node.docPath.replace(/\\/g, '/');
  const targetPath = path.resolve(docsRoot, relativePath);
  const docsRootWithSep = `${docsRoot}${path.sep}`;
  if (!targetPath.startsWith(docsRootWithSep)) {
    throw new Error(`非法 docPath（越界）: ${node.docPath}`);
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  const content = buildMarkdown(node);
  let exists = false;
  try {
    await fs.access(targetPath);
    exists = true;
  } catch {
    exists = false;
  }

  if (exists && !force) {
    return { skipped: 1, created: 0, updated: 0 };
  }

  await fs.writeFile(targetPath, content, 'utf8');
  return exists ? { skipped: 0, created: 0, updated: 1 } : { skipped: 0, created: 1, updated: 0 };
}

async function main() {
  const raw = await fs.readFile(readModelPath, 'utf8');
  const parsed = JSON.parse(raw);
  const tree = parsed?.tree;

  if (!Array.isArray(tree)) {
    throw new Error('read-model.json 缺少 tree 数组，无法导出叶子 Markdown。');
  }

  const leaves = collectLeafNodes(tree);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const leaf of leaves) {
    const result = await writeLeafDoc(leaf);
    created += result.created;
    updated += result.updated;
    skipped += result.skipped;
  }

  console.log(
    `✅ Markdown 导出完成: 叶子 ${leaves.length} 个, 新增 ${created}, 更新 ${updated}, 跳过 ${skipped}`,
  );
}

main().catch((error) => {
  console.error(`❌ Markdown 导出失败: ${error.message}`);
  process.exitCode = 1;
});
