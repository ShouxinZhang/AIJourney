import { DEFAULT_COLOR } from '../constants';
import type { FolderRow, KnowledgeNode, TreeIndex } from '../types';

function isFolderNode(node: KnowledgeNode): boolean {
  if (node.kind === 'folder') return true;
  if (node.kind === 'node') return false;
  if (node.children?.length) return true;
  return !node.docPath;
}

export function createTreeIndex(nodes: KnowledgeNode[]): TreeIndex {
  const nodeById = new Map<string, KnowledgeNode>();
  const parentById = new Map<string, string | null>();
  const childrenById = new Map<string, string[]>();
  const colorById = new Map<string, string>();

  const walk = (items: KnowledgeNode[], parentId: string | null, inheritedColor: string) => {
    for (const node of items) {
      const color = node.color ?? inheritedColor;
      nodeById.set(node.id, node);
      parentById.set(node.id, parentId);
      colorById.set(node.id, color);
      childrenById.set(
        node.id,
        node.children?.map((child) => child.id) ?? [],
      );
      if (node.children?.length) {
        walk(node.children, node.id, color);
      }
    }
  };

  walk(nodes, null, DEFAULT_COLOR);
  return { nodeById, parentById, childrenById, colorById };
}

export function buildVisibleRows(
  nodes: KnowledgeNode[],
  expanded: Set<string>,
  colorById: Map<string, string>,
  depth = 0,
): FolderRow[] {
  const rows: FolderRow[] = [];

  for (const node of nodes) {
    const hasChildren = !!node.children?.length;
    rows.push({
      id: node.id,
      label: node.label,
      depth,
      hasChildren,
      isFolder: isFolderNode(node),
      color: colorById.get(node.id) ?? DEFAULT_COLOR,
    });

    if (hasChildren && expanded.has(node.id)) {
      rows.push(...buildVisibleRows(node.children!, expanded, colorById, depth + 1));
    }
  }

  return rows;
}

export function buildUpstreamPath(selectedNodeId: string | null, parentById: Map<string, string | null>): string[] {
  if (!selectedNodeId) return [];

  const path: string[] = [];
  let current: string | null | undefined = selectedNodeId;
  while (current) {
    path.unshift(current);
    current = parentById.get(current) ?? null;
  }

  return path;
}

export function countDescendants(nodeId: string, childrenById: Map<string, string[]>): number {
  const children = childrenById.get(nodeId) ?? [];
  let total = children.length;

  for (const childId of children) {
    total += countDescendants(childId, childrenById);
  }

  return total;
}
