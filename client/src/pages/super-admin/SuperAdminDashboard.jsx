import EmptyState from '../../components/common/EmptyState';

/**
 * Super Admin Dashboard — placeholder until backend endpoints are built.
 */
export default function SuperAdminDashboard() {
  return (
    <div className="space-y-6">
      <EmptyState
        icon={
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        }
        title="Super Admin Dashboard"
        message="Platform-wide management features are coming soon. School approvals, billing, and analytics will appear here."
      />
    </div>
  );
}
