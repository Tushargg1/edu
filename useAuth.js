import Button from './Button';

/**
 * Reusable empty state placeholder with icon, message, and optional action.
 */
export default function EmptyState({
  icon,
  title = 'Nothing here yet',
  message,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center py-16 px-8 text-center
        ${className}
      `}
    >
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-primary-lt text-primary flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-text-pri font-sans mb-1">
        {title}
      </h3>
      {message && (
        <p className="text-sm text-text-sec font-sans max-w-sm">{message}</p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="default"
          className="mt-6"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
