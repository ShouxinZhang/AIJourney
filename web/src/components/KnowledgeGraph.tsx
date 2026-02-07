import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Handle,
  Position,
  ConnectionMode,
  Background,
  Controls,
  MiniMap,
  type NodeMouseHandler,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { knowledgeTree, type KnowledgeNode } from '../data/knowledge-tree';

/* ── 布局常量 ── */
const NODE_WIDTH = 210;
const NODE_HEIGHT = 54;
const H_GAP = 50;
const V_GAP = 76;
const DEFAULT_COLOR = '#f97316';
const HIDDEN_HANDLE_STYLE = {
  width: 8,
  height: 8,
  border: 0,
  background: 'transparent',
  opacity: 0,
  pointerEvents: 'none' as const,
};

interface FolderRow {
  id: string;
  label: string;
  depth: number;
  hasChildren: boolean;
  color: string;
}

interface TreeIndex {
  nodeById: Map<string, KnowledgeNode>;
  parentById: Map<string, string | null>;
  childrenById: Map<string, string[]>;
  colorById: Map<string, string>;
}

/* ── 深度追踪 ── */
function subtreeWidth(node: KnowledgeNode, expanded: Set<string>): number {
  if (!node.children || !expanded.has(node.id)) return NODE_WIDTH;
  const childWidths = node.children.map((c) => subtreeWidth(c, expanded));
  return Math.max(NODE_WIDTH, childWidths.reduce((a, b) => a + b, 0) + (node.children.length - 1) * H_GAP);
}

/* ── 递归生成 React Flow 节点和边 ── */
function buildGraph(
  nodes: KnowledgeNode[],
  expanded: Set<string>,
  selectedId: string | null,
  parentId?: string,
  startX = 0,
  startY = 0,
  parentColor?: string,
  depth = 0,
): { flowNodes: Node[]; flowEdges: Edge[] } {
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

function createTreeIndex(nodes: KnowledgeNode[]): TreeIndex {
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

function buildVisibleRows(
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
      color: colorById.get(node.id) ?? DEFAULT_COLOR,
    });

    if (hasChildren && expanded.has(node.id)) {
      rows.push(...buildVisibleRows(node.children!, expanded, colorById, depth + 1));
    }
  }

  return rows;
}

function buildUpstreamPath(selectedNodeId: string | null, parentById: Map<string, string | null>): string[] {
  if (!selectedNodeId) return [];

  const path: string[] = [];
  let current: string | null | undefined = selectedNodeId;
  while (current) {
    path.unshift(current);
    current = parentById.get(current) ?? null;
  }

  return path;
}

function countDescendants(nodeId: string, childrenById: Map<string, string[]>): number {
  const children = childrenById.get(nodeId) ?? [];
  let total = children.length;

  for (const childId of children) {
    total += countDescendants(childId, childrenById);
  }

  return total;
}

/* ── 水果图标映射 ── */
const FRUIT_ICONS: Record<string, string> = {
  'vibe-coding': '🍊',
  'agent-dev': '🥝',
  'llm-fundamental': '🫐',
};

