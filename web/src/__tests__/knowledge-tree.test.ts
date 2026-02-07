import { describe, it, expect } from 'vitest';
import { knowledgeTree, type KnowledgeNode } from '../data/knowledge-tree';

/** 递归收集所有节点 */
function collectAll(nodes: KnowledgeNode[]): KnowledgeNode[] {
  return nodes.flatMap((n) => [n, ...collectAll(n.children ?? [])]);
}

describe('knowledge-tree 数据完整性', () => {
  it('应包含 3 个根类别', () => {
    expect(knowledgeTree).toHaveLength(3);
  });

  it('根类别的 id 符合预期', () => {
    const ids = knowledgeTree.map((n) => n.id);
    expect(ids).toEqual(['vibe-coding', 'agent-dev', 'llm-fundamental']);
  });

  it('每个根类别必须有颜色', () => {
    for (const root of knowledgeTree) {
      expect(root.color).toBeTruthy();
    }
  });

  it('所有节点 id 唯一', () => {
    const all = collectAll(knowledgeTree);
    const ids = all.map((n) => n.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('每个根类别至少有 3 个子分类', () => {
    for (const root of knowledgeTree) {
      expect(root.children!.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('所有节点有 label', () => {
    const all = collectAll(knowledgeTree);
    for (const node of all) {
      expect(node.label).toBeTruthy();
    }
  });
});
