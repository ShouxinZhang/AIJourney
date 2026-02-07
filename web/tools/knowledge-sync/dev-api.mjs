import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const scriptsDir = path.join(scriptDir, 'scripts');
const defaultDatabaseUrl = 'postgresql://postgres:postgres@127.0.0.1:5432/ai_journey?sslmode=disable';

function slugify(value) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return slug || 'node';
}

async function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const mcpPath = path.join(repoRoot, '.vscode', 'mcp.json');
  try {
    const raw = await fs.readFile(mcpPath, 'utf8');
    const parsed = JSON.parse(raw);
    const mcpUrl = parsed?.servers?.['repo-metadata']?.env?.DATABASE_URL;
    if (typeof mcpUrl === 'string' && mcpUrl.trim()) {
      return mcpUrl.trim();
    }
  } catch {
    // ignore mcp parse errors
  }

  return defaultDatabaseUrl;
}

async function runKnowledgeScript({ scriptName, args = [], databaseUrl }) {
  const scriptPath = path.join(scriptsDir, scriptName);
  const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    maxBuffer: 1024 * 1024,
  });

  return { stdout, stderr };
}

async function readJsonBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
  }

  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('请求体必须是合法 JSON');
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function parseNodeId(pathname) {
  const match = pathname.match(/^\/api\/knowledge\/nodes\/([^/]+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

function parseRestoreNodeId(pathname) {
  const match = pathname.match(/^\/api\/knowledge\/nodes\/([^/]+)\/restore$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

export function knowledgeDevApiPlugin() {
  return {
    name: 'knowledge-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) {
          next();
          return;
        }

        const url = new URL(req.url, 'http://127.0.0.1');
        const pathname = url.pathname;

        if (!pathname.startsWith('/api/knowledge/')) {
          next();
          return;
        }

        try {
          const databaseUrl = await resolveDatabaseUrl();

          if (req.method === 'GET' && pathname === '/api/knowledge/health') {
            sendJson(res, 200, { ok: true, databaseUrl: databaseUrl.replace(/:[^:@/]+@/, ':***@') });
            return;
          }

          if (req.method === 'POST' && pathname === '/api/knowledge/nodes') {
            const body = await readJsonBody(req);
            const label = String(body?.label ?? '').trim();
            const parentId = body?.parentId ? String(body.parentId).trim() : null;

            if (!label) {
              sendJson(res, 400, { ok: false, message: 'label 不能为空' });
              return;
            }

            const base = slugify(label);
            const id = `${base}-${Date.now().toString(36).slice(-6)}`;
            const args = ['create', '--id', id, '--label', label];
            if (parentId) {
              args.push('--parent-id', parentId);
            }

            await runKnowledgeScript({ scriptName: 'crud-node.mjs', args, databaseUrl });
            await runKnowledgeScript({ scriptName: 'sync-read-model.mjs', args: [], databaseUrl });

            sendJson(res, 200, { ok: true, id, label, parentId });
            return;
          }

          const deleteNodeId = parseNodeId(pathname);
          if (req.method === 'DELETE' && deleteNodeId) {
            await runKnowledgeScript({
              scriptName: 'crud-node.mjs',
              args: ['delete', '--id', deleteNodeId],
              databaseUrl,
            });
            await runKnowledgeScript({ scriptName: 'sync-read-model.mjs', args: [], databaseUrl });

            sendJson(res, 200, { ok: true, id: deleteNodeId, mode: 'trash' });
            return;
          }

          const restoreNodeId = parseRestoreNodeId(pathname);
          if (req.method === 'POST' && restoreNodeId) {
            await runKnowledgeScript({
              scriptName: 'crud-node.mjs',
              args: ['restore', '--id', restoreNodeId],
              databaseUrl,
            });
            await runKnowledgeScript({ scriptName: 'sync-read-model.mjs', args: [], databaseUrl });

            sendJson(res, 200, { ok: true, id: restoreNodeId, mode: 'restore' });
            return;
          }

          sendJson(res, 404, { ok: false, message: '未找到接口' });
        } catch (error) {
          const message = error?.stderr?.trim() || error?.stdout?.trim() || error?.message || '未知错误';
          sendJson(res, 500, { ok: false, message });
        }
      });
    },
  };
}
