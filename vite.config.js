import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetStudentsQuery } from '../../store/api/studentApi';
import { useSubmitAttendanceMutation } from '../../store/api/attendanceApi';
import { useGetTeacherDashboardQuery } from '../../store/api/dashboardApi';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Badge from '../../components/common/Badge';

export default function MarkAttendance() {
  const [searchParams] = useSearchParams();
  const { data: dashData } = useGetTeacherDashboardQuery();

  const classes = dashData?.data?.assignedClasses || [];
  const [selectedClass, setSelectedClass] = useState(searchParams.get('class') || '');
  const [selectedSection, setSelectedSection] = useState(searchParams.get('section') || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { data: studentsData, isLoading: loadingStudents } = useGetStudentsQuery(
    { class: selectedClass, section: selectedSection },
    { skip: !selectedClass || !selectedSection }
  );
  const [submitAttendance, { isLoading: submitting }] = useSubmitAttendanceMutation();

  const students = studentsData?.data?.students || [];

  // Init attendance to "present" for all students
  useEffect(() => {
    if (students.length > 0) {
      const initial = {};
      students.forEach((s) => {
        initial[s.studentId] = attendance[s.studentId] || 'present';
      });
      setAttendance(initial);
    }
  }, [students]);

  const toggleStatus = (studentId) => {
    const order = ['present', 'absent', 'late'];
    const current = attendance[studentId] || 'present';
    const nextIndex = (order.indexOf(current) + 1) % order.length;
    setAttendance({ ...attendance, [studentId]: order[nextIndex] });
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    const records = Object.entries(attendance).map(([studentId, status]) => ({
      studentId,
      status,
    }));

    try {
      await submitAttendance({
        class: selectedClass,
        section: selectedSection,
        date,
        records,
      }).unwrap();
      const absentCount = records.filter((r) => r.status === 'absent').length;
      setSuccess(
        `Attendance submitted! ${records.length} students marked. ${absentCount} absent.`
      );
    } catch (err) {
      setError(err?.data?.error?.message || 'Failed to submit attendance');
    }
  };

  const statusBadge = {
    present: 'present',
    absent: 'absent',
    late: 'late',
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text-pri font-sans">
        Mark Attendance
      </h2>

      {/* Class/Section/Date Selectors */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-text-pri font-sans">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => { setSelectedClass(e.target.value); setAttendance({}); }}
            className="rounded-[10px] border-[1.5px] border-border px-3.5 py-2.5 text-sm font-sans bg-white focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 w-32"
          >
            <option value="">Select</option>
            {[...new Set(classes.map((c) => c.class))].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-text-pri font-sans">Section</label>
          <select
            value={selectedSection}
            onChange={(e) => { setSelectedSection(e.target.value); setAttendance({}); }}
            className="rounded-[10px] border-[1.5px] border-border px-3.5 py-2.5 text-sm font-sans bg-white focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 w-32"
          >
            <option value="">Select</option>
            {classes
              .filter((c) => c.class === selectedClass)
              .map((c) => (
                <option key={c.section} value={c.section}>{c.section}</option>
              ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-text-pri font-sans">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-[10px] border-[1.5px] border-border px-3.5 py-2.5 text-sm font-sans bg-white focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10"
          />
        </div>
      </div>

      {error && <Alert variant="danger" onDismiss={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onDismiss={() => setSuccess('')}>{success}</Alert>}

      {/* Student List */}
      {selectedClass && selectedSection && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          {loadingStudents ? (
            <div className="p-12 animate-pulse h-64" />
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-sm text-text-muted font-sans">
              No students found for Class {selectedClass} {selectedSection}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase font-sans">Roll</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase font-sans">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase font-sans">ID</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-text-muted uppercase font-sans">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {students.map((s) => (
                      <tr key={s.studentId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-text-sec font-sans">
                          {s.rollNumber || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-text-pri font-sans">
                          {s.name}
                        </td>
                        <td className="px-6 py-4 text-[13px] font-mono text-text-sec">
                          {s.studentId}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleStatus(s.studentId)}
                            className="cursor-pointer"
                          >
                            <Badge variant={statusBadge[attendance[s.studentId] || 'present']}>
                              {(attendance[s.studentId] || 'present').charAt(0).toUpperCase() +
                                (attendance[s.studentId] || 'present').slice(1)}
                            </Badge>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary + Submit */}
              <div className="px-6 py-4 border-t border-border bg-surface flex items-center justify-between flex-wrap gap-4">
                <div className="flex gap-4 text-sm font-sans">
                  <span className="text-success font-medium">
                    Present: {Object.values(attendance).filter((s) => s === 'present').length}
                  </span>
                  <span className="text-danger font-medium">
                    Absent: {Object.values(attendance).filter((s) => s === 'absent').length}
                  </span>
                  <span className="text-warning font-medium">
                    Late: {Object.values(attendance).filter((s) => s === 'late').length}
                  </span>
                </div>
                <Button onClick={handleSubmit} loading={submitting}>
                  Submit Attendance
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
