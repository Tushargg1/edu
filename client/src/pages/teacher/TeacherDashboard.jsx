import { useGetTeacherDashboardQuery } from '../../store/api/dashboardApi';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

const EVENT_BADGE = {
  Holiday: 'holiday', Exam: 'exam', School_Event: 'event', PTM: 'ptm', Vacation: 'vacation',
};

export default function TeacherDashboard() {
  const { data, isLoading, error } = useGetTeacherDashboardQuery();
  const navigate = useNavigate();
  const d = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
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

  return (
    <div className="space-y-6">
      {/* Assigned Classes */}
      <div>
        <h2 className="text-base font-semibold text-text-pri font-sans mb-4">
          Your Classes — Today's Attendance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {d?.assignedClasses?.map((cls) => (
            <div
              key={`${cls.class}-${cls.section}`}
              className="bg-white rounded-2xl border border-border p-6 flex items-center justify-between"
            >
              <div>
                <p className="text-lg font-bold text-text-pri font-sans">
                  Class {cls.class}
                  <span className="text-text-muted font-normal ml-1">{cls.section}</span>
                </p>
                <div className="mt-2">
                  {cls.attendanceMarked ? (
                    <Badge variant="present">✓ Marked</Badge>
                  ) : (
                    <Badge variant="pending">Not Marked</Badge>
                  )}
                </div>
              </div>
              {!cls.attendanceMarked && (
                <Button
                  size="sm"
                  onClick={() =>
                    navigate(`/teacher/attendance?class=${cls.class}&section=${cls.section}`)
                  }
                >
                  Mark
                </Button>
              )}
            </div>
          ))}
          {(!d?.assignedClasses || d.assignedClasses.length === 0) && (
            <p className="text-sm text-text-muted col-span-full">
              No classes assigned yet.
            </p>
          )}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="text-base font-semibold text-text-pri font-sans mb-4">
          Upcoming Events
        </h2>
        {d?.upcomingEvents?.length > 0 ? (
          <div className="space-y-3">
            {d.upcomingEvents.slice(0, 8).map((event) => (
              <div
                key={event._id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-lt text-primary flex items-center justify-center text-xs font-bold font-sans shrink-0">
                  {new Date(event.startDate).getDate()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-pri truncate">
                    {event.title}
                  </p>
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
    </div>
  );
}
