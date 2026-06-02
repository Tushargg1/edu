const VARIANT_CLASSES = {
  info:    'bg-primary-lt border-l-primary text-[#1E40AF]',
  success: 'bg-success-lt border-l-success text-[#166534]',
  warning: 'bg-warning-lt border-l-warning text-[#92400E]',
  danger:  'bg-danger-lt border-l-danger text-[#B91C1C]',
};

/**
 * Alert banner with left-border accent.
 * Variants: info | success | warning | danger
 */
export default function Alert({
  children,
  variant = 'info',
  className = '',
  onDismiss,
}) {
  return (
    <div
      className={`
        rounded-[10px] border-l-[3px] px-4 py-3
        text-sm font-sans
        ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.info}
        ${className}
      `}
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">{children}</div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-current opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}
