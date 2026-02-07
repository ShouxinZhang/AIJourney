#!/usr/bin/env node
/**
 * repo-metadata MCP Server
 *
 * 提供仓库元数据 CRUD、扫描、生成架构文档、PG 同步等 MCP Tools，
 * 供 LLM 直接调用，无需拼终端命令。
 *
 * 传输方式: stdio（VS Code Copilot 标准集成）
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/*  路径常量                                                           */
/* ------------------------------------------------------------------ */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../');
const metadataPath = path.join(repoRoot, 'docs', 'architecture', 'repo-metadata.json');
const structureMdPath = path.join(repoRoot, 'docs', 'architecture', 'repository-structure.md');

const MARKER_START = '<!-- REPO-TREE-START -->';
const MARKER_END = '<!-- REPO-TREE-END -->';

/* ------------------------------------------------------------------ */
/*  元数据 JSON 读写                                                    */
/* ------------------------------------------------------------------ */

async function loadMetadata() {
  try {
    const content = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return {
      version: 1,
      config: {
        scanIgnore: ['docs/dev_logs/**', 'docs/knowledge/_archive/**'],
        generateMdDepth: 2,
      },
      updatedAt: new Date().toISOString(),
      nodes: {},
    };
  }
}

async function saveMetadata(metadata) {
  metadata.updatedAt = new Date().toISOString();
  const sorted = Object.keys(metadata.nodes).sort();
  const orderedNodes = {};
  for (const key of sorted) {
    orderedNodes[key] = metadata.nodes[key];
  }
  metadata.nodes = orderedNodes;
  await fs.mkdir(path.dirname(metadataPath), { recursive: true });
  await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
}

/* ------------------------------------------------------------------ */
/*  Scan 核心逻辑                                                      */
/* ------------------------------------------------------------------ */

function globToRegex(pattern) {
  const re = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
  return new RegExp(`^${re}$`);
}

function getTrackedPaths() {
  const output = execSync('git ls-files', { cwd: repoRoot, encoding: 'utf8' });
  const files = output.trim().split('\n').filter(Boolean);
  const fileSet = new Set(files);
  const dirSet = new Set();
  for (const file of files) {
    let dir = path.dirname(file);
    while (dir !== '.') {
      if (dirSet.has(dir)) break;
      dirSet.add(dir);
      dir = path.dirname(dir);
    }
  }
  return { fileSet, dirSet };
}

function shouldIgnore(p, matchers) {
  return matchers.some((re) => re.test(p));
}

function depthOf(p) {
  return p.split('/').length;
}

/* ------------------------------------------------------------------ */
/*  Tree / MD 生成逻辑                                                  */
/* ------------------------------------------------------------------ */

function buildTree(nodes) {
  const root = { name: 'AIJourney', children: new Map(), meta: null };
  for (const [nodePath, meta] of Object.entries(nodes)) {
    const parts = nodePath.split('/');
    let current = root;
    for (const part of parts) {
      if (!current.children.has(part)) {
        current.children.set(part, { name: part, children: new Map(), meta: null });
      }
      current = current.children.get(part);
    }
    current.meta = meta;
  }
  return root;
}

function renderTree(root, maxDepth) {
  const lines = [`${root.name}/`];
  function renderChildren(node, prefix, currentDepth) {
    if (currentDepth >= maxDepth) return;
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
      const desc = child.meta?.description || '';
      const nameWidth = prefix.length + connector.length + displayName.length;
      const PAD_TO = 45;
      const padding = desc ? ' '.repeat(Math.max(1, PAD_TO - nameWidth)) : '';
      const comment = desc ? `${padding}# ${desc}` : '';
      lines.push(`${prefix}${connector}${displayName}${comment}`);
      if (isDir && currentDepth + 1 < maxDepth) {
        const childPrefix = prefix + (isLast ? '    ' : '│   ');
        renderChildren(child, childPrefix, currentDepth + 1);
      }
    });
  }
  renderChildren(root, '', 0);
  return lines.join('\n');
}

