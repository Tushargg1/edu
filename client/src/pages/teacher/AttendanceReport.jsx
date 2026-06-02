import { useState } from 'react';
import { useGetClassReportQuery } from '../../store/api/attendanceApi';
import { useGetTeacherDashboardQuery } from '../../store/api/dashboardApi';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';

export default function AttendanceReport() {
  const { data: dashData } = useGetTeacherDashboardQuery();
  const classes = dashData?.data?.assignedClasses || [];

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const { data, isLoading } = useGetClassReportQuery(
    { className: selectedClass, section: selectedSection },
    { skip: !selectedClass }
  );

  const report = data?.data?.report || [];

  const columns = [
    { key: 'studentId', label: 'Student ID', mono: true },
    {
      key: 'present',
      label: 'Present',
      render: (row) => <span className="text-success font-medium">{row.present}</span>,
    },
    {
      key: 'absent',
      label: 'Absent',
      render: (row) => <span className="text-danger font-medium">{row.absent}</span>,
    },
    {
      key: 'late',
      label: 'Late',
      render: (row) => <span className="text-warning font-medium">{row.late}</span>,
    },
    {
      key: 'percentage',
      label: 'Attendance %',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-100 rounded-full max-w-[80px]">
            <div
              className={`h-full rounded-full ${row.percentage >= 75 ? 'bg-success' : 'bg-danger'}`}
              style={{ width: `${Math.min(row.percentage, 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium font-mono">{row.percentage}%</span>
        </div>
      ),
    },
    {
      key: 'flag',
      label: 'Flag',
      render: (row) =>
        row.belowThreshold ? (
          <Badge variant="absent">Below 75%</Badge>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text-pri font-sans">
        Attendance Reports
      </h2>

      <div className="flex gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-text-pri font-sans">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
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
            onChange={(e) => setSelectedSection(e.target.value)}
            className="rounded-[10px] border-[1.5px] border-border px-3.5 py-2.5 text-sm font-sans bg-white focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 w-32"
          >
            <option value="">All</option>
            {classes
              .filter((c) => c.class === selectedClass)
              .map((c) => (
                <option key={c.section} value={c.section}>{c.section}</option>
              ))}
          </select>
        </div>
      </div>

      {selectedClass ? (
        isLoading ? (
          <div className="bg-white rounded-2xl border border-border p-12 animate-pulse h-64" />
        ) : (
          <DataTable
            columns={columns}
            data={report}
            emptyMessage="No attendance data found for this class"
          />
        )
      ) : (
        <div className="bg-white rounded-2xl border border-border p-12 text-center text-sm text-text-muted font-sans">
          Select a class to view the attendance report
        </div>
      )}
    </div>
  );
}
