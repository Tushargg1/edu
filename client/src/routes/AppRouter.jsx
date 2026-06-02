import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../components/layout/DashboardLayout';

// Auth
import Login from '../pages/auth/Login';

// Admin pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import TeachersPage from '../pages/admin/TeachersPage';
import StudentsPage from '../pages/admin/StudentsPage';
import CalendarPage from '../pages/admin/CalendarPage';

// Teacher pages
import TeacherDashboard from '../pages/teacher/TeacherDashboard';
import MarkAttendance from '../pages/teacher/MarkAttendance';
import AttendanceReport from '../pages/teacher/AttendanceReport';
import TeacherCalendar from '../pages/teacher/TeacherCalendar';

// Student pages
import StudentDashboard from '../pages/student/StudentDashboard';
import MyAttendance from '../pages/student/MyAttendance';
import StudentCalendar from '../pages/student/StudentCalendar';

// Super Admin
import SuperAdminDashboard from '../pages/super-admin/SuperAdminDashboard';

export default function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Login />} />

      {/* Admin routes */}
      <Route
        element={
          <ProtectedRoute roles={['school_admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/teachers" element={<TeachersPage />} />
        <Route path="/admin/students" element={<StudentsPage />} />
        <Route path="/admin/calendar" element={<CalendarPage />} />
      </Route>

      {/* Teacher routes */}
      <Route
        element={
          <ProtectedRoute roles={['teacher']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher/attendance" element={<MarkAttendance />} />
        <Route path="/teacher/reports" element={<AttendanceReport />} />
        <Route path="/teacher/calendar" element={<TeacherCalendar />} />
      </Route>

      {/* Student routes */}
      <Route
        element={
          <ProtectedRoute roles={['student']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/attendance" element={<MyAttendance />} />
        <Route path="/student/calendar" element={<StudentCalendar />} />
      </Route>

      {/* Super Admin routes */}
      <Route
        element={
          <ProtectedRoute roles={['super_admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
