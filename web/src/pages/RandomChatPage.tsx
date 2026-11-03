import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../lib/api';
import VideoCall from '../features/call/VideoCall';
import type { MatchResult } from '../types';

export default function RandomChatPage() {
  const [searching, setSearching] = useState(false);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [interests, setInterests] = useState('coding, music, movies');
  const [language, setLanguage] = useState('English');
  const [reportReason, setReportReason] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueSize, setQueueSize] = useState<number>(0);

  const pollTimerRef = useRef<any>(null);

  // Polling loop when searching
  useEffect(() => {
    if (!searching) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await apiClient<{ status: string; match?: MatchResult; queueSize?: number }>('/api/match/status');
        if (res.status === 'MATCHED' && res.match) {
          setMatch(res.match);
          setSearching(false);
        } else if (res.status === 'SEARCHING') {
          if (res.queueSize !== undefined) {
            setQueueSize(res.queueSize);
          }
        }
      } catch (err: any) {
        // Continue polling or set error if forbidden
        if (err.message && err.message.includes('401')) {
          setSearching(false);
          setError('Session expired. Please log in again.');
        }
      }
    };

    pollTimerRef.current = setInterval(checkStatus, 1500);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [searching]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      apiClient('/api/match/cancel', { method: 'POST' }).catch(() => {});
    };
  }, []);

  const startMatching = async () => {
    setSearching(true);
    setError(null);
    try {
      const interestList = interests.split(',').map(s => s.trim()).filter(Boolean);
      const res = await apiClient<{ status: string; match?: MatchResult; queueSize?: number }>('/api/match/start', {
        method: 'POST',
        body: JSON.stringify({
          interests: interestList,
          language,
        }),
      });

      if (res.status === 'MATCHED' && res.match) {
        setMatch(res.match);
        setSearching(false);
      } else if (res.queueSize !== undefined) {
        setQueueSize(res.queueSize);
      }
    } catch (err: any) {
      setError(err.message || 'Matchmaking error');
      setSearching(false);
    }
  };

  const cancelSearch = async () => {
    try {
      await apiClient('/api/match/cancel', { method: 'POST' });
    } catch {
      // Ignored
    }
    setSearching(false);
  };

  const handleNext = async () => {
    setMatch(null);
    setSearching(true);
    try {
      const interestList = interests.split(',').map(s => s.trim()).filter(Boolean);
      const res = await apiClient<{ status: string; match?: MatchResult; queueSize?: number }>('/api/match/next', {
        method: 'POST',
        body: JSON.stringify({
          interests: interestList,
          language,
        }),
      });

      if (res.status === 'MATCHED' && res.match) {
        setMatch(res.match);
        setSearching(false);
      } else if (res.queueSize !== undefined) {
        setQueueSize(res.queueSize);
      }
    } catch (err: any) {
      setError(err.message || 'Error finding next match');
      setSearching(false);
    }
  };

  const otherId = match?.otherUserId || match?.otherUser?.id;
  const otherName = match?.otherUserName || match?.otherUser?.displayName || 'Stranger';

  const handleBlock = async () => {
    if (!match || !otherId) return;
    if (confirm(`Block ${otherName}? You will not be matched together again.`)) {
      try {
        await apiClient('/api/blocks', {
          method: 'POST',
          body: JSON.stringify({ blockedUserId: otherId }),
        });
        handleNext();
      } catch (err: any) {
        alert(err.message || 'Failed to block user');
      }
    }
  };

  const handleReport = async () => {
    if (!match || !otherId || !reportReason.trim()) return;
    try {
      await apiClient('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: otherId,
          matchId: match.matchId,
          reason: reportReason.trim(),
        }),
      });
      alert('Report submitted for moderator review.');
      setShowReportModal(false);
      setReportReason('');
      handleNext();
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>🎲 Random Video Chat</h2>
        <p className="subtitle">Connect anonymously with someone based on shared preferences.</p>

        {error && (
          <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', margin: '16px 0' }}>
            {error}
          </div>
        )}

        {!match && !searching && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
            <div>
              <label><strong>Interests (comma-separated):</strong></label>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px' }}
              />
            </div>
            <div>
              <label><strong>Preferred Language:</strong></label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px' }}
              />
            </div>
            <button className="btn" onClick={startMatching} style={{ marginTop: '8px' }}>
              Find a Partner
            </button>
          </div>
        )}

        {searching && (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔍</div>
            <p><strong>Searching for a compatible match...</strong></p>
            <p className="subtitle">Users waiting in queue: {queueSize}</p>
            <button className="btn btn-secondary" onClick={cancelSearch} style={{ marginTop: '16px' }}>
              Cancel Search
            </button>
          </div>
        )}

        {match && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span>Matched with: <strong>{otherName}</strong></span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setShowReportModal(true)}>
                  Report
                </button>
                <button className="btn btn-secondary" onClick={handleBlock}>
                  Block
                </button>
                <button className="btn" onClick={handleNext}>
                  Next ⏭
                </button>
              </div>
            </div>

            <VideoCall
              token={match.token}
              livekitUrl={match.livekitUrl}
              onDisconnect={() => setMatch(null)}
              e2eeKey={match.roomName}
            />
          </div>
        )}

        {showReportModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '400px' }}>
              <h3>Report Participant</h3>
              <p className="subtitle">Reports are sent to moderators along with call session metadata.</p>
              <textarea
                placeholder="Describe the issue..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', margin: '12px 0' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowReportModal(false)}>Cancel</button>
                <button className="btn" style={{ backgroundColor: 'var(--danger)' }} onClick={handleReport}>Submit Report</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
