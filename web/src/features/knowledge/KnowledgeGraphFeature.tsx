import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { knowledgeTree } from '../../data/knowledge-tree';
import { createKnowledgeNode, deleteKnowledgeNode } from './api/knowledge-api';
import { useKnowledgeGraphState } from './hooks/useKnowledgeGraphState';
import { appendChildNode, removeNode } from './model/tree-mutations';
import { DetailPanel } from './ui/DetailPanel';
import { FolderPanel } from './ui/FolderPanel';
import { CenterPanel } from './ui/CenterPanel';
import { FolderContextMenu } from './ui/context/FolderContextMenu';
import { ConfirmDialog } from './ui/dialogs/ConfirmDialog';
import { CreateNodeDialog } from './ui/dialogs/CreateNodeDialog';
import { knowledgeNodeTypes } from './ui/nodeTypes';
import type { FolderRow, KnowledgeNode, NodeKind } from './types';

interface FolderContextMenuState {
  x: number;
  y: number;
  row: FolderRow;
}

export default function KnowledgeGraphFeature() {
  const [tree, setTree] = useState<KnowledgeNode[]>(() => knowledgeTree);
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
  } = useKnowledgeGraphState(tree);

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
  const [createTargetRow, setCreateTargetRow] = useState<FolderRow | null>(null);
  const [createKind, setCreateKind] = useState<NodeKind>('node');
  const [deleteTargetRow, setDeleteTargetRow] = useState<FolderRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

  const handleCreateChild = useCallback(async (label: string) => {
    if (!createTargetRow) return;
    try {
      setIsCreating(true);
      setCreateError(null);
      const created = await createKnowledgeNode({
        label: label.trim(),
        parentId: createTargetRow.id,
        kind: createKind,
      });

      setTree((prevTree) => appendChildNode(prevTree, {
        id: created.id,
        label: created.label,
        kind: created.kind,
        parentId: createTargetRow.id,
        color: createTargetRow.color,
      }));

      if (!expanded.has(createTargetRow.id)) {
        toggleExpand(createTargetRow.id);
      }
      setSelectedNodeId(created.id);
      setCreateTargetRow(null);
      setCreateKind('node');
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsCreating(false);
    }
  }, [createKind, createTargetRow, expanded, setSelectedNodeId, toggleExpand]);

  const handleDeleteToTrash = useCallback(async () => {
    if (!deleteTargetRow) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteKnowledgeNode(deleteTargetRow.id);
      setTree((prevTree) => removeNode(prevTree, deleteTargetRow.id).tree);
      setDeleteTargetRow(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTargetRow]);

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
        <FolderContextMenu
          ref={contextMenuRef}
          x={contextMenu.x}
          y={contextMenu.y}
          row={contextMenu.row}
          onCreateFolder={() => {
            setContextMenu(null);
            setCreateKind('folder');
            setCreateError(null);
            setCreateTargetRow(contextMenu.row);
          }}
          onCreateNode={() => {
            setContextMenu(null);
            setCreateKind('node');
            setCreateError(null);
            setCreateTargetRow(contextMenu.row);
          }}
          onDelete={() => {
            setContextMenu(null);
            setDeleteError(null);
            setDeleteTargetRow(contextMenu.row);
          }}
        />
      )}

      <CreateNodeDialog
        open={!!createTargetRow}
        mode={createKind}
        parentLabel={createTargetRow?.label ?? ''}
        accentColor={createTargetRow?.color}
        isSubmitting={isCreating}
        errorMessage={createError}
        onCancel={() => {
          if (isCreating) return;
          setCreateTargetRow(null);
          setCreateKind('node');
          setCreateError(null);
        }}
        onSubmit={(label) => {
          void handleCreateChild(label);
        }}
      />

      <ConfirmDialog
        open={!!deleteTargetRow}
        title="删除到垃圾桶"
        message={deleteTargetRow
          ? deleteTargetRow.depth === 0
            ? `确定要把根目录「${deleteTargetRow.label}」删除到垃圾桶吗？`
            : `确定要把「${deleteTargetRow.label}」删除到垃圾桶吗？`
          : ''
        }
        confirmLabel="删除节点"
        cancelLabel="取消"
        accentColor="#ef4444"
        isSubmitting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => {
          if (isDeleting) return;
          setDeleteTargetRow(null);
          setDeleteError(null);
        }}
        onConfirm={() => {
          void handleDeleteToTrash();
        }}
      />
    </div>
  );
}
