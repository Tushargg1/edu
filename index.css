import { useState } from 'react';

/**
 * Reusable Input component following EduSync design system.
 * Supports label, error, hint, icon prefix, and show/hide toggle for passwords.
 */
export default function Input({
  label,
  error,
  hint,
  icon,
  type = 'text',
  className = '',
  id,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const borderColor = error
    ? 'border-danger focus:ring-danger/10'
    : 'border-border focus:border-primary focus:ring-primary/10';

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-[13px] font-medium text-text-pri font-sans"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={inputType}
          className={`
            w-full rounded-[10px] bg-white
            border-[1.5px] ${borderColor}
            px-3.5 py-2.5 text-sm font-sans text-text-pri
            placeholder:text-text-muted
            focus:outline-none focus:ring-[3px]
            disabled:bg-surface disabled:opacity-60
            transition-all duration-150
            ${icon ? 'pl-[38px]' : ''}
            ${isPassword ? 'pr-10' : ''}
          `}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-sec transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-danger font-sans">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-text-muted font-sans">{hint}</p>
      )}
    </div>
  );
}
