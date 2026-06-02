import { useGetStudentDashboardQuery } from '../../store/api/dashboardApi';
import useAuth from '../../hooks/useAuth';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';

const EVENT_BADGE = {
  Holiday: 'holiday', Exam: 'exam', School_Event: 'event', PTM: 'ptm', Vacation: 'vacation',
};

export default function StudentDashboard() {
  const { data, isLoading, error } = useGetStudentDashboardQuery();
  const { user } = useAuth();
  const d = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-6 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-lt text-danger rounded-2xl p-6 text-sm font-sans">
        Failed to load dashboard data.
      </div>
    );
  }

  const att = d?.attendance || {};

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          }
          iconBg="bg-success-lt"
          iconColor="text-success"
          value={`${att.percentage ?? 0}%`}
          label="Attendance Rate"
        />
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          }
          iconBg="bg-primary-lt"
          iconColor="text-primary"
          value={att.present ?? 0}
          label="Days Present"
        />
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          }
          iconBg="bg-danger-lt"
          iconColor="text-danger"
          value={att.absent ?? 0}
          label="Days Absent"
        />
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          }
          iconBg="bg-warning-lt"
          iconColor="text-warning"
          value={att.late ?? 0}
          label="Days Late"
        />
      </div>

      {/* Attendance Visual */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="text-base font-semibold text-text-pri font-sans mb-4">
          This Month's Attendance
        </h2>
        <div className="flex items-center gap-6">
          {/* Donut-like visual */}
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="40"
                stroke="#E2E8F0" strokeWidth="12" fill="none"
              />
              <circle
                cx="50" cy="50" r="40"
                stroke="#10B981" strokeWidth="12" fill="none"
                strokeDasharray={`${(att.percentage || 0) * 2.51} 251`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-text-pri font-sans">
                {att.percentage ?? 0}%
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm font-sans text-text-sec">Present: {att.present ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-danger" />
              <span className="text-sm font-sans text-text-sec">Absent: {att.absent ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span className="text-sm font-sans text-text-sec">Late: {att.late ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-border" />
              <span className="text-sm font-sans text-text-sec">Total: {att.total ?? 0} days</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="text-base font-semibold text-text-pri font-sans mb-4">
            Upcoming Events
          </h2>
          {d?.upcomingEvents?.length > 0 ? (
            <div className="space-y-3">
              {d.upcomingEvents.slice(0, 6).map((event) => (
                <div key={event._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary-lt text-primary flex items-center justify-center text-xs font-bold font-sans shrink-0">
                    {new Date(event.startDate).getDate()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-pri truncate">{event.title}</p>
                    <Badge variant={EVENT_BADGE[event.eventType] || 'info'} className="mt-1">
                      {event.eventType?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No upcoming events</p>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="text-base font-semibold text-text-pri font-sans mb-4">
            Notifications
          </h2>
          {d?.recentNotifications?.length > 0 ? (
            <div className="space-y-3">
              {d.recentNotifications.map((n) => (
                <div key={n._id} className="p-3 rounded-xl hover:bg-surface transition-colors border-l-[3px] border-l-primary">
                  <p className="text-sm font-medium text-text-pri">{n.title}</p>
                  <p className="text-xs text-text-sec mt-1">{n.body}</p>
                  <p className="text-[11px] text-text-muted mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No notifications yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