async function updateStructureMd(treeContent) {
  let md;
  try {
    md = await fs.readFile(structureMdPath, 'utf8');
  } catch {
    md = `# AI Journey - 仓库架构文档\n\n## 目录结构\n\n${MARKER_START}\n\`\`\`\n\`\`\`\n${MARKER_END}\n`;
  }
  const startIdx = md.indexOf(MARKER_START);
  const endIdx = md.indexOf(MARKER_END);
  const treeBlock = `${MARKER_START}\n\`\`\`\n${treeContent}\n\`\`\`\n${MARKER_END}`;
  if (startIdx !== -1 && endIdx !== -1) {
    md = md.slice(0, startIdx) + treeBlock + md.slice(endIdx + MARKER_END.length);
  } else {
    const sectionMatch = md.match(/## 目录结构\s*\n/);
    if (sectionMatch) {
      const sectionStart = sectionMatch.index + sectionMatch[0].length;
      const codeBlockMatch = md.slice(sectionStart).match(/```[\s\S]*?```/);
      if (codeBlockMatch) {
        const blockStart = sectionStart + codeBlockMatch.index;
        const blockEnd = blockStart + codeBlockMatch[0].length;
        md = md.slice(0, blockStart) + treeBlock + md.slice(blockEnd);
      } else {
        md = md.slice(0, sectionStart) + '\n' + treeBlock + '\n' + md.slice(sectionStart);
      }
    } else {
      md += `\n## 目录结构\n\n${treeBlock}\n`;
    }
  }
  await fs.writeFile(structureMdPath, md, 'utf8');
}

/* ------------------------------------------------------------------ */
/*  PG 同步辅助（动态 import pg，仅在需要时）                          */
/* ------------------------------------------------------------------ */

async function getPgClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('缺少 DATABASE_URL 环境变量，无法执行 PG 同步。');
  }
  const { Client } = await import('pg');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  return client;
}

/* ------------------------------------------------------------------ */
/*  MCP Server 定义                                                    */
/* ------------------------------------------------------------------ */

const server = new McpServer({
  name: 'repo-metadata',
  version: '1.0.0',
});

// ─── Tool 1: scan ─────────────────────────────────────────

