import { forwardRef } from 'react';
import type { FolderRow } from '../../types';

interface FolderContextMenuProps {
  x: number;
  y: number;
  row: FolderRow;
  onCreateFolder: () => void;
  onCreateNode: () => void;
  onDelete: () => void;
}

export const FolderContextMenu = forwardRef<HTMLDivElement, FolderContextMenuProps>(
  ({ x, y, row, onCreateFolder, onCreateNode, onDelete }, ref) => {
    const accentColor = row.color || '#f59e0b';
    const left = Math.min(x, window.innerWidth - 286);
    const top = Math.min(y, window.innerHeight - 260);

    return (
      <div
        ref={ref}
        className="fixed z-50 min-w-[260px] rounded-2xl border overflow-hidden"
        style={{
          left,
          top,
          borderColor: `${accentColor}59`,
          background: 'linear-gradient(160deg, #fffefa 0%, #fff8ee 100%)',
          boxShadow: '0 16px 30px rgba(74, 52, 31, 0.18)',
        }}
      >
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${accentColor} 0%, #ffd27d 100%)` }} />
        <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: '#f0e4d4' }}>
          <p className="text-xs tracking-wide" style={{ color: '#9b826f' }}>
            当前目录
          </p>
          <p className="mt-1 text-sm font-semibold truncate" style={{ color: '#4d3727' }}>
            {row.label}
          </p>
        </div>

        <div className="p-2 space-y-1.5">
          <button
            type="button"
            onClick={onCreateFolder}
            className="w-full text-left px-3 py-2.5 rounded-xl border transition-colors"
            style={{ borderColor: '#f6e5cc', background: '#fffdf8' }}
          >
            <p className="text-sm font-medium" style={{ color: '#4d3727' }}>
              🥝 新建文件夹
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#8d7463' }}>
              创建目录层级，容纳多个知识节点
            </p>
          </button>

          <button
            type="button"
            onClick={onCreateNode}
            className="w-full text-left px-3 py-2.5 rounded-xl border transition-colors"
            style={{ borderColor: '#f6e5cc', background: '#fffdf8' }}
          >
            <p className="text-sm font-medium" style={{ color: '#4d3727' }}>
              🍊 新建子节点
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#8d7463' }}>
              在该目录下新增知识主题
            </p>
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="w-full text-left px-3 py-2.5 rounded-xl border transition-colors"
            style={{ borderColor: '#f4d7d1', background: '#fff8f5' }}
          >
            <p className="text-sm font-medium" style={{ color: '#8d3b24' }}>
              🍓 删除到垃圾桶
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#9f6958' }}>
              节点与子树将进入可恢复状态
            </p>
          </button>
        </div>
      </div>
    );
  },
);

FolderContextMenu.displayName = 'FolderContextMenu';