function getFruitIcon(id: string, depth: number): string {
  if (depth === 0) return FRUIT_ICONS[id] ?? '🍑';
  const fruits = ['🍋', '🍑', '🍒', '🥭', '🍇', '🍓'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return fruits[Math.abs(hash) % fruits.length];
}

/* ── 自定义节点组件 ── */
function KnowledgeNodeComponent({ id, data }: { id: string; data: Record<string, unknown> }) {
  const color = data.color as string;
  const hasChildren = data.hasChildren as boolean;
  const isExpanded = data.isExpanded as boolean;
  const depth = (data.depth as number) ?? 0;
  const isRoot = depth === 0;
  const fruit = getFruitIcon(id, depth);
  const isSelected = data.isSelected as boolean;

  return (
    <div
      className="relative cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5"
      style={{ minHeight: NODE_HEIGHT }}
    >
      <Handle type="target" position={Position.Top} id="in" isConnectable={false} style={HIDDEN_HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="out" isConnectable={false} style={HIDDEN_HANDLE_STYLE} />

      <div
        className="rounded-xl px-4 py-2.5 h-full flex items-center gap-2.5 transition-shadow duration-200"
        style={{
          background: isRoot ? `linear-gradient(135deg, ${color}, ${color}cc)` : '#ffffff',
          border: isRoot ? 'none' : `1.5px solid ${isSelected ? color : `${color}40`}`,
          boxShadow: isSelected
            ? `0 0 0 2px ${color}55, 0 6px 22px ${color}26`
            : isRoot
              ? `0 4px 16px ${color}30, 0 1px 3px ${color}20`
              : `0 1px 8px rgba(180,140,90,0.08), 0 1px 2px rgba(0,0,0,0.04)`,
        }}
      >
        <span className="text-base flex-shrink-0" style={{ filter: isRoot ? 'brightness(1.1)' : 'none' }}>
          {fruit}
        </span>

        <div className="min-w-0 flex-1">
          <div
            className="font-semibold text-sm leading-snug truncate"
            style={{
              color: isRoot ? '#ffffff' : '#3d2c1e',
              fontFamily: isRoot ? "'Noto Serif SC', serif" : 'inherit',
              letterSpacing: isRoot ? '0.02em' : 'normal',
            }}
          >
            {data.label as string}
          </div>
        </div>

        {!isRoot && (
          <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full" style={{ background: color }} />
        )}
      </div>

      {hasChildren && (
        <div
          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-[22px] h-[22px] rounded-full flex items-center justify-center text-xs font-bold border-2"
          style={{
            background: '#ffffff',
            borderColor: color,
            color,
          }}
        >
          {isExpanded ? '−' : '+'}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { knowledgeNode: KnowledgeNodeComponent };

/* ── 主组件 ── */
export default function KnowledgeGraph() {
  const rootIds = useMemo(() => knowledgeTree.map((node) => node.id), []);
  const { nodeById, parentById, childrenById, colorById } = useMemo(() => createTreeIndex(knowledgeTree), []);

  const [viewMode, setViewMode] = useState<'folder' | 'graph'>('folder');
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

  const folderRows = useMemo(() => buildVisibleRows(knowledgeTree, expanded, colorById), [colorById, expanded]);

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
  const isLeafSelected = !!selectedNode && directDependencyIds.length === 0;
  const hasReadableContent = Boolean(selectedNode?.content?.trim());

  const descendantCount = useMemo(
    () => (selectedNodeId ? countDescendants(selectedNodeId, childrenById) : 0),
    [childrenById, selectedNodeId],
  );

  const selectedNodeColor = selectedNodeId ? colorById.get(selectedNodeId) ?? DEFAULT_COLOR : DEFAULT_COLOR;

  const { flowNodes: computedNodes, flowEdges: computedEdges } = useMemo(
    () => buildGraph(knowledgeTree, expanded, selectedNodeId),
    [expanded, selectedNodeId],
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

  const markdownComponents = useMemo<Components>(
    () => ({
      code(props) {
        const { className, children, ...rest } = props;
        const text = String(children).replace(/\n$/, '');
        if (!className) {
          return <code {...rest}>{children}</code>;
        }
        return (
          <pre>
            <code className={className} {...rest}>
              {text}
            </code>
          </pre>
        );
      },
    }),
    [],
  );

  return (
    <div className="w-full h-screen flex flex-col" style={{ background: '#fefcf6' }}>
      <header className="px-4 py-3 border-b" style={{ borderColor: '#f0e4d4', background: 'rgba(255,255,255,0.92)' }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1
              className="text-xl md:text-2xl font-bold flex items-center"
              style={{ fontFamily: "'Noto Serif SC', serif", color: '#3d2c1e', letterSpacing: '0.03em' }}
            >
              <span className="mr-2">📖</span>
              AI Journey
            </h1>
            <p className="text-sm mt-1" style={{ color: '#9a8575' }}>
              文件夹负责管理，依赖图负责分析影响范围
            </p>
          </div>

          <div
            className="inline-flex p-1 rounded-xl border w-fit"
            style={{ borderColor: '#f0e4d4', background: '#fff9f0' }}
          >
            <button
              type="button"
              onClick={() => setViewMode('folder')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: viewMode === 'folder' ? '#ffffff' : 'transparent',
                color: viewMode === 'folder' ? '#3d2c1e' : '#8a7363',
                boxShadow: viewMode === 'folder' ? '0 1px 8px rgba(150,120,90,0.12)' : 'none',
              }}
            >
              文件夹视图
            </button>
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: viewMode === 'graph' ? '#ffffff' : 'transparent',
                color: viewMode === 'graph' ? '#3d2c1e' : '#8a7363',
                boxShadow: viewMode === 'graph' ? '0 1px 8px rgba(150,120,90,0.12)' : 'none',
              }}
            >
              依赖图视图
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 p-3 md:p-4 grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)_320px] gap-3 md:gap-4">
        <section
          className="rounded-2xl border flex flex-col min-h-[300px] md:min-h-0"
          style={{ borderColor: '#f0e4d4', background: 'rgba(255,255,255,0.9)' }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: '#f4ebde' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#4a3628' }}>
              📁 知识文件夹
            </h2>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {folderRows.map((row) => {
              const isExpanded = expanded.has(row.id);
              const isSelected = selectedNodeId === row.id;

              return (
                <div key={row.id} className="flex items-center gap-1 py-0.5" style={{ paddingLeft: `${row.depth * 14}px` }}>
                  {row.hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggleExpand(row.id)}
                      className="w-5 h-5 rounded-md text-xs"
                      style={{ color: '#8a7363' }}
                      aria-label={isExpanded ? '折叠节点' : '展开节点'}
                    >
                      {isExpanded ? '▾' : '▸'}
                    </button>
                  ) : (
                    <span className="w-5" />
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedNodeId(row.id)}
                    className="flex-1 text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 text-sm"
                    style={{
                      background: isSelected ? `${row.color}16` : 'transparent',
                      color: isSelected ? '#3d2c1e' : '#6f5a4a',
                      border: isSelected ? `1px solid ${row.color}4d` : '1px solid transparent',
                    }}
                  >
                    <span>{row.hasChildren ? (isExpanded ? '📂' : '📁') : '📄'}</span>
                    <span className="truncate">{row.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className="rounded-2xl border overflow-hidden min-h-[420px] md:min-h-0"
          style={{ borderColor: '#f0e4d4', background: '#fffdf8' }}
        >
          {viewMode === 'folder' ? (
            <div className="h-full flex flex-col">
              <div className="px-5 py-4 border-b" style={{ borderColor: '#f4ebde', background: '#fffaf1' }}>
                <p className="text-xs uppercase tracking-wide" style={{ color: '#8a7363' }}>
                  {isLeafSelected ? '在线文档' : '当前目录'}
                </p>
                <h3 className="text-lg font-semibold mt-1" style={{ color: '#3d2c1e' }}>
                  {selectedNode?.label ?? '未选择节点'}
                </h3>
                <p className="text-sm mt-1" style={{ color: '#8a7363' }}>
                  {upstreamPathIds
                    .map((id) => nodeById.get(id)?.label ?? id)
                    .join(' / ') || '请选择左侧节点查看内容'}
                </p>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {isLeafSelected ? (
                  hasReadableContent ? (
                    <article className="knowledge-markdown knowledge-markdown-article rounded-xl border bg-white px-5 py-4" style={{ borderColor: '#f0e4d4' }}>
                      <ReactMarkdown components={markdownComponents}>{selectedNode?.content ?? ''}</ReactMarkdown>
                    </article>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm" style={{ color: '#8a7363' }}>
                      当前叶子节点暂无文档内容
                    </div>
                  )
                ) : directDependencyIds.length > 0 ? (
                  <div className="space-y-2">
                    {directDependencyIds.map((childId) => {
                      const child = nodeById.get(childId);
                      if (!child) return null;
                      const childHasChildren = (childrenById.get(childId) ?? []).length > 0;
                      const childColor = colorById.get(childId) ?? DEFAULT_COLOR;

                      return (
                        <div
                          key={childId}
                          className="w-full rounded-xl border px-4 py-3 flex items-start justify-between gap-3"
                          style={{ borderColor: '#f0e4d4', background: '#ffffff' }}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedNodeId(childId)}
                            className="text-left flex-1"
                          >
                            <div className="font-medium text-sm" style={{ color: '#3d2c1e' }}>
                              {childHasChildren ? '📁' : '📄'} {child.label}
                            </div>
                            <div className="text-xs mt-1 leading-relaxed" style={{ color: '#8a7363' }}>
                              {child.description ?? '暂无描述'}
                            </div>
                          </button>

                          {childHasChildren && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedNodeId(childId);
                                toggleExpand(childId);
                              }}
                              className="px-2 py-1 text-xs rounded-md border"
                              style={{ borderColor: `${childColor}66`, color: childColor, background: `${childColor}14` }}
                            >
                              {expanded.has(childId) ? '收起' : '展开'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm" style={{ color: '#8a7363' }}>
                    当前节点没有下级内容
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full h-full min-h-[420px]">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleGraphNodeClick}
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                minZoom={0.2}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
              >
                <Background color="#f0e4d4" gap={24} size={1} />
                <Controls />
                <MiniMap
                  nodeColor={(node) => (node.data.color as string) ?? DEFAULT_COLOR}
                  maskColor="rgba(254,252,246,0.7)"
                />
              </ReactFlow>
            </div>
          )}
        </section>

        <section
          className="rounded-2xl border flex flex-col min-h-[260px] md:min-h-0"
          style={{ borderColor: '#f0e4d4', background: 'rgba(255,255,255,0.9)' }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: '#f4ebde' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#4a3628' }}>
              🧭 业务详情
            </h2>
          </div>

          <div className="p-4 overflow-auto text-sm space-y-4" style={{ color: '#5f4b3d' }}>
            {selectedNode ? (
              <>
                <div>
                  <div className="text-xs uppercase tracking-wide" style={{ color: '#8a7363' }}>
                    节点名称
                  </div>
                  <div className="mt-1 text-base font-semibold" style={{ color: '#3d2c1e' }}>
                    {selectedNode.label}
                  </div>
                  <div className="mt-2 text-sm leading-relaxed" style={{ color: '#7a6555' }}>
                    {selectedNode.description ?? '暂无业务说明'}
                  </div>
                  {selectedNode.docPath && (
                    <div className="mt-2 text-xs" style={{ color: '#8a7363' }}>
                      文档路径: <code>{`docs/knowledge/${selectedNode.docPath}`}</code>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: '#f0e4d4', background: '#ffffff' }}>
                  <div className="text-xs" style={{ color: '#8a7363' }}>
                    阅读状态
                  </div>
                  <div className="mt-1 text-sm font-medium" style={{ color: '#3d2c1e' }}>
                    {isLeafSelected ? (hasReadableContent ? '可在线阅读' : '待补充文档') : '请选择叶子节点阅读正文'}
                  </div>
                </div>

                <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: `${selectedNodeColor}4d`, background: '#fffdf8' }}>
                  <div className="text-xs" style={{ color: '#8a7363' }}>
                    影响规模
                  </div>
                  <div className="mt-1 font-semibold" style={{ color: '#3d2c1e' }}>
                    下游共 {descendantCount} 个节点
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wide" style={{ color: '#8a7363' }}>
                    上游路径
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {upstreamPathIds.map((id) => {
                      const itemColor = colorById.get(id) ?? DEFAULT_COLOR;
                      return (
                        <span
                          key={id}
                          className="px-2 py-1 rounded-md text-xs border"
                          style={{ borderColor: `${itemColor}52`, background: `${itemColor}14`, color: '#4a3628' }}
                        >
                          {nodeById.get(id)?.label ?? id}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wide" style={{ color: '#8a7363' }}>
                    直接依赖
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {directDependencyIds.length > 0 ? (
                      directDependencyIds.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelectedNodeId(id)}
                          className="w-full px-2.5 py-2 rounded-lg border text-left text-xs"
                          style={{ borderColor: '#f0e4d4', background: '#ffffff', color: '#5f4b3d' }}
                        >
                          {nodeById.get(id)?.label ?? id}
                        </button>
                      ))
                    ) : (
                      <div className="text-xs" style={{ color: '#9a8575' }}>
                        无直接下游依赖
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm" style={{ color: '#9a8575' }}>
                请选择节点查看业务信息
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