server.tool(
  'repo_metadata_scan',
  '扫描仓库目录结构，对比 repo-metadata.json，报告新增/删除/未描述的条目。可选自动更新 JSON。',
  {
    update: z.boolean().optional().default(false).describe('是否自动更新 repo-metadata.json'),
    maxDepth: z.number().optional().describe('最大扫描深度（默认: 无限制）'),
  },
  async ({ update, maxDepth }) => {
    const { fileSet, dirSet } = getTrackedPaths();
    const metadata = await loadMetadata();
    const ignoreMatchers = (metadata.config?.scanIgnore ?? []).map(globToRegex);

    const diskPaths = new Map();
    for (const d of dirSet) {
      if (!shouldIgnore(d, ignoreMatchers)) diskPaths.set(d, 'directory');
    }
    for (const f of fileSet) {
      if (!shouldIgnore(f, ignoreMatchers)) diskPaths.set(f, 'file');
    }

    const filteredPaths = maxDepth
      ? new Map([...diskPaths].filter(([p]) => depthOf(p) <= maxDepth))
      : diskPaths;

    const existingPaths = new Set(Object.keys(metadata.nodes));
    const added = [];
    const undescribed = [];

    for (const [p, type] of filteredPaths) {
      if (!existingPaths.has(p)) {
        added.push({ path: p, type });
      } else if (!metadata.nodes[p].description) {
        undescribed.push(p);
      }
    }

    const removed = [];
    for (const p of existingPaths) {
      if (!filteredPaths.has(p)) removed.push(p);
    }

    if (update) {
      const now = new Date().toISOString();
      for (const { path: p, type } of added) {
        metadata.nodes[p] = {
          type,
          description: '',
          detail: '',
          tags: [],
          updatedBy: 'scan',
          updatedAt: now,
        };
      }
      for (const p of removed) {
        delete metadata.nodes[p];
      }
      await saveMetadata(metadata);
    }

    const lines = [];
    lines.push(`扫描完成: ${filteredPaths.size} 个路径`);
    if (added.length > 0) {
      lines.push(`\n🆕 新增 (${added.length}):`);
      for (const { path: p, type } of added.sort((a, b) => a.path.localeCompare(b.path))) {
        lines.push(`  + ${p}  (${type})`);
      }
    }
    if (removed.length > 0) {
      lines.push(`\n🗑️ 已删除 (${removed.length}):`);
      for (const p of removed.sort()) lines.push(`  - ${p}`);
    }
    if (undescribed.length > 0) {
      lines.push(`\n⚠️ 未描述 (${undescribed.length}):`);
      for (const p of undescribed.sort()) lines.push(`  ? ${p}`);
    }
    if (added.length === 0 && removed.length === 0 && undescribed.length === 0) {
      lines.push('\n✅ 元数据与文件系统完全同步，所有条目已描述。');
    }
    if (update) {
      lines.push(`\n✅ 已更新 repo-metadata.json: ${added.length} added, ${removed.length} removed`);
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },
);

// ─── Tool 2: get ──────────────────────────────────────────

server.tool(
  'repo_metadata_get',
  '获取指定路径的元数据详情（描述、标签、类型等）。',
  {
    path: z.string().describe('相对路径，如 "web/src/components"'),
  },
  async ({ path: nodePath }) => {
    const metadata = await loadMetadata();
    const node = metadata.nodes[nodePath];
    if (!node) {
      return { content: [{ type: 'text', text: `❌ 路径不存在: ${nodePath}` }] };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({ path: nodePath, ...node }, null, 2) }],
    };
  },
);

// ─── Tool 3: set ──────────────────────────────────────────

server.tool(
  'repo_metadata_set',
  '设置/更新指定路径的元数据（描述、标签等）。路径不存在时自动创建。',
  {
    path: z.string().describe('相对路径'),
    description: z.string().optional().describe('一句话描述'),
    detail: z.string().optional().describe('详细说明'),
    tags: z.array(z.string()).optional().describe('标签数组'),
    type: z.enum(['file', 'directory']).optional().describe('类型'),
  },
  async ({ path: nodePath, description, detail, tags, type }) => {
    const metadata = await loadMetadata();
    const now = new Date().toISOString();
    const existing = metadata.nodes[nodePath] ?? {
      type: type ?? 'directory',
      description: '',
      detail: '',
      tags: [],
      updatedBy: 'llm',
      updatedAt: now,
    };

    if (description !== undefined) existing.description = description;
    if (detail !== undefined) existing.detail = detail;
    if (tags !== undefined) existing.tags = tags;
    if (type !== undefined) existing.type = type;
    existing.updatedBy = 'llm';
    existing.updatedAt = now;

    metadata.nodes[nodePath] = existing;
    await saveMetadata(metadata);

    return { content: [{ type: 'text', text: `✅ 已更新: ${nodePath}` }] };
  },
);

// ─── Tool 4: batch_set ────────────────────────────────────

