import type { KnowledgeNode, NodeKind } from '../types';

interface AppendChildNodeParams {
  parentId: string;
  id: string;
  label: string;
  kind: NodeKind;
  color?: string;
}

interface RemoveNodeResult {
  tree: KnowledgeNode[];
  removed: boolean;
}

function createNode({ id, label, kind, color }: Omit<AppendChildNodeParams, 'parentId'>): KnowledgeNode {
  const baseNode: KnowledgeNode = {
    id,
    label,
    kind,
  };

  if (color) {
    baseNode.color = color;
  }

  if (kind === 'folder') {
    baseNode.children = [];
  }

  return baseNode;
}

export function appendChildNode(tree: KnowledgeNode[], params: AppendChildNodeParams): KnowledgeNode[] {
  const childNode = createNode(params);

  const walk = (nodes: KnowledgeNode[]): [KnowledgeNode[], boolean] => {
    let inserted = false;

    const nextNodes = nodes.map((node) => {
      if (node.id === params.parentId) {
        inserted = true;
        const nextChildren = [...(node.children ?? []), childNode];
        return { ...node, children: nextChildren };
      }

      if (!node.children?.length) {
        return node;
      }

      const [nextChildren, childInserted] = walk(node.children);
      if (!childInserted) {
        return node;
      }

      inserted = true;
      return { ...node, children: nextChildren };
    });

    return [inserted ? nextNodes : nodes, inserted];
  };

  return walk(tree)[0];
}

export function removeNode(tree: KnowledgeNode[], targetId: string): RemoveNodeResult {
  const walk = (nodes: KnowledgeNode[]): [KnowledgeNode[], boolean] => {
    let removed = false;
    const nextNodes: KnowledgeNode[] = [];

    for (const node of nodes) {
      if (node.id === targetId) {
        removed = true;
        continue;
      }

      if (!node.children?.length) {
        nextNodes.push(node);
        continue;
      }

      const [nextChildren, childRemoved] = walk(node.children);
      if (childRemoved) {
        removed = true;
        nextNodes.push({ ...node, children: nextChildren });
      } else {
        nextNodes.push(node);
      }
    }

    return [removed ? nextNodes : nodes, removed];
  };

  const [nextTree, removed] = walk(tree);
  return { tree: nextTree, removed };
}
