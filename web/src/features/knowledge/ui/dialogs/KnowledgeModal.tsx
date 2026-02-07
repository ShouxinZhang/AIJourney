import { useEffect, type ReactNode } from 'react';

interface KnowledgeModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  accentColor?: string;
  footer?: ReactNode;
  disableClose?: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function KnowledgeModal({
  open,
  title,
  subtitle,
  accentColor = '#f59e0b',
  footer,
  disableClose = false,
  onClose,
  children,
}: KnowledgeModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !disableClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onEsc);
    };
  }, [disableClose, onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 80 }}>
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(32, 24, 16, 0.38)', backdropFilter: 'blur(3px)' }}
        onMouseDown={() => {
          if (!disableClose) onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl border overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #fffdfa 0%, #fff8ef 100%)',
          borderColor: `${accentColor}5c`,
          boxShadow: '0 20px 40px rgba(68, 45, 26, 0.22)',
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          className="h-1.5"
          style={{ background: `linear-gradient(90deg, ${accentColor} 0%, #ffd27d 100%)` }}
        />

        <div className="px-6 pt-5 pb-4">
          <h3
            className="text-xl font-semibold"
            style={{ color: '#3d2c1e', fontFamily: "'Noto Serif SC', serif", letterSpacing: '0.02em' }}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-sm" style={{ color: '#8a7363' }}>
              {subtitle}
            </p>
          )}
          <div className="mt-4">{children}</div>
        </div>

        {footer && (
          <div
            className="px-6 py-4 border-t flex items-center justify-end gap-3"
            style={{ borderColor: '#f4ebde', background: 'rgba(255, 252, 245, 0.85)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
