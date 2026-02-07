import { Handle, Position, type NodeProps } from '@xyflow/react';
import { HIDDEN_HANDLE_STYLE, NODE_HEIGHT } from '../constants';
import { getFruitIcon } from '../model/graph-layout';

export function KnowledgeFlowNode({ id, data }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const color = nodeData.color as string;
  const hasChildren = nodeData.hasChildren as boolean;
  const isExpanded = nodeData.isExpanded as boolean;
  const depth = (nodeData.depth as number) ?? 0;
  const isRoot = depth === 0;
  const fruit = getFruitIcon(id, depth);
  const isSelected = nodeData.isSelected as boolean;

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
            {nodeData.label as string}
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
