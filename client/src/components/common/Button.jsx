const VARIANT_CLASSES = {
  primary:
    'bg-primary text-white shadow-[0_8px_24px_rgba(37,99,235,0.20)] hover:bg-primary-dk',
  secondary: 'bg-primary-lt text-primary hover:bg-blue-200',
  ghost:
    'bg-transparent text-text-sec border border-border hover:bg-gray-50',
  danger:
    'bg-danger-lt text-danger border border-red-200 hover:bg-red-100',
  success:
    'bg-success-lt text-success border border-green-200 hover:bg-green-100',
};

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  default: 'px-[18px] py-[9px] text-sm rounded-[10px]',
  lg: 'px-7 py-[13px] text-base rounded-[10px]',
};

/**
 * Reusable Button component following EduSync design system.
 * Variants: primary | secondary | ghost | danger | success
 * Sizes: sm | default | lg
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        font-sans font-medium transition-all duration-150 ease-in-out
        hover:-translate-y-[1px] active:translate-y-0
        disabled:opacity-50 disabled:pointer-events-none
        cursor-pointer
        ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary}
        ${SIZE_CLASSES[size] || SIZE_CLASSES.default}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
