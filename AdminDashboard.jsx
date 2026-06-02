/**
 * Dashboard stat card with icon, value, label, and optional trend.
 * Follows design spec: 16px radius, shadow-sm, 1px border, 44×44 icon box.
 */
export default function StatCard({
  icon,
  iconBg = 'bg-primary-lt',
  iconColor = 'text-primary',
  value,
  label,
  trend,
  trendUp,
  className = '',
}) {
  return (
    <div
      className={`
        bg-white rounded-2xl border border-border p-6
        shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div
          className={`
            w-11 h-11 rounded-xl flex items-center justify-center
            ${iconBg} ${iconColor}
          `}
        >
          {icon}
        </div>
        {trend && (
          <span
            className={`
              text-xs font-medium font-sans flex items-center gap-1
              ${trendUp ? 'text-success' : 'text-danger'}
            `}
          >
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold font-sans text-text-pri">
          {value}
        </p>
        <p className="text-sm text-text-sec font-sans mt-1">{label}</p>
      </div>
    </div>
  );
}