server.tool(
  'repo_metadata_batch_set',
  '批量设置多条路径的描述信息。适合 LLM 一次性补写多个新增条目。',
  {
    items: z
      .array(
        z.object({
          path: z.string().describe('相对路径'),
          description: z.string().optional().describe('一句话描述'),
          detail: z.string().optional().describe('详细说明'),
          tags: z.array(z.string()).optional().describe('标签数组'),
        }),
      )
      .describe('要更新的条目数组'),
  },
  async ({ items }) => {
    const metadata = await loadMetadata();
    const now = new Date().toISOString();
    let updated = 0;
    let skipped = 0;

    for (const item of items) {
      const existing = metadata.nodes[item.path];
      if (!existing) {
        skipped++;
        continue;
      }
      if (item.description !== undefined) existing.description = item.description;
      if (item.detail !== undefined) existing.detail = item.detail;
      if (item.tags !== undefined) existing.tags = item.tags;
      existing.updatedBy = 'llm';
      existing.updatedAt = now;
      metadata.nodes[item.path] = existing;
      updated++;
    }

    await saveMetadata(metadata);
    return {
      content: [{ type: 'text', text: `✅ 批量更新完成: ${updated}/${items.length} 条 (跳过 ${skipped})` }],
    };
  },
);

// ─── Tool 5: list ─────────────────────────────────────────

server.tool(
  'repo_metadata_list',
  '列出仓库元数据条目。支持按类型、标签、深度、是否未描述过滤。',
  {
    type: z.enum(['file', 'directory']).optional().describe('过滤类型'),
    tag: z.string().optional().describe('过滤标签'),
    maxDepth: z.number().optional().describe('最大深度'),
    undescribedOnly: z.boolean().optional().default(false).describe('只显示未描述的条目'),
  },
  async ({ type, tag, maxDepth, undescribedOnly }) => {
    const metadata = await loadMetadata();
    const entries = Object.entries(metadata.nodes)
      .filter(([p, node]) => {
        if (maxDepth && depthOf(p) > maxDepth) return false;
        if (type && node.type !== type) return false;
        if (tag && !node.tags?.includes(tag)) return false;
        if (undescribedOnly && node.description) return false;
        return true;
      })
      .sort(([a], [b]) => a.localeCompare(b));

    if (entries.length === 0) {
      return { content: [{ type: 'text', text: '没有匹配的条目。' }] };
    }

    const lines = entries.map(([p, node]) => {
      const icon = node.type === 'directory' ? '📁' : '📄';
      const desc = node.description || '(未描述)';
      return `${icon} ${p} — ${desc}`;
    });
    lines.push(`\n共 ${entries.length} 条`);

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },
);

// ─── Tool 6: delete ───────────────────────────────────────

server.tool(
  'repo_metadata_delete',
  '删除指定路径的元数据条目（级联删除子路径）。',
  {
    path: z.string().describe('要删除的相对路径'),
  },
  async ({ path: nodePath }) => {
    const metadata = await loadMetadata();
    if (!metadata.nodes[nodePath]) {
      return { content: [{ type: 'text', text: `❌ 路径不存在: ${nodePath}` }] };
    }

    delete metadata.nodes[nodePath];
    const prefix = `${nodePath}/`;
    let cascaded = 0;
    for (const key of Object.keys(metadata.nodes)) {
      if (key.startsWith(prefix)) {
        delete metadata.nodes[key];
        cascaded++;
      }
    }

    await saveMetadata(metadata);
    return {
      content: [
        { type: 'text', text: `✅ 已删除: ${nodePath}${cascaded > 0 ? ` (+ ${cascaded} 个子路径)` : ''}` },
      ],
    };
  },
);

// ─── Tool 7: generate_md ─────────────────────────────────

server.tool(
  'repo_metadata_generate_md',
  '从 repo-metadata.json 生成/更新 repository-structure.md 中的目录树。',
  {
    depth: z.number().optional().describe('目录树展开深度（默认: config.generateMdDepth 或 2）'),
  },
  async ({ depth }) => {
    const metadata = await loadMetadata();
    const treeDepth = depth ?? metadata.config?.generateMdDepth ?? 2;

    if (Object.keys(metadata.nodes).length === 0) {
      return { content: [{ type: 'text', text: '❌ repo-metadata.json 中没有节点数据。' }] };
    }

    const tree = buildTree(metadata.nodes);
    const treeContent = renderTree(tree, treeDepth);
    await updateStructureMd(treeContent);

    const nodeCount = Object.keys(metadata.nodes).length;
    return {
      content: [
        { type: 'text', text: `✅ 已更新 repository-structure.md（${nodeCount} 个节点，展开 ${treeDepth} 层）` },
      ],
    };
  },
);

