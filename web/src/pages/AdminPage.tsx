import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  activeRooms: number;
  pendingReports: number;
  activeMatches: number;
}

interface ReportItem {
  id: number;
  reporterId: number;
  reportedUserId: number;
  matchId: number | null;
  reason: string;
  status: string;
  moderatorNotes: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      const [statsData, reportsData] = await Promise.all([
        apiClient<Stats>('/api/admin/dashboard'),
        apiClient<ReportItem[]>('/api/admin/reports?status=PENDING'),
      ]);
      setStats(statsData);
      setReports(reportsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleResolveReport = async (reportId: number, action: 'RESOLVED' | 'DISMISSED') => {
    try {
      await apiClient(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action, notes: `Marked as ${action} by admin` }),
      });
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Error updating report');
    }
  };

  const handleUpdateUserStatus = async (userId: number, status: string) => {
    if (confirm(`Change user ${userId} status to ${status}?`)) {
      try {
        await apiClient(`/api/admin/users/${userId}/status`, {
          method: 'POST',
          body: JSON.stringify({ status, reason: `Admin moderation action (${status})` }),
        });
        alert(`User ${userId} is now ${status}`);
        fetchAdminData();
      } catch (err: any) {
        alert(err.message || 'Error updating user status');
      }
    }
  };

  if (loading) return <div className="container"><p>Loading dashboard...</p></div>;

  return (
    <div className="container">
      <div className="card">
        <h1>⚙️ Admin Dashboard & Moderation</h1>
        <p className="subtitle">Platform health, safety reports, and moderation control</p>

        {error && (
          <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', margin: '16px 0' }}>
            {error}
          </div>
        )}

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '16px' }}>
            <div style={{ padding: '12px', background: '#f3f4f6', borderRadius: '6px' }}>
              <span className="subtitle">Total Users</span>
              <h3>{stats.totalUsers}</h3>
            </div>
            <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '6px' }}>
              <span className="subtitle">Active Users</span>
              <h3>{stats.activeUsers}</h3>
            </div>
            <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '6px' }}>
              <span className="subtitle">Suspended / Banned</span>
              <h3>{stats.suspendedUsers + stats.bannedUsers}</h3>
            </div>
            <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '6px' }}>
              <span className="subtitle">Active Rooms</span>
              <h3>{stats.activeRooms}</h3>
            </div>
            <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '6px' }}>
              <span className="subtitle">Pending Reports</span>
              <h3>{stats.pendingReports}</h3>
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px' }}>
          <h2>Abuse Reports Under Review</h2>
          {reports.length === 0 ? (
            <p className="subtitle" style={{ marginTop: '8px' }}>No pending reports.</p>
          ) : (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {reports.map((rep) => (
                <div key={rep.id} style={{ border: '1px solid #e5e7eb', padding: '12px', borderRadius: '6px' }}>
                  <div><strong>Report #{rep.id}</strong> — Reported User #{rep.reportedUserId}</div>
                  <div style={{ margin: '4px 0', color: '#4b5563' }}>Reason: "{rep.reason}"</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button className="btn" style={{ fontSize: '0.85rem' }} onClick={() => handleResolveReport(rep.id, 'RESOLVED')}>
                      Resolve
                    </button>
                    <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={() => handleResolveReport(rep.id, 'DISMISSED')}>
                      Dismiss
                    </button>
                    <button className="btn" style={{ fontSize: '0.85rem', backgroundColor: 'var(--danger)' }} onClick={() => handleUpdateUserStatus(rep.reportedUserId, 'SUSPENDED')}>
                      Suspend User
                    </button>
                    <button className="btn" style={{ fontSize: '0.85rem', backgroundColor: '#000' }} onClick={() => handleUpdateUserStatus(rep.reportedUserId, 'BANNED')}>
                      Ban User
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
