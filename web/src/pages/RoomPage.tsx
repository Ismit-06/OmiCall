import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuth } from '../features/auth/AuthContext';
import VideoCall from '../features/call/VideoCall';
import type { Room } from '../types';

export default function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showToast, setShowToast] = useState<boolean>(false);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    if (!roomCode) return;
    let isMounted = true;

    apiClient<Room>(`/api/rooms/${roomCode}`)
      .then((data) => {
        if (!isMounted) return;
        setRoom(data);
        // If the current user is the host who created the room, or if the room has no password, connect directly
        if (!data.hasPassword || (user && user.id === data.hostId)) {
          joinRoom('');
        }
      })
      .catch((err: Error) => {
        if (!isMounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [roomCode, user?.id]);

  const joinRoom = async (pwd: string) => {
    try {
      setError(null);
      await apiClient(`/api/rooms/${roomCode}/join`, {
        method: 'POST',
        body: JSON.stringify({ password: pwd || null }),
      });

      // Obtain LiveKit token
      const tokenData = await apiClient<{ token: string; livekitUrl: string }>(
        `/api/calls/token/room/${roomCode}`
      );
      setToken(tokenData.token);
      setLivekitUrl(tokenData.livekitUrl);
      setJoined(true);
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
    }
  };

  const handleLeave = async () => {
    try {
      await apiClient(`/api/rooms/${roomCode}/leave`, { method: 'POST' });
    } catch {
      // Ignored
    }
    navigate('/');
  };

  if (loading) return <div className="container"><p>Loading room details...</p></div>;

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Room: {roomCode}</h2>
            <p className="subtitle">Invite Link: {window.location.href}</p>
          </div>
          <button className="btn btn-secondary" onClick={copyInviteLink}>
            📋 Copy Invite Link
          </button>
        </div>

        {showToast && (
          <div className="toast">
            ✅ Invite link copied to clipboard!
          </div>
        )}

        {error && (
          <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', margin: '16px 0' }}>
            {error}
          </div>
        )}

        {!joined && room?.hasPassword && (
          <div style={{ marginTop: '16px' }}>
            <p><strong>This room is password protected:</strong></p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: '8px', flex: 1, borderRadius: '6px', border: '1px solid #ccc' }}
              />
              <button className="btn" onClick={() => joinRoom(password)}>Join Room</button>
            </div>
          </div>
        )}

        {joined && token && (
          <div style={{ marginTop: '20px' }}>
            <VideoCall
              token={token}
              livekitUrl={livekitUrl}
              onDisconnect={handleLeave}
              e2eeKey={roomCode}
            />
          </div>
        )}
      </div>
    </div>
  );
}
