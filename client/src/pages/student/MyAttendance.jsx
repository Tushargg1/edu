import useAuth from '../../hooks/useAuth';
import { useGetStudentAttendanceQuery } from '../../store/api/attendanceApi';
import StatCard from '../../components/common/StatCard';

export default function MyAttendance() {
  const { user } = useAuth();
  const { data, isLoading } = useGetStudentAttendanceQuery(user?.userId, {
    skip: !user?.userId,
  });

  const d = data?.data;
  const cumulative = d?.cumulative || {};
  const months = d?.months || [];

  if (isLoading) {
    return <div className="bg-white rounded-2xl border border-border p-12 animate-pulse h-64" />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text-pri font-sans">
        My Attendance
      </h2>

      {/* Cumulative Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<span className="text-lg font-bold">%</span>}
          iconBg="bg-primary-lt" iconColor="text-primary"
          value={`${cumulative.percentage ?? 0}%`}
          label="Overall Rate"
        />
        <StatCard
          icon={<span className="text-lg">✓</span>}
          iconBg="bg-success-lt" iconColor="text-success"
          value={cumulative.present ?? 0}
          label="Present"
        />
        <StatCard
          icon={<span className="text-lg">✗</span>}
          iconBg="bg-danger-lt" iconColor="text-danger"
          value={cumulative.absent ?? 0}
          label="Absent"
        />
        <StatCard
          icon={<span className="text-lg">⏱</span>}
          iconBg="bg-warning-lt" iconColor="text-warning"
          value={cumulative.late ?? 0}
          label="Late"
        />
      </div>

      {/* Month-by-month */}
      {months.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center text-sm text-text-muted font-sans">
          No attendance records yet
        </div>
      ) : (
        months.map((month) => (
          <div key={month.month} className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-pri font-sans">
                {new Date(month.month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-medium text-text-pri">
                  {month.percentage}%
                </span>
                <div className="w-20 h-2 bg-gray-100 rounded-full">
                  <div
                    className={`h-full rounded-full ${month.percentage >= 75 ? 'bg-success' : 'bg-danger'}`}
                    style={{ width: `${Math.min(month.percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="flex gap-4 mb-4 text-sm font-sans">
                <span className="text-success">Present: {month.present}</span>
                <span className="text-danger">Absent: {month.absent}</span>
                <span className="text-warning">Late: {month.late}</span>
              </div>
              {/* Day-by-day heatmap */}
              <div className="flex flex-wrap gap-1.5">
                {month.days.map((day, idx) => (
                  <div
                    key={idx}
                    className={`
                      w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-medium font-sans
                      ${day.status === 'present' ? 'bg-success-lt text-success' : ''}
                      ${day.status === 'absent' ? 'bg-danger-lt text-danger' : ''}
                      ${day.status === 'late' ? 'bg-warning-lt text-warning' : ''}
                    `}
                    title={`${new Date(day.date).toLocaleDateString()} — ${day.status}`}
                  >
                    {new Date(day.date).getDate()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
