/**
 * Reusable sortable data table.
 * Accepts columns config and row data. Renders empty state when no data.
 */
export default function DataTable({
  columns,
  data = [],
  onRowClick,
  emptyMessage = 'No data found',
  emptyIcon,
  className = '',
}) {
  if (!data.length) {
    return (
      <div className={`bg-white rounded-2xl border border-border p-12 text-center ${className}`}>
        {emptyIcon && (
          <div className="flex justify-center mb-4 text-text-muted">
            {emptyIcon}
          </div>
        )}
        <p className="text-text-muted text-sm font-sans">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-border overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`
                    px-6 py-3 text-left text-xs font-medium font-sans
                    text-text-muted uppercase tracking-wider
                    ${col.className || ''}
                  `}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, idx) => (
              <tr
                key={row._id || row.id || idx}
                onClick={() => onRowClick?.(row)}
                className={`
                  transition-colors duration-150
                  ${onRowClick ? 'cursor-pointer hover:bg-blue-50/50' : 'hover:bg-gray-50/50'}
                `}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`
                      px-6 py-4 text-sm font-sans text-text-pri
                      ${col.mono ? 'font-mono text-[13px]' : ''}
                      ${col.cellClassName || ''}
                    `}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
