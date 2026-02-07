import type { NodeKind } from '../types';

interface KnowledgeApiResult {
  ok?: boolean;
  message?: string;
}

export interface CreateKnowledgeNodeInput {
  label: string;
  parentId: string;
  kind: NodeKind;
}

export interface CreateKnowledgeNodeOutput extends KnowledgeApiResult {
  id: string;
  label: string;
  parentId: string | null;
  kind: NodeKind;
}

async function requestJson<T extends KnowledgeApiResult>(url: string, init: RequestInit, failedMessage: string): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.message || failedMessage);
  }
  return payload as T;
}

export async function createKnowledgeNode(input: CreateKnowledgeNodeInput): Promise<CreateKnowledgeNodeOutput> {
  return requestJson<CreateKnowledgeNodeOutput>(
    '/api/knowledge/nodes',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    input.kind === 'folder' ? '创建文件夹失败' : '创建节点失败',
  );
}

export async function deleteKnowledgeNode(nodeId: string): Promise<void> {
  await requestJson<KnowledgeApiResult>(
    `/api/knowledge/nodes/${encodeURIComponent(nodeId)}`,
    { method: 'DELETE' },
    '删除节点失败',
  );
}
