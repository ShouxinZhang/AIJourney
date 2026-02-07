import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react';
import { DEFAULT_COLOR } from '../constants';
import { buildGraph } from '../model/graph-layout';
import {
  buildUpstreamPath,
  buildVisibleRows,
  countDescendants,
  createTreeIndex,
} from '../model/tree-index';
import type { KnowledgeNode, ViewMode } from '../types';

export interface KnowledgeGraphState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  expanded: Set<string>;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  toggleExpand: (id: string) => void;
  folderRows: ReturnType<typeof buildVisibleRows>;
  selectedNode: KnowledgeNode | null;
  upstreamPathIds: string[];
  directDependencyIds: string[];
  isLeafSelected: boolean;
  hasReadableContent: boolean;
  descendantCount: number;
  selectedNodeColor: string;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  handleGraphNodeClick: NodeMouseHandler;
  nodeById: Map<string, KnowledgeNode>;
  childrenById: Map<string, string[]>;
  colorById: Map<string, string>;
}

export function useKnowledgeGraphState(tree: KnowledgeNode[]): KnowledgeGraphState {
  const isDocumentNode = useCallback((node: KnowledgeNode): boolean => {
    if (node.kind === 'node') return true;
    if (node.kind === 'folder') return false;
    return Boolean(node.docPath);
  }, []);

  const rootIds = useMemo(() => tree.map((node) => node.id), [tree]);
  const { nodeById, parentById, childrenById, colorById } = useMemo(() => createTreeIndex(tree), [tree]);

  const [viewMode, setViewMode] = useState<ViewMode>('folder');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(rootIds));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(rootIds[0] ?? null);

  useEffect(() => {
    if (!selectedNodeId || nodeById.has(selectedNodeId)) return;
    setSelectedNodeId(rootIds[0] ?? null);
  }, [nodeById, rootIds, selectedNodeId]);

  const toggleExpand = useCallback(
    (nodeId: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);

        if (next.has(nodeId)) {
          const stack = [nodeId];
          while (stack.length) {
            const current = stack.pop()!;
            next.delete(current);
            const children = childrenById.get(current) ?? [];
            children.forEach((childId) => stack.push(childId));
          }
          return next;
        }

        next.add(nodeId);
        return next;
      });
    },
    [childrenById],
  );

  const folderRows = useMemo(() => buildVisibleRows(tree, expanded, colorById), [colorById, expanded, tree]);

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null),
    [nodeById, selectedNodeId],
  );

  const upstreamPathIds = useMemo(
    () => buildUpstreamPath(selectedNodeId, parentById),
    [parentById, selectedNodeId],
  );

  const directDependencyIds = useMemo(
    () => (selectedNodeId ? childrenById.get(selectedNodeId) ?? [] : []),
    [childrenById, selectedNodeId],
  );
  const isLeafSelected = !!selectedNode && directDependencyIds.length === 0 && isDocumentNode(selectedNode);
  const hasReadableContent = Boolean(selectedNode?.content?.trim());

  const descendantCount = useMemo(
    () => (selectedNodeId ? countDescendants(selectedNodeId, childrenById) : 0),
    [childrenById, selectedNodeId],
  );

  const selectedNodeColor = selectedNodeId ? colorById.get(selectedNodeId) ?? DEFAULT_COLOR : DEFAULT_COLOR;

  const { flowNodes: computedNodes, flowEdges: computedEdges } = useMemo(
    () => buildGraph(tree, expanded, selectedNodeId),
    [expanded, selectedNodeId, tree],
  );

  const [nodes, setNodes] = useState<Node[]>(computedNodes);
  const [edges, setEdges] = useState<Edge[]>(computedEdges);

  useEffect(() => {
    setNodes(computedNodes);
    setEdges(computedEdges);
  }, [computedNodes, computedEdges]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const handleGraphNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setSelectedNodeId(node.id);
      if (node.data.hasChildren as boolean) {
        toggleExpand(node.id);
      }
    },
    [toggleExpand],
  );

  return {
    viewMode,
    setViewMode,
    expanded,
    selectedNodeId,
    setSelectedNodeId,
    toggleExpand,
    folderRows,
    selectedNode,
    upstreamPathIds,
    directDependencyIds,
    isLeafSelected,
    hasReadableContent,
    descendantCount,
    selectedNodeColor,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    handleGraphNodeClick,
    nodeById,
    childrenById,
    colorById,
  };
}
