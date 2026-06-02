import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useAuth from '../../hooks/useAuth';
import { clearCredentials } from '../../store/slices/authSlice';
import { useLogoutMutation } from '../../store/api/authApi';

/* ── Icon helpers ──────────────────────────────────────────── */
const icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
  ),
  teachers: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  students: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
  ),
  attendance: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  ),
  report: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  ),
  logout: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  ),
};

/* ── Nav config by role ────────────────────────────────────── */
const NAV_ITEMS = {
  school_admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: icons.dashboard },
    { to: '/admin/teachers', label: 'Teachers', icon: icons.teachers },
    { to: '/admin/students', label: 'Students', icon: icons.students },
    { to: '/admin/calendar', label: 'Calendar', icon: icons.calendar },
  ],
  teacher: [
    { to: '/teacher/dashboard', label: 'Dashboard', icon: icons.dashboard },
    { to: '/teacher/attendance', label: 'Mark Attendance', icon: icons.attendance },
    { to: '/teacher/reports', label: 'Reports', icon: icons.report },
    { to: '/teacher/calendar', label: 'Calendar', icon: icons.calendar },
  ],
  student: [
    { to: '/student/dashboard', label: 'Dashboard', icon: icons.dashboard },
    { to: '/student/attendance', label: 'My Attendance', icon: icons.attendance },
    { to: '/student/calendar', label: 'Calendar', icon: icons.calendar },
  ],
  super_admin: [
    { to: '/super-admin/dashboard', label: 'Dashboard', icon: icons.dashboard },
  ],
};

/**
 * Sidebar — 240px fixed, dark background, role-aware navigation.
 * Collapses on mobile via parent control.
 */
export default function Sidebar({ isOpen, onClose }) {
  const { role, user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  const navItems = NAV_ITEMS[role] || [];

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // proceed even if API fails
    }
    dispatch(clearCredentials());
    navigate('/', { replace: true });
  };

  const roleLabel = {
    super_admin: 'Super Admin',
    school_admin: 'School Admin',
    teacher: 'Teacher',
    student: 'Student',
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-50
          w-60 bg-sidebar flex flex-col
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <div>
              <h1 className="text-white font-display text-xl leading-none">
                EduSync
              </h1>
              <p className="text-white/40 text-[11px] font-sans mt-0.5">
                {roleLabel[role] || 'Platform'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl
                text-sm font-sans font-medium transition-all duration-150
                ${
                  isActive
                    ? 'bg-primary text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                    : 'text-white/60 hover:text-white hover:bg-white/8'
                }
              `}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-white text-xs font-semibold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-sans font-medium truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-white/40 text-[11px] font-mono truncate">
                {user?.userId || ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full
              text-sm font-sans font-medium text-red-400 hover:bg-red-500/10
              transition-colors duration-150 cursor-pointer"
          >
            {icons.logout}
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
