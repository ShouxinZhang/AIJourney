import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react';
import { DEFAULT_COLOR } from '../constants';
import type { KnowledgeNode, ViewMode } from '../types';

interface CenterPanelProps {
  viewMode: ViewMode;
  selectedNode: KnowledgeNode | null;
  isLeafSelected: boolean;
  hasReadableContent: boolean;
  upstreamPathIds: string[];
  getNodeLabel: (nodeId: string) => string;
  directDependencyIds: string[];
  childrenById: Map<string, string[]>;
  colorById: Map<string, string>;
  expanded: Set<string>;
  onSelectNode: (nodeId: string) => void;
  onToggleExpand: (nodeId: string) => void;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onGraphNodeClick: NodeMouseHandler;
  nodeTypes: NodeTypes;
  getNodeById: (nodeId: string) => KnowledgeNode | undefined;
}

const markdownComponents: Components = {
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
};

export function CenterPanel({
  viewMode,
  selectedNode,
  isLeafSelected,
  hasReadableContent,
  upstreamPathIds,
  getNodeLabel,
  directDependencyIds,
  childrenById,
  colorById,
  expanded,
  onSelectNode,
  onToggleExpand,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onGraphNodeClick,
  nodeTypes,
  getNodeById,
}: CenterPanelProps) {
  return (
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
              {upstreamPathIds.map((id) => getNodeLabel(id)).join(' / ') || '请选择左侧节点查看内容'}
            </p>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {isLeafSelected ? (
              hasReadableContent ? (
                <article
                  className="knowledge-markdown knowledge-markdown-article rounded-xl border bg-white px-5 py-4"
                  style={{ borderColor: '#f0e4d4' }}
                >
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
                  const child = getNodeById(childId);
                  if (!child) return null;
                  const childHasChildren = (childrenById.get(childId) ?? []).length > 0;
                  const childColor = colorById.get(childId) ?? DEFAULT_COLOR;

                  return (
                    <div
                      key={childId}
                      className="w-full rounded-xl border px-4 py-3 flex items-start justify-between gap-3"
                      style={{ borderColor: '#f0e4d4', background: '#ffffff' }}
                    >
                      <button type="button" onClick={() => onSelectNode(childId)} className="text-left flex-1">
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
                            onSelectNode(childId);
                            onToggleExpand(childId);
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
            onNodeClick={onGraphNodeClick}
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
  );
}
