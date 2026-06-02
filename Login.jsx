import { useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const ROUTE_TITLES = {
  '/admin/dashboard': 'Dashboard',
  '/admin/teachers': 'Teachers',
  '/admin/students': 'Students',
  '/admin/calendar': 'Calendar',
  '/teacher/dashboard': 'Dashboard',
  '/teacher/attendance': 'Mark Attendance',
  '/teacher/reports': 'Attendance Reports',
  '/teacher/calendar': 'Calendar',
  '/student/dashboard': 'Dashboard',
  '/student/attendance': 'My Attendance',
  '/student/calendar': 'Calendar',
  '/super-admin/dashboard': 'Dashboard',
};

/**
 * Topbar — 56px white bar with page title, greeting, and hamburger toggle.
 */
export default function Topbar({ onMenuToggle }) {
  const location = useLocation();
  const { user } = useAuth();

  const pageTitle = ROUTE_TITLES[location.pathname] || 'Dashboard';

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-border h-14 flex items-center justify-between px-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-text-sec transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>

        <div>
          <h1 className="text-lg font-semibold text-text-pri font-sans leading-none">
            {pageTitle}
          </h1>
          <p className="text-xs text-text-muted font-sans mt-0.5">
            {greeting}, {user?.name?.split(' ')[0] || 'there'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell placeholder */}
        <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-text-sec transition-colors relative cursor-pointer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
        </button>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold font-sans">
          {user?.name?.charAt(0) || 'U'}
        </div>
      </div>
    </header>
  );
}
