#!/usr/bin/env node
/**
 * generate-structure-md.mjs — 从 repo-metadata.json 生成 repository-structure.md 的目录树部分
 *
 * 用法:
 *   node generate-structure-md.mjs [--depth N]
 *
 * 行为:
 *   1. 读取 repo-metadata.json
 *   2. 生成 ASCII 目录树（默认展开到第 2 层）
 *   3. 替换 repository-structure.md 中 <!-- REPO-TREE-START --> 到 <!-- REPO-TREE-END --> 之间的内容
 *   4. 如果文件中没有标记，则在第一个 ``` 代码块位置插入
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../../');
const metadataPath = path.join(repoRoot, 'docs', 'architecture', 'repo-metadata.json');
const structureMdPath = path.join(repoRoot, 'docs', 'architecture', 'repository-structure.md');

const MARKER_START = '<!-- REPO-TREE-START -->';
const MARKER_END = '<!-- REPO-TREE-END -->';

/* ------------------------------------------------------------------ */
/*  工具函数                                                           */
/* ------------------------------------------------------------------ */

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = 'true';
    } else {
      flags[key] = next;
      i++;
    }
  }
  return flags;
}

/* ------------------------------------------------------------------ */
/*  树构建                                                             */
/* ------------------------------------------------------------------ */

/**
 * 从扁平路径集合构建嵌套树结构
 */
function buildTree(nodes) {
  const root = { name: 'AIJourney', children: new Map(), meta: null };

  for (const [nodePath, meta] of Object.entries(nodes)) {
    const parts = nodePath.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.children.has(part)) {
        current.children.set(part, { name: part, children: new Map(), meta: null });
      }
      current = current.children.get(part);
    }

    current.meta = meta;
  }

  return root;
}

/**
 * 渲染 ASCII 树
 */
function renderTree(root, maxDepth) {
  const lines = [`${root.name}/`];

  function renderChildren(node, prefix, currentDepth) {
    if (currentDepth >= maxDepth) return;

    // 排序: 目录优先，再按名称字母序
    const entries = [...node.children.entries()].sort(([aName, aNode], [bName, bNode]) => {
      const aIsDir = aNode.meta?.type === 'directory' || aNode.children.size > 0;
      const bIsDir = bNode.meta?.type === 'directory' || bNode.children.size > 0;
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
      return aName.localeCompare(bName);
    });

    entries.forEach(([name, child], index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const isDir = child.meta?.type === 'directory' || child.children.size > 0;
      const displayName = isDir ? `${name}/` : name;

      // 描述对齐
      const desc = child.meta?.description || '';
      const nameWidth = prefix.length + connector.length + displayName.length;
      const PAD_TO = 45;
      const padding = desc ? ' '.repeat(Math.max(1, PAD_TO - nameWidth)) : '';
      const comment = desc ? `${padding}# ${desc}` : '';

      lines.push(`${prefix}${connector}${displayName}${comment}`);

      // 递归子节点
      if (isDir && currentDepth + 1 < maxDepth) {
        const childPrefix = prefix + (isLast ? '    ' : '│   ');
        renderChildren(child, childPrefix, currentDepth + 1);
      }
    });
  }

  renderChildren(root, '', 0);
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/*  Markdown 更新                                                      */
/* ------------------------------------------------------------------ */

async function updateStructureMd(treeContent) {
  let md;
  try {
    md = await fs.readFile(structureMdPath, 'utf8');
  } catch {
    // 文件不存在，创建新文件
    md = `# AI Journey - 仓库架构文档\n\n## 目录结构\n\n${MARKER_START}\n\`\`\`\n\`\`\`\n${MARKER_END}\n`;
  }

  const startIdx = md.indexOf(MARKER_START);
  const endIdx = md.indexOf(MARKER_END);

  const treeBlock = `${MARKER_START}\n\`\`\`\n${treeContent}\n\`\`\`\n${MARKER_END}`;

  if (startIdx !== -1 && endIdx !== -1) {
    // 替换标记之间的内容
    md = md.slice(0, startIdx) + treeBlock + md.slice(endIdx + MARKER_END.length);
  } else {
    // 没有标记，尝试找到 ## 目录结构 后的第一个代码块并替换
    const sectionMatch = md.match(/## 目录结构\s*\n/);
    if (sectionMatch) {
      const sectionStart = sectionMatch.index + sectionMatch[0].length;
      // 查找紧随其后的代码块
      const codeBlockMatch = md.slice(sectionStart).match(/```[\s\S]*?```/);
      if (codeBlockMatch) {
        const blockStart = sectionStart + codeBlockMatch.index;
        const blockEnd = blockStart + codeBlockMatch[0].length;
        md = md.slice(0, blockStart) + treeBlock + md.slice(blockEnd);
      } else {
        // 在章节标题后直接插入
        md = md.slice(0, sectionStart) + '\n' + treeBlock + '\n' + md.slice(sectionStart);
      }
    } else {
      // 最后手段: 追加到文件末尾
      md += `\n## 目录结构\n\n${treeBlock}\n`;
    }
  }

  await fs.writeFile(structureMdPath, md, 'utf8');
}

/* ------------------------------------------------------------------ */
/*  主入口                                                             */
/* ------------------------------------------------------------------ */

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  // 读取 JSON
  let metadata;
  try {
    const content = await fs.readFile(metadataPath, 'utf8');
    metadata = JSON.parse(content);
  } catch (err) {
    console.error(`❌ 无法读取 repo-metadata.json: ${err.message}`);
    console.error('请先运行 scan.mjs --update 生成元数据。');
    process.exit(1);
  }

  const depth = flags.depth
    ? parseInt(flags.depth, 10)
    : (metadata.config?.generateMdDepth ?? 2);

  if (Object.keys(metadata.nodes).length === 0) {
    console.error('❌ repo-metadata.json 中没有节点数据。');
    process.exit(1);
  }

  // 构建树并渲染
  const tree = buildTree(metadata.nodes);
  const treeContent = renderTree(tree, depth);

  // 更新 Markdown
  await updateStructureMd(treeContent);

  const nodeCount = Object.keys(metadata.nodes).length;
  console.log(`✅ 已更新 repository-structure.md（${nodeCount} 个节点，展开 ${depth} 层）`);
}

main().catch((err) => {
  console.error(`❌ 生成失败: ${err.message}`);
  process.exitCode = 1;
});
