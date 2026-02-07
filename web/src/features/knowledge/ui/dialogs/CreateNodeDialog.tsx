import { useEffect, useMemo, useState } from 'react';
import { KnowledgeModal } from './KnowledgeModal';
import type { NodeKind } from '../../types';

interface CreateNodeDialogProps {
  open: boolean;
  mode: NodeKind;
  parentLabel: string;
  accentColor?: string;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (label: string) => void;
}

export function CreateNodeDialog({
  open,
  mode,
  parentLabel,
  accentColor = '#f59e0b',
  isSubmitting = false,
  errorMessage,
  onCancel,
  onSubmit,
}: CreateNodeDialogProps) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (open) {
      setLabel('');
    }
  }, [open]);

  const isFolderMode = mode === 'folder';
  const title = isFolderMode ? '新建文件夹' : '新建子节点';
  const subtitle = isFolderMode
    ? '在当前目录下创建新的知识文件夹'
    : '在当前目录下创建新的知识节点';
  const labelText = isFolderMode ? '文件夹名称' : '节点名称';
  const submitText = isFolderMode ? '创建文件夹' : '创建节点';
  const placeholder = isFolderMode ? '例如：Agent 架构设计' : '例如：Prompt 评估框架';

  const trimmedLabel = useMemo(() => label.trim(), [label]);
  const submitDisabled = isSubmitting || trimmedLabel.length === 0;

  return (
    <KnowledgeModal
      open={open}
      title={title}
      subtitle={subtitle}
      accentColor={accentColor}
      disableClose={isSubmitting}
      onClose={onCancel}
      footer={(
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
            style={{
              borderColor: '#e5d8c8',
              background: '#fff',
              color: '#6f5a4a',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onSubmit(trimmedLabel)}
            disabled={submitDisabled}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: submitDisabled ? '#e8dccb' : accentColor,
              color: submitDisabled ? '#9d8572' : '#fff',
              boxShadow: submitDisabled ? 'none' : '0 6px 14px rgba(245, 158, 11, 0.28)',
            }}
          >
            {isSubmitting ? '创建中...' : submitText}
          </button>
        </>
      )}
    >
      <div className="space-y-3">
        <div
          className="inline-flex max-w-full items-center px-2.5 py-1 rounded-full text-xs border"
          style={{ background: '#fff6e9', borderColor: '#f4d6a8', color: '#7c5b41' }}
        >
          <span className="truncate">父目录: {parentLabel}</span>
        </div>
        <label className="block text-sm font-medium" style={{ color: '#5b4536' }}>
          {labelText}
        </label>
        <input
          autoFocus
          type="text"
          value={label}
          maxLength={80}
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !submitDisabled) {
              onSubmit(trimmedLabel);
            }
          }}
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{
            borderColor: '#e6d3bb',
            background: '#fff',
            color: '#3d2c1e',
            boxShadow: 'inset 0 1px 2px rgba(94, 66, 44, 0.08)',
          }}
          placeholder={placeholder}
        />
        {errorMessage && (
          <p className="text-sm rounded-lg px-3 py-2 border" style={{ color: '#a53e2b', borderColor: '#f5c6bb', background: '#fff3f0' }}>
            创建失败: {errorMessage}
          </p>
        )}
      </div>
    </KnowledgeModal>
  );
}
