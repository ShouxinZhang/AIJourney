import type { Edge, Node } from '@xyflow/react';
import { DEFAULT_COLOR, H_GAP, NODE_HEIGHT, NODE_WIDTH, V_GAP } from '../constants';
import type { FlowBuildResult, KnowledgeNode } from '../types';

function subtreeWidth(node: KnowledgeNode, expanded: Set<string>): number {
  if (!node.children || !expanded.has(node.id)) return NODE_WIDTH;
  const childWidths = node.children.map((c) => subtreeWidth(c, expanded));
  return Math.max(NODE_WIDTH, childWidths.reduce((a, b) => a + b, 0) + (node.children.length - 1) * H_GAP);
}

export function buildGraph(
  nodes: KnowledgeNode[],
  expanded: Set<string>,
  selectedId: string | null,
  parentId?: string,
  startX = 0,
  startY = 0,
  parentColor?: string,
  depth = 0,
): FlowBuildResult {
  const flowNodes: Node[] = [];
  const flowEdges: Edge[] = [];

  let offsetX = startX;

  for (const node of nodes) {
    const color = node.color ?? parentColor ?? DEFAULT_COLOR;
    const width = subtreeWidth(node, expanded);
    const x = offsetX + width / 2 - NODE_WIDTH / 2;
    const y = startY;

    const hasChildren = !!node.children?.length;
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedId === node.id;

    flowNodes.push({
      id: node.id,
      position: { x, y },
      data: {
        label: node.label,
        description: node.description,
        hasChildren,
        isExpanded,
        color,
        depth,
        isSelected,
      },
      type: 'knowledgeNode',
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
    });

    if (parentId) {
      const isRelatedToSelected = selectedId === parentId || selectedId === node.id;
      flowEdges.push({
        id: `${parentId}->${node.id}`,
        source: parentId,
        target: node.id,
        sourceHandle: 'out',
        targetHandle: 'in',
        type: 'smoothstep',
        animated: isRelatedToSelected,
        style: {
          stroke: color,
          strokeWidth: isRelatedToSelected ? 3 : 2.2,
          opacity: isRelatedToSelected ? 0.96 : 0.76,
        },
      });
    }

    if (hasChildren && isExpanded) {
      const { flowNodes: childNodes, flowEdges: childEdges } = buildGraph(
        node.children!,
        expanded,
        selectedId,
        node.id,
        offsetX,
        y + NODE_HEIGHT + V_GAP,
        color,
        depth + 1,
      );
      flowNodes.push(...childNodes);
      flowEdges.push(...childEdges);
    }

    offsetX += width + H_GAP;
  }

  return { flowNodes, flowEdges };
}
