const VARIANT_CLASSES = {
  present:   'bg-success-lt text-[#15803D]',
  absent:    'bg-danger-lt text-[#B91C1C]',
  pending:   'bg-warning-lt text-[#92400E]',
  submitted: 'bg-primary-lt text-[#1E40AF]',
  ptm:       'bg-[#EDE9FE] text-[#6D28D9]',
  holiday:   'bg-[#F1F5F9] text-text-sec',
  exam:      'bg-[#FFF7ED] text-[#C2410C]',
  event:     'bg-[#ECFDF5] text-[#065F46]',
  vacation:  'bg-[#F0F9FF] text-[#0369A1]',
  info:      'bg-primary-lt text-primary',
  late:      'bg-warning-lt text-[#92400E]',
};

/**
 * Pill-shaped status badge.
 * Variants: present | absent | pending | submitted | ptm | holiday | exam | event | vacation | info | late
 */
export default function Badge({
  children,
  variant = 'info',
  className = '',
}) {
  return (
    <span
      className={`
        inline-flex items-center
        rounded-full px-2.5 py-[3px]
        text-xs font-medium font-sans
        ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.info}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
