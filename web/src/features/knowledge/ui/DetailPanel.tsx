import { DEFAULT_COLOR } from '../constants';
import type { KnowledgeNode } from '../types';

interface DetailPanelProps {
  selectedNode: KnowledgeNode | null;
  isLeafSelected: boolean;
  hasReadableContent: boolean;
  selectedNodeColor: string;
  descendantCount: number;
  upstreamPathIds: string[];
  directDependencyIds: string[];
  getNodeLabel: (nodeId: string) => string;
  getNodeColor: (nodeId: string) => string;
  onSelectNode: (nodeId: string) => void;
}

export function DetailPanel({
  selectedNode,
  isLeafSelected,
  hasReadableContent,
  selectedNodeColor,
  descendantCount,
  upstreamPathIds,
  directDependencyIds,
  getNodeLabel,
  getNodeColor,
  onSelectNode,
}: DetailPanelProps) {
  return (
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

            <div
              className="rounded-xl border px-3 py-2.5"
              style={{ borderColor: `${selectedNodeColor}4d`, background: '#fffdf8' }}
            >
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
                  const itemColor = getNodeColor(id) || DEFAULT_COLOR;
                  return (
                    <span
                      key={id}
                      className="px-2 py-1 rounded-md text-xs border"
                      style={{ borderColor: `${itemColor}52`, background: `${itemColor}14`, color: '#4a3628' }}
                    >
                      {getNodeLabel(id)}
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
                      onClick={() => onSelectNode(id)}
                      className="w-full px-2.5 py-2 rounded-lg border text-left text-xs"
                      style={{ borderColor: '#f0e4d4', background: '#ffffff', color: '#5f4b3d' }}
                    >
                      {getNodeLabel(id)}
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
  );
}
