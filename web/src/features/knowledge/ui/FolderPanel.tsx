import type { MouseEvent } from 'react';
import type { FolderRow } from '../types';

interface FolderPanelProps {
  rows: FolderRow[];
  expanded: Set<string>;
  selectedNodeId: string | null;
  onToggleExpand: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onRowContextMenu?: (event: MouseEvent<HTMLButtonElement>, row: FolderRow) => void;
}

export function FolderPanel({
  rows,
  expanded,
  selectedNodeId,
  onToggleExpand,
  onSelectNode,
  onRowContextMenu,
}: FolderPanelProps) {
  return (
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
        {rows.map((row) => {
          const isExpanded = expanded.has(row.id);
          const isSelected = selectedNodeId === row.id;

          return (
            <div key={row.id} className="flex items-center gap-1 py-0.5" style={{ paddingLeft: `${row.depth * 14}px` }}>
              {row.hasChildren ? (
                <button
                  type="button"
                  onClick={() => onToggleExpand(row.id)}
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
                onClick={() => onSelectNode(row.id)}
                onContextMenu={(event) => onRowContextMenu?.(event, row)}
                className="flex-1 text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 text-sm"
                style={{
                  background: isSelected ? `${row.color}16` : 'transparent',
                  color: isSelected ? '#3d2c1e' : '#6f5a4a',
                  border: isSelected ? `1px solid ${row.color}4d` : '1px solid transparent',
                }}
              >
                <span>{row.isFolder ? (isExpanded ? '📂' : '📁') : '📄'}</span>
                <span className="truncate">{row.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
