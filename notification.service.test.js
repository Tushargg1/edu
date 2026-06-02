/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:      '#2563EB',
        'primary-dk': '#1D4ED8',
        'primary-lt': '#DBEAFE',
        sky:          '#0EA5E9',
        indigo:       '#6366F1',
        success:      '#10B981',
        'success-lt': '#DCFCE7',
        warning:      '#F59E0B',
        'warning-lt': '#FEF3C7',
        danger:       '#EF4444',
        'danger-lt':  '#FEF2F2',
        sidebar:      '#0F172A',
        'text-pri':   '#0F172A',
        'text-sec':   '#475569',
        'text-muted': '#94A3B8',
        border:       '#E2E8F0',
        surface:      '#F8FAFC',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
