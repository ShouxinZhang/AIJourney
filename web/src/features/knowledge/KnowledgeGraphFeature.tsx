import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { knowledgeTree } from '../../data/knowledge-tree';
import { useKnowledgeGraphState } from './hooks/useKnowledgeGraphState';
import { DetailPanel } from './ui/DetailPanel';
import { FolderPanel } from './ui/FolderPanel';
import { CenterPanel } from './ui/CenterPanel';
import { knowledgeNodeTypes } from './ui/nodeTypes';
import type { FolderRow } from './types';

interface FolderContextMenuState {
  x: number;
  y: number;
  row: FolderRow;
}

export default function KnowledgeGraphFeature() {
  const {
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
  } = useKnowledgeGraphState(knowledgeTree);

  const getNodeLabel = useCallback(
    (nodeId: string) => nodeById.get(nodeId)?.label ?? nodeId,
    [nodeById],
  );

  const getNodeById = useCallback(
    (nodeId: string) => nodeById.get(nodeId),
    [nodeById],
  );

  const getNodeColor = useCallback(
    (nodeId: string) => colorById.get(nodeId) ?? '',
    [colorById],
  );

  const [contextMenu, setContextMenu] = useState<FolderContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const isLocalEditable = import.meta.env.DEV;

  useEffect(() => {
    if (!contextMenu) return undefined;

    const onGlobalMouseDown = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && contextMenuRef.current?.contains(target)) {
        return;
      }
      setContextMenu(null);
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };

    window.addEventListener('mousedown', onGlobalMouseDown);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onGlobalMouseDown);
      window.removeEventListener('keydown', onEsc);
    };
  }, [contextMenu]);

  const callApi = useCallback(async (url: string, init: RequestInit, failedMessage: string) => {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.message || failedMessage);
    }
    return payload;
  }, []);

  const handleCreateChild = useCallback(async (row: FolderRow) => {
    const label = window.prompt('请输入新节点名称');
    if (!label || !label.trim()) return;

    try {
      await callApi(
        '/api/knowledge/nodes',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: label.trim(), parentId: row.id }),
        },
        '创建节点失败',
      );
      window.location.reload();
    } catch (error) {
      window.alert(`创建失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [callApi]);

  const handleDeleteToTrash = useCallback(async (row: FolderRow) => {
    const confirmText = row.depth === 0
      ? `确定要把根目录「${row.label}」删除到垃圾桶吗？`
      : `确定要把「${row.label}」删除到垃圾桶吗？`;
    if (!window.confirm(confirmText)) return;

    try {
      await callApi(
        `/api/knowledge/nodes/${encodeURIComponent(row.id)}`,
        { method: 'DELETE' },
        '删除节点失败',
      );
      window.location.reload();
    } catch (error) {
      window.alert(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [callApi]);

  const handleRowContextMenu = useCallback((event: MouseEvent<HTMLButtonElement>, row: FolderRow) => {
    if (!isLocalEditable) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedNodeId(row.id);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      row,
    });
  }, [isLocalEditable, setSelectedNodeId]);

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
            {isLocalEditable && (
              <p className="text-xs mt-1" style={{ color: '#af9884' }}>
                提示: 左侧节点支持右键新增/删除到垃圾桶（同步 PostgreSQL）
              </p>
            )}
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
        <FolderPanel
          rows={folderRows}
          expanded={expanded}
          selectedNodeId={selectedNodeId}
          onToggleExpand={toggleExpand}
          onSelectNode={setSelectedNodeId}
          onRowContextMenu={handleRowContextMenu}
        />

        <CenterPanel
          viewMode={viewMode}
          selectedNode={selectedNode}
          isLeafSelected={isLeafSelected}
          hasReadableContent={hasReadableContent}
          upstreamPathIds={upstreamPathIds}
          getNodeLabel={getNodeLabel}
          directDependencyIds={directDependencyIds}
          childrenById={childrenById}
          colorById={colorById}
          expanded={expanded}
          onSelectNode={setSelectedNodeId}
          onToggleExpand={toggleExpand}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onGraphNodeClick={handleGraphNodeClick}
          nodeTypes={knowledgeNodeTypes}
          getNodeById={getNodeById}
        />

        <DetailPanel
          selectedNode={selectedNode}
          isLeafSelected={isLeafSelected}
          hasReadableContent={hasReadableContent}
          selectedNodeColor={selectedNodeColor}
          descendantCount={descendantCount}
          upstreamPathIds={upstreamPathIds}
          directDependencyIds={directDependencyIds}
          getNodeLabel={getNodeLabel}
          getNodeColor={getNodeColor}
          onSelectNode={setSelectedNodeId}
        />
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-44 rounded-lg border bg-white shadow-lg p-1"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 210),
            top: Math.min(contextMenu.y, window.innerHeight - 120),
            borderColor: '#f0e4d4',
          }}
        >
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[#fff6ea]"
            onClick={() => {
              setContextMenu(null);
              void handleCreateChild(contextMenu.row);
            }}
          >
            新建子节点
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[#fff2ee] text-[#a54b2a]"
            onClick={() => {
              setContextMenu(null);
              void handleDeleteToTrash(contextMenu.row);
            }}
          >
            删除到垃圾桶
          </button>
        </div>
      )}
    </div>
  );
}
