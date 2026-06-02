import { useGetCalendarEventsQuery } from '../../store/api/calendarApi';
import Badge from '../../components/common/Badge';

const EVENT_BADGE = {
  Holiday: 'holiday', Exam: 'exam', School_Event: 'event', PTM: 'ptm', Vacation: 'vacation',
};

/**
 * Read-only calendar view for teacher and student roles.
 */
export default function ReadOnlyCalendar() {
  const { data, isLoading } = useGetCalendarEventsQuery();
  const events = data?.data?.events || [];

  if (isLoading) {
    return <div className="bg-white rounded-2xl border border-border p-12 animate-pulse h-64" />;
  }

  // Group by month
  const grouped = {};
  events.forEach((ev) => {
    const d = new Date(ev.startDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ev);
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text-pri font-sans">Calendar</h2>

      {events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center text-sm text-text-muted font-sans">
          No calendar events
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([monthKey, monthEvents]) => {
            const [year, month] = monthKey.split('-');
            const monthName = new Date(year, month - 1).toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            });

            return (
              <div key={monthKey} className="bg-white rounded-2xl border border-border">
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="text-base font-semibold text-text-pri font-sans">
                    {monthName}
                  </h3>
                </div>
                <div className="divide-y divide-border">
                  {monthEvents.map((ev) => (
                    <div key={ev._id} className="px-6 py-4 flex items-center gap-4 hover:bg-surface transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-primary-lt text-primary flex flex-col items-center justify-center shrink-0">
                        <span className="text-lg font-bold leading-none">
                          {new Date(ev.startDate).getDate()}
                        </span>
                        <span className="text-[10px] uppercase">
                          {new Date(ev.startDate).toLocaleString('default', { month: 'short' })}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-pri">{ev.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={EVENT_BADGE[ev.eventType] || 'info'}>
                            {ev.eventType?.replace('_', ' ')}
                          </Badge>
                          <span className="text-[11px] text-text-muted">
                            {new Date(ev.startDate).toLocaleDateString()} — {new Date(ev.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="text-xs text-text-sec mt-1">{ev.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
      )}
    </div>
  );
}
