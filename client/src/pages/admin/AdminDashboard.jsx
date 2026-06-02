import { useGetAdminDashboardQuery } from '../../store/api/dashboardApi';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import DataTable from '../../components/common/DataTable';

const EVENT_TYPE_BADGE = {
  Holiday: 'holiday',
  Exam: 'exam',
  School_Event: 'event',
  PTM: 'ptm',
  Vacation: 'vacation',
};

export default function AdminDashboard() {
  const { data, isLoading, error } = useGetAdminDashboardQuery();
  const d = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-6 h-32 animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-border p-6 h-64 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-lt text-danger rounded-2xl p-6 text-sm font-sans">
        Failed to load dashboard data. Please try again.
      </div>
    );
  }

  const recentColumns = [
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <div>
          <p className="font-medium text-text-pri">{row.name}</p>
          <p className="text-xs text-text-muted mt-0.5">
            {row.teacherId ? 'Teacher' : 'Student'}
          </p>
        </div>
      ),
    },
    {
      key: 'id',
      label: 'ID',
      mono: true,
      render: (row) => row.teacherId || row.studentId || '—',
    },
    {
      key: 'class',
      label: 'Class',
      render: (row) =>
        row.class ? `${row.class} ${row.section || ''}` : '—',
    },
    {
      key: 'createdAt',
      label: 'Added',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          }
          iconBg="bg-primary-lt"
          iconColor="text-primary"
          value={d?.totalTeachers ?? 0}
          label="Total Teachers"
        />
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
          }
          iconBg="bg-[#EDE9FE]"
          iconColor="text-indigo"
          value={d?.totalStudents ?? 0}
          label="Total Students"
        />
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          }
          iconBg="bg-success-lt"
          iconColor="text-success"
          value={`${d?.todayAttendancePercentage ?? 0}%`}
          label="Today's Attendance"
        />
        <StatCard
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          }
          iconBg="bg-warning-lt"
          iconColor="text-warning"
          value={d?.upcomingEvents?.length ?? 0}
          label="Upcoming Events"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-border p-6">
          <h2 className="text-base font-semibold text-text-pri font-sans mb-4">
            Upcoming Events
          </h2>
          {d?.upcomingEvents?.length > 0 ? (
            <div className="space-y-3">
              {d.upcomingEvents.slice(0, 6).map((event) => (
                <div
                  key={event._id}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-lt text-primary flex items-center justify-center text-xs font-bold font-sans shrink-0">
                    {new Date(event.startDate).getDate()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-pri truncate">
                      {event.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={EVENT_TYPE_BADGE[event.eventType] || 'info'}>
                        {event.eventType?.replace('_', ' ')}
                      </Badge>
                      <span className="text-[11px] text-text-muted">
                        {new Date(event.startDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted font-sans">No upcoming events</p>
          )}
        </div>

        {/* Recent Accounts */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold text-text-pri font-sans mb-4">
            Recently Added
          </h2>
          <DataTable
            columns={recentColumns}
            data={d?.recentAccounts || []}
            emptyMessage="No recent accounts"
          />
        </div>
      </div>
    </div>
  );
}
