import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  ConnectionMode,
  Background,
  Controls,
  MiniMap,
  Panel,
  type NodeMouseHandler,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { knowledgeTree, type KnowledgeNode } from '../data/knowledge-tree';

/* ── 布局常量 ── */
const NODE_WIDTH = 210;
const NODE_HEIGHT = 54;
const H_GAP = 50;
const V_GAP = 76;

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
    const color = node.color ?? parentColor ?? '#f97316';
    const width = subtreeWidth(node, expanded);
    const x = offsetX + width / 2 - NODE_WIDTH / 2;
    const y = startY;

    const hasChildren = !!node.children?.length;
    const isExpanded = expanded.has(node.id);

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
      },
      type: 'knowledgeNode',
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
    });

    if (parentId) {
      flowEdges.push({
        id: `${parentId}->${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        style: { stroke: color, strokeWidth: 1.5, opacity: 0.45 },
      });
    }

    if (hasChildren && isExpanded) {
      const { flowNodes: childNodes, flowEdges: childEdges } = buildGraph(
        node.children!,
        expanded,
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

  return (
    <div
      className="relative cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5"
      style={{ minHeight: NODE_HEIGHT }}
    >
      {/* 卡片主体 */}
      <div
        className="rounded-xl px-4 py-2.5 h-full flex items-center gap-2.5 transition-shadow duration-200"
        style={{
          background: isRoot
            ? `linear-gradient(135deg, ${color}, ${color}cc)`
            : '#ffffff',
          border: isRoot ? 'none' : `1.5px solid ${color}40`,
          boxShadow: isRoot
            ? `0 4px 16px ${color}30, 0 1px 3px ${color}20`
            : `0 1px 8px rgba(180,140,90,0.08), 0 1px 2px rgba(0,0,0,0.04)`,
        }}
      >
        {/* 水果图标 */}
        <span className="text-base flex-shrink-0" style={{ filter: isRoot ? 'brightness(1.1)' : 'none' }}>
          {fruit}
        </span>

        {/* 文字 */}
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

        {/* 左侧彩色条（非根节点） */}
        {!isRoot && (
          <div
            className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
            style={{ background: color }}
          />
        )}
      </div>

      {/* 展开/折叠指示 */}
      {hasChildren && (
        <div
          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-[22px] h-[22px] rounded-full flex items-center justify-center text-xs font-bold border-2 transition-transform duration-200"
          style={{
            background: '#ffffff',
            borderColor: color,
            color: color,
            transform: `translateX(-50%) ${isExpanded ? 'rotate(0deg)' : 'rotate(0deg)'}`,
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
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) {
          const removeDescendants = (id: string, tree: KnowledgeNode[]) => {
            for (const n of tree) {
              if (n.id === id) {
                next.delete(id);
                const removeAll = (children?: KnowledgeNode[]) => {
                  children?.forEach((c) => {
                    next.delete(c.id);
                    removeAll(c.children);
                  });
                };
                removeAll(n.children);
                return;
              }
              if (n.children) removeDescendants(id, n.children);
            }
          };
          removeDescendants(node.id, knowledgeTree);
        } else {
          next.add(node.id);
        }
        return next;
      });
    },
    [],
  );

  const { flowNodes: computedNodes, flowEdges: computedEdges } = useMemo(
    () => buildGraph(knowledgeTree, expanded, undefined, 0, 0),
    [expanded],
  );

  // 受控节点/边状态：以 computed 值为基础，支持拖拽等交互变更
  const [nodes, setNodes] = useState<Node[]>(computedNodes);
  const [edges, setEdges] = useState<Edge[]>(computedEdges);

  // expanded 变化时同步节点和边（解决 useState 仅取初始值的问题）
  useMemo(() => {
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

  const [selectedNode, setSelectedNode] = useState<{ label: string; description?: string } | null>(null);

  const handleNodeClickWrapper: NodeMouseHandler = useCallback(
    (event, node) => {
      setSelectedNode({
        label: node.data.label as string,
        description: node.data.description as string | undefined,
      });
      handleNodeClick(event, node);
    },
    [handleNodeClick],
  );

  return (
    <div className="w-full h-screen" style={{ background: '#fefcf6' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClickWrapper}
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
          nodeColor={(n) => (n.data.color as string) ?? '#f97316'}
          maskColor="rgba(254,252,246,0.7)"
        />

        {/* 标题面板 */}
        <Panel position="top-left">
          <div
            className="rounded-2xl px-6 py-4 border"
            style={{
              background: 'rgba(255,255,255,0.92)',
              borderColor: '#f0e4d4',
              boxShadow: '0 2px 16px rgba(180,140,90,0.1)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <h1
              className="text-2xl font-bold"
              style={{
                fontFamily: "'Noto Serif SC', serif",
                color: '#3d2c1e',
                letterSpacing: '0.03em',
              }}
            >
              <span className="mr-2">📖</span>
              AI Journey
            </h1>
            <p className="text-sm mt-1.5" style={{ color: '#9a8575' }}>
              点击节点，展开知识图谱
            </p>
          </div>
        </Panel>

        {/* 知识点描述 */}
        {selectedNode?.description && (
          <Panel position="bottom-left">
            <div
              className="rounded-2xl px-6 py-4 border max-w-sm"
              style={{
                background: 'rgba(255,255,255,0.95)',
                borderColor: '#f0e4d4',
                boxShadow: '0 2px 16px rgba(180,140,90,0.1)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <h3
                className="text-base font-semibold"
                style={{ color: '#3d2c1e', fontFamily: "'Noto Serif SC', serif" }}
              >
                {selectedNode.label}
              </h3>
              <p className="text-sm mt-1.5 leading-relaxed" style={{ color: '#7a6555' }}>
                {selectedNode.description}
              </p>
            </div>
          </Panel>
        )}

        {/* 图例 */}
        <Panel position="top-right">
          <div
            className="rounded-2xl px-5 py-3.5 border"
            style={{
              background: 'rgba(255,255,255,0.92)',
              borderColor: '#f0e4d4',
              boxShadow: '0 2px 16px rgba(180,140,90,0.1)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex items-center gap-2.5">
                <span className="text-base">🍊</span>
                <span style={{ color: '#3d2c1e' }}>Vibe Coding Skills</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-base">🥝</span>
                <span style={{ color: '#3d2c1e' }}>Agent Dev</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-base">🫐</span>
                <span style={{ color: '#3d2c1e' }}>LLM Fundamental</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
