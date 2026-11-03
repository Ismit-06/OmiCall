import { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import type { Room } from '../types';

export default function HomePage() {
  const { authenticated, user, login, devLogin, logout, loading } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (authenticated) {
      apiClient<Room[]>('/api/rooms/my')
        .then(rooms => setMyRooms(rooms))
        .catch(() => {});
    }
  }, [authenticated]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyRoomLink = (code: string) => {
    const url = `${window.location.origin}/room/${code}`;
    navigator.clipboard.writeText(url);
    showToast(`✅ Room ${code} link copied to clipboard!`);
  };

  const handleCreateRoom = async () => {
    setCreating(true);
    try {
      const data = await apiClient<{ roomCode: string }>('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ password: roomPassword || null }),
      });
      navigate(`/room/${data.roomCode}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = () => {
    if (joinCode.trim()) {
      navigate(`/room/${joinCode.trim()}`);
    }
  };

  if (loading) {
    return <div className="container"><p>Loading...</p></div>;
  }

  return (
    <div className="container">
      <header className="card">
        <h1>💕 Video Platform</h1>
        <p className="subtitle">Private video calls for couples & random video chat</p>
        {authenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
            {user.profilePicture && (
              <img src={user.profilePicture} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
            )}
            <span><strong>{user.displayName}</strong></span>
            {user.role === 'ROLE_ADMIN' && <span className="status-badge">Admin</span>}
            <button className="btn btn-secondary" onClick={logout} style={{ marginLeft: 'auto' }}>Logout</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <div style={{ padding: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px' }}>
              <p style={{ fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>⚡ Instant Testing Mode (No setup needed)</p>
              <p style={{ color: '#3b82f6', fontSize: '0.9rem', marginBottom: '10px' }}>
                Click below to instantly log in without Google credentials:
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => devLogin('Sai (Host)', 'sai@example.com', 'admin')}>
                  Login as Admin (Sai)
                </button>
                <button className="btn btn-secondary" onClick={() => devLogin('Partner (Guest)', 'partner@example.com', 'user')}>
                  Login as Partner
                </button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '8px' }}>
                Or use real Google Account (requires Google Client ID in .env):
              </p>
              <button className="btn btn-secondary" onClick={login}>
                Sign in with Google
              </button>
            </div>
          </div>
        )}
      </header>

      {authenticated && (
        <>
          <div className="grid">
            <div className="card">
              <h2>🔒 Private Room</h2>
              <p className="subtitle">Create a private 1-on-1 video call room.</p>
              {!showCreateForm ? (
                <button className="btn" onClick={() => setShowCreateForm(true)}>Create Room</button>
              ) : (
                <div>
                  <input
                    type="password"
                    placeholder="Optional password"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    style={{ padding: '8px', width: '100%', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                  <button className="btn" onClick={handleCreateRoom} disabled={creating}>
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowCreateForm(false)} style={{ marginLeft: '8px' }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="card">
              <h2>🔗 Join Room</h2>
              <p className="subtitle">Join an existing private room with a code.</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Room code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  style={{ padding: '8px', flex: 1, borderRadius: '6px', border: '1px solid #ccc' }}
                />
                <button className="btn" onClick={handleJoinRoom} disabled={!joinCode.trim()}>Join</button>
              </div>
            </div>
          </div>

          {myRooms.length > 0 && (
            <div className="card" style={{ marginTop: '16px' }}>
              <h2>🏠 Your Active Rooms</h2>
              <p className="subtitle">Rooms you created that are currently active.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {myRooms.map(rm => (
                  <div key={rm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                    <div>
                      <strong>Room: {rm.roomCode}</strong>
                      <span className="status-badge" style={{ marginLeft: '10px' }}>{rm.status}</span>
                      <span style={{ fontSize: '0.85rem', color: '#6b7280', marginLeft: '10px' }}>
                        {rm.participantCount} participant{rm.participantCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => copyRoomLink(rm.roomCode)}>
                        📋 Copy Link
                      </button>
                      <button className="btn" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => navigate(`/room/${rm.roomCode}`)}>
                        Re-enter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {toastMessage && (
            <div className="toast">
              {toastMessage}
            </div>
          )}

          <div className="card" style={{ marginTop: '16px' }}>
            <h2>🎲 Random Chat</h2>
            <p className="subtitle">Meet someone new! Get matched based on your interests.</p>
            <button className="btn" onClick={() => navigate('/random')}>Start Random Match</button>
          </div>

          {user?.role === 'ROLE_ADMIN' && (
            <div className="card" style={{ marginTop: '16px' }}>
              <h2>⚙️ Admin Panel</h2>
              <p className="subtitle">Platform management and moderation.</p>
              <button className="btn btn-secondary" onClick={() => navigate('/admin')}>Open Admin Dashboard</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
