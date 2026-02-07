import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../../../');
const legacyTreePath = path.join(repoRoot, 'web', 'src', 'data', 'knowledge-tree.ts');
const outputPath = path.join(repoRoot, 'web', 'src', 'data', 'read-model.json');
const existingReadModelPath = path.join(repoRoot, 'web', 'src', 'data', 'read-model.json');

function parseLegacyTree(sourceCode) {
  const match = sourceCode.match(/export const knowledgeTree(?:\s*:\s*KnowledgeNode\[\])?\s*=\s*([\s\S]*);\s*$/);
  if (!match?.[1]) {
    throw new Error('未找到 knowledgeTree 导出，无法进行 bootstrap。');
  }

  const treeExpression = match[1].trim();
  if (!treeExpression.startsWith('[')) {
    throw new Error('knowledgeTree 已切换为 read-model 读取模式，无法从源码字面量解析。');
  }
  const tree = Function(`"use strict"; return (${treeExpression});`)();
  if (!Array.isArray(tree)) {
    throw new Error('knowledgeTree 不是数组，无法进行 bootstrap。');
  }
  return tree;
}

async function loadSeedTree() {
  try {
    const raw = await fs.readFile(existingReadModelPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.tree) && parsed.tree.length > 0) {
      return parsed.tree;
    }
  } catch {
    // ignore and fallback to legacy tree parsing
  }

  const sourceCode = await fs.readFile(legacyTreePath, 'utf8');
  return parseLegacyTree(sourceCode);
}

function withDocPath(nodes, rootId = null) {
  return nodes.map((node) => {
    const currentRootId = rootId ?? node.id;
    const children = Array.isArray(node.children) ? withDocPath(node.children, currentRootId) : [];
    const isLeaf = children.length === 0;

    return {
      ...node,
      ...(isLeaf ? { docPath: `${currentRootId}/${node.id}.md` } : {}),
      ...(children.length ? { children } : {}),
    };
  });
}

function buildReadModel(tree) {
  return {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'legacy-tree-bootstrap',
    },
    tree: withDocPath(tree),
  };
}

async function main() {
  const tree = await loadSeedTree();
  const model = buildReadModel(tree);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(model, null, 2)}\n`, 'utf8');

  const leafCount = countLeaves(model.tree);
  console.log(`✅ bootstrap 完成: ${path.relative(repoRoot, outputPath)} (叶子节点 ${leafCount} 个)`);
}

function countLeaves(nodes) {
  let total = 0;
  for (const node of nodes) {
    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length === 0) {
      total += 1;
      continue;
    }
    total += countLeaves(children);
  }
  return total;
}

main().catch((error) => {
  console.error(`❌ bootstrap 失败: ${error.message}`);
  process.exitCode = 1;
});
