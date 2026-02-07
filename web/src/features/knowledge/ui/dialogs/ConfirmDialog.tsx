import { KnowledgeModal } from './KnowledgeModal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel?: string;
  accentColor?: string;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  cancelLabel = '取消',
  confirmLabel = '确认',
  accentColor = '#ef4444',
  isSubmitting = false,
  errorMessage,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <KnowledgeModal
      open={open}
      title={title}
      subtitle="该操作会影响当前节点及其可见状态"
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
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: isSubmitting ? '#f2cece' : accentColor,
              color: '#fff',
              boxShadow: isSubmitting ? 'none' : '0 6px 14px rgba(220, 38, 38, 0.24)',
            }}
          >
            {isSubmitting ? '处理中...' : confirmLabel}
          </button>
        </>
      )}
    >
      <div className="space-y-3">
        <p className="text-sm leading-6" style={{ color: '#5b4536' }}>
          {message}
        </p>
        {errorMessage && (
          <p className="text-sm rounded-lg px-3 py-2 border" style={{ color: '#a53e2b', borderColor: '#f5c6bb', background: '#fff3f0' }}>
            操作失败: {errorMessage}
          </p>
        )}
      </div>
    </KnowledgeModal>
  );
}