// ─── Tool 8: sync_db ─────────────────────────────────────

server.tool(
  'repo_metadata_sync_db',
  'JSON ⇄ PostgreSQL 双向同步。需要 DATABASE_URL 环境变量。',
  {
    direction: z.enum(['json-to-pg', 'pg-to-json']).describe('"json-to-pg" 或 "pg-to-json"'),
  },
  async ({ direction }) => {
    const client = await getPgClient();

    try {
      if (direction === 'json-to-pg') {
        const metadata = await loadMetadata();
        const entries = Object.entries(metadata.nodes);

        if (entries.length === 0) {
          return { content: [{ type: 'text', text: 'ℹ repo-metadata.json 为空。' }] };
        }

        await client.query('begin');

        const sorted = entries.sort(([a], [b]) => {
          return a.split('/').length - b.split('/').length || a.localeCompare(b);
        });

        let upserted = 0;
        for (const [nodePath, node] of sorted) {
          const parentPath = path.dirname(nodePath);
          await client.query(
            `insert into repo_metadata_nodes (path, type, description, detail, tags, parent_path, sort_order, updated_by)
             values ($1, $2, $3, $4, $5, $6, $7, $8)
             on conflict (path) do update set
               type=excluded.type, description=excluded.description, detail=excluded.detail,
               tags=excluded.tags, parent_path=excluded.parent_path, sort_order=excluded.sort_order,
               updated_by=excluded.updated_by`,
            [
              nodePath,
              node.type,
              node.description || null,
              node.detail || null,
              node.tags ?? [],
              parentPath === '.' ? null : parentPath,
              node.sortOrder ?? 0,
              node.updatedBy ?? 'scan',
            ],
          );
          upserted++;
        }

        const pathSet = new Set(entries.map(([p]) => p));
        const dbRows = await client.query('select path from repo_metadata_nodes');
        let deleted = 0;
        for (const row of dbRows.rows) {
          if (!pathSet.has(row.path)) {
            await client.query('delete from repo_metadata_nodes where path = $1', [row.path]);
            deleted++;
          }
        }

        await client.query('commit');
        return {
          content: [{ type: 'text', text: `✅ JSON → PG 同步完成: upsert ${upserted}, 删除 ${deleted}` }],
        };
      } else {
        // pg-to-json
        const result = await client.query(`
          select path, type, description, detail, tags, sort_order, updated_by, updated_at
          from repo_metadata_nodes order by path
        `);

        if (result.rows.length === 0) {
          return { content: [{ type: 'text', text: 'ℹ PG 表为空。' }] };
        }

        const metadata = await loadMetadata();
        const nodes = {};
        for (const row of result.rows) {
          nodes[row.path] = {
            type: row.type,
            description: row.description ?? '',
            detail: row.detail ?? '',
            tags: row.tags ?? [],
            updatedBy: row.updated_by ?? 'scan',
            updatedAt: row.updated_at?.toISOString() ?? new Date().toISOString(),
          };
        }

        metadata.nodes = nodes;
        await saveMetadata(metadata);

        return {
          content: [{ type: 'text', text: `✅ PG → JSON 同步完成: ${result.rows.length} 条记录` }],
        };
      }
    } catch (err) {
      await client.query('rollback').catch(() => {});
      throw err;
    } finally {
      await client.end();
    }
  },
);

/* ------------------------------------------------------------------ */
/*  启动 Server                                                        */
/* ------------------------------------------------------------------ */

const transport = new StdioServerTransport();
await server.connect(transport);
