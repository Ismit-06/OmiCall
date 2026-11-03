import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
} from 'livekit-client';

interface VideoCallProps {
  token: string;
  livekitUrl: string;
  onDisconnect?: () => void;
  e2eeKey?: string;
  partnerName?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  isLocal: boolean;
  time: string;
}

interface Reaction {
  id: number;
  emoji: string;
  left: number;
}

const COUPLE_PROMPTS = [
  "💖 What was the exact moment you realized you liked me?",
  "✈️ If we could teleport anywhere in the world together right now, where would we go?",
  "✨ What is your absolute favorite memory of us so far?",
  "🎵 What song always reminds you of me when you hear it?",
  "🍕 What is our all-time best meal together?",
  "🛋️ If we had a lazy Sunday with no chores or alarms, what would we do all day?",
  "🌟 What is one small habit or gesture I do that makes you smile?",
  "💌 If you had to describe our connection in 3 words, what would they be?"
];

export default function VideoCall({
  token,
  livekitUrl,
  onDisconnect,
  e2eeKey,
  partnerName,
}: VideoCallProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'>('connecting');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [e2eeActive, setE2eeActive] = useState<boolean>(false);
  const [partnerConnected, setPartnerConnected] = useState<boolean>(false);
  const [remoteName, setRemoteName] = useState<string>(partnerName || 'Stranger');

  // Camera device selection (Omegle feature)
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  // In-call features
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [networkQuality, setNetworkQuality] = useState<string>('Good');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const activeRoomRef = useRef<Room | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize background audio element for remote audio
  useEffect(() => {
    const audio = new Audio();
    audio.autoplay = true;
    remoteAudioRef.current = audio;
    return () => {
      audio.srcObject = null;
    };
  }, []);

  // Call duration counter
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, showChat]);

  // Load available camera devices (from Omegle clone pattern)
  useEffect(() => {
    async function loadDevices() {
      try {
        const devices = await Room.getLocalDevices('videoinput');
        setVideoDevices(devices);
        if (devices.length > 0 && !selectedCameraId) {
          setSelectedCameraId(devices[0].deviceId);
        }
      } catch (err) {
        console.warn('Could not list media devices:', err);
      }
    }
    loadDevices();
  }, []);

  // Helper to attach remote track properly
  const attachRemoteTrack = useCallback((track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video) {
      if (remoteVideoRef.current) {
        track.attach(remoteVideoRef.current);
      }
    } else if (track.kind === Track.Kind.Audio) {
      if (remoteAudioRef.current) {
        track.attach(remoteAudioRef.current);
      }
    }
  }, []);

  // Helper to detach remote track
  const detachRemoteTrack = useCallback((track: RemoteTrack) => {
    track.detach();
  }, []);

  useEffect(() => {
    if (!token || !livekitUrl) return;

    const newRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    });
    activeRoomRef.current = newRoom;

    if (e2eeKey) {
      setE2eeActive(true);
    }

    // 1. Connection lifecycle handlers
    newRoom.on(RoomEvent.Connected, () => {
      console.log('[LiveKit] Room connected successfully:', newRoom.name);
      setConnectionState('connected');

      // Check for already-present remote participants
      if (newRoom.remoteParticipants.size > 0) {
        setPartnerConnected(true);
        for (const [, participant] of newRoom.remoteParticipants) {
          if (participant.name) {
            setRemoteName(participant.name);
          }
          // Attach any already-published tracks
          for (const pub of participant.trackPublications.values()) {
            if (pub.isSubscribed && pub.track) {
              attachRemoteTrack(pub.track as RemoteTrack);
            }
          }
        }
      }
    });

    newRoom.on(RoomEvent.Reconnecting, () => {
      setConnectionState('reconnecting');
    });

    newRoom.on(RoomEvent.Reconnected, () => {
      setConnectionState('connected');
    });

    newRoom.on(RoomEvent.Disconnected, () => {
      setConnectionState('disconnected');
      setPartnerConnected(false);
    });

    // 2. Participant arrival and departure
    newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('[LiveKit] Remote participant arrived:', participant.identity, participant.name);
      setPartnerConnected(true);
      if (participant.name) {
        setRemoteName(participant.name);
      }
      // Check already-published tracks on arrival
      for (const pub of participant.trackPublications.values()) {
        if (pub.isSubscribed && pub.track) {
          attachRemoteTrack(pub.track as RemoteTrack);
        }
      }
    });

    newRoom.on(RoomEvent.ParticipantDisconnected, () => {
      console.log('[LiveKit] Remote participant left');
      if (newRoom.remoteParticipants.size === 0) {
        setPartnerConnected(false);
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
    });

    // 3. Track subscription handlers (Critical for video/audio visibility)
    newRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      console.log('[LiveKit] Track subscribed:', track.kind, 'from', participant.identity);
      setPartnerConnected(true);
      if (participant.name) {
        setRemoteName(participant.name);
      }
      attachRemoteTrack(track);
    });

    newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      console.log('[LiveKit] Track unsubscribed:', track.kind);
      detachRemoteTrack(track);
    });

    // 4. Sync local media button states
    const syncTrackStates = () => {
      if (!newRoom) return;
      setIsAudioMuted(!newRoom.localParticipant.isMicrophoneEnabled);
      setIsVideoMuted(!newRoom.localParticipant.isCameraEnabled);
      setIsScreenSharing(newRoom.localParticipant.isScreenShareEnabled);
    };

    newRoom.on(RoomEvent.LocalTrackPublished, syncTrackStates);
    newRoom.on(RoomEvent.LocalTrackUnpublished, syncTrackStates);
    newRoom.on(RoomEvent.TrackMuted, syncTrackStates);
    newRoom.on(RoomEvent.TrackUnmuted, syncTrackStates);

    // 5. Connection Quality Indicator
    newRoom.on(RoomEvent.ConnectionQualityChanged, (quality) => {
      setNetworkQuality(String(quality));
    });

    // 6. Real-time data packets (In-call chat, reactions, prompts)
    const decoder = new TextDecoder();
    newRoom.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
      try {
        const jsonStr = decoder.decode(payload);
        const data = JSON.parse(jsonStr);

        if (data.type === 'chat') {
          setChatMessages(prev => [
            ...prev,
            {
              id: String(Date.now() + Math.random()),
              sender: data.sender || remoteName || 'Partner',
              text: data.text,
              isLocal: false,
              time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        } else if (data.type === 'reaction') {
          triggerReaction(data.emoji);
        } else if (data.type === 'prompt') {
          setCurrentPrompt(data.prompt);
        }
      } catch (err) {
        console.warn('Failed to parse incoming data message:', err);
      }
    });

    // 7. Connect WebSocket and publish Camera/Microphone
    const wsUrl = livekitUrl.replace(/^http/, 'ws');

    newRoom.connect(wsUrl, token)
      .then(async () => {
        try {
          // Enable both camera & mic
          await newRoom.localParticipant.enableCameraAndMicrophone();

          // Ensure local preview video is attached
          const videoTrackPub = Array.from(newRoom.localParticipant.videoTrackPublications.values())[0];
          if (videoTrackPub?.track && localVideoRef.current) {
            videoTrackPub.track.attach(localVideoRef.current);
          }

          setIsAudioMuted(!newRoom.localParticipant.isMicrophoneEnabled);
          setIsVideoMuted(!newRoom.localParticipant.isCameraEnabled);
        } catch (mediaErr) {
          console.warn('Camera/Microphone permission or mock device warning:', mediaErr);
          setIsAudioMuted(true);
          setIsVideoMuted(true);
        }
      })
      .catch((err) => {
        if (activeRoomRef.current === newRoom) {
          console.error('Failed to connect to LiveKit room:', err);
          setConnectionState('error');
        }
      });

    setRoom(newRoom);

    return () => {
      activeRoomRef.current = null;
      newRoom.disconnect();
    };
  }, [token, livekitUrl, attachRemoteTrack, detachRemoteTrack, e2eeKey]);

  // Switch camera device (Omegle feature)
  const handleSwitchCamera = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (!room) return;
    try {
      await room.switchActiveDevice('videoinput', deviceId);
      // Re-attach local camera track to local video element
      const videoTrackPub = Array.from(room.localParticipant.videoTrackPublications.values())[0];
      if (videoTrackPub?.track && localVideoRef.current) {
        videoTrackPub.track.attach(localVideoRef.current);
      }
    } catch (err) {
      console.error('Failed to switch camera device:', err);
    }
  };

  const triggerReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    const left = Math.floor(Math.random() * 80) + 10;
    setReactions(prev => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2500);
  };

  const sendReaction = async (emoji: string) => {
    triggerReaction(emoji);
    if (!room) return;
    try {
      const encoder = new TextEncoder();
      const packet = encoder.encode(JSON.stringify({ type: 'reaction', emoji }));
      await room.localParticipant.publishData(packet, { reliable: true });
    } catch (err) {
      console.warn('Error publishing reaction:', err);
    }
  };

  const sendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !room) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const text = inputMessage.trim();
    setInputMessage('');

    setChatMessages(prev => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        sender: 'You',
        text,
        isLocal: true,
        time
      }
    ]);

    try {
      const encoder = new TextEncoder();
      const packet = encoder.encode(JSON.stringify({ type: 'chat', text, sender: 'Partner', time }));
      await room.localParticipant.publishData(packet, { reliable: true });
    } catch (err) {
      console.warn('Error sending chat message:', err);
    }
  };

  const broadcastCouplePrompt = async () => {
    const randomIndex = Math.floor(Math.random() * COUPLE_PROMPTS.length);
    const prompt = COUPLE_PROMPTS[randomIndex];
    setCurrentPrompt(prompt);

    if (!room) return;
    try {
      const encoder = new TextEncoder();
      const packet = encoder.encode(JSON.stringify({ type: 'prompt', prompt }));
      await room.localParticipant.publishData(packet, { reliable: true });
    } catch (err) {
      console.warn('Error broadcasting couple prompt:', err);
    }
  };

  const toggleMic = async () => {
    if (!room) return;
    const willEnable = isAudioMuted;
    try {
      await room.localParticipant.setMicrophoneEnabled(willEnable);
      setIsAudioMuted(!room.localParticipant.isMicrophoneEnabled);
    } catch (err) {
      console.error('[toggleMic] error in setMicrophoneEnabled:', err);
    }
  };

  const toggleCam = async () => {
    if (!room) return;
    const willEnable = isVideoMuted;
    try {
      await room.localParticipant.setCameraEnabled(willEnable);
      setIsVideoMuted(!room.localParticipant.isCameraEnabled);
      if (willEnable && localVideoRef.current) {
        const videoTrackPub = Array.from(room.localParticipant.videoTrackPublications.values())[0];
        if (videoTrackPub?.track) {
          videoTrackPub.track.attach(localVideoRef.current);
        }
      }
    } catch (err) {
      console.error('[toggleCam] error in setCameraEnabled:', err);
    }
  };

  const toggleScreenShare = async () => {
    if (!room) return;
    const willShare = !isScreenSharing;
    try {
      await room.localParticipant.setScreenShareEnabled(willShare);
      setIsScreenSharing(room.localParticipant.isScreenShareEnabled);
    } catch (err) {
      console.warn('Screen share error:', err);
    }
  };

  const endCall = () => {
    if (room) {
      room.disconnect();
    }
    if (onDisconnect) onDisconnect();
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', position: 'relative' }}>
      {/* Floating Reaction Emojis */}
      {reactions.map(r => (
        <span
          key={r.id}
          className="reaction-heart"
          style={{ left: `${r.left}%`, bottom: '80px', pointerEvents: 'none' }}
        >
          {r.emoji}
        </span>
      ))}

      {/* Top Status Bar: Call Duration, Connection & Encryption Indicators */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '800px', fontSize: '0.9rem', color: '#4b5563', padding: '0 8px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="live-dot" style={{ background: connectionState === 'connected' ? '#10b981' : '#f59e0b' }} />
          <span>{connectionState === 'connected' ? `Call: ${formatDuration(callDuration)}` : connectionState}</span>
          {e2eeActive && <span className="status-badge" style={{ marginLeft: '4px' }}>🔒 E2EE Direct</span>}
        </div>

        {/* Camera Selector (Omegle feature) */}
        {videoDevices.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem' }}>📷 Cam:</span>
            <select
              value={selectedCameraId}
              onChange={(e) => handleSwitchCamera(e.target.value)}
              style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.8rem' }}
            >
              {videoDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: partnerConnected ? '#059669' : '#9ca3af' }}>
            {partnerConnected ? `Connected with ${remoteName}` : 'Waiting for partner...'}
          </span>
          <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Signal: {networkQuality}</span>
        </div>
      </div>

      {/* Active Couple Conversation Prompt */}
      {currentPrompt && (
        <div className="couple-prompt-banner" style={{ width: '100%', maxWidth: '800px' }}>
          <div>{currentPrompt}</div>
          <button
            onClick={() => setCurrentPrompt(null)}
            style={{ background: 'transparent', border: 'none', color: '#9d174d', fontSize: '0.8rem', cursor: 'pointer', marginTop: '4px', textDecoration: 'underline' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Video Streams Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', maxWidth: '800px' }}>
        {/* Local Stream (You) */}
        <div style={{ position: 'relative', background: '#000', borderRadius: '8px', minHeight: '260px', overflow: 'hidden' }}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <span style={{ position: 'absolute', bottom: '8px', left: '8px', color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
            You (Local) {isVideoMuted && '🔇'}
          </span>
        </div>

        {/* Remote Stream (Partner) */}
        <div style={{ position: 'relative', background: '#111', borderRadius: '8px', minHeight: '260px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: partnerConnected ? 'block' : 'none'
            }}
          />
          {!partnerConnected && (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
              <p style={{ margin: 0, fontWeight: 500 }}>Waiting for partner to join...</p>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>Share your room code or link to begin</p>
            </div>
          )}
          <span style={{ position: 'absolute', bottom: '8px', left: '8px', color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
            {partnerConnected ? remoteName : 'Partner'}
          </span>
        </div>
      </div>

      {/* In-Call Real-Time Chat Drawer */}
      {showChat && (
        <div style={{ width: '100%', maxWidth: '800px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', height: '220px' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', borderBottom: '1px solid #f3f4f6', paddingBottom: '4px' }}>
            💬 In-Call Text Chat (Live & Private)
          </div>
          <div ref={chatScrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
            {chatMessages.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', margin: 'auto' }}>
                No messages yet. Say hello! 👋
              </div>
            ) : (
              chatMessages.map(msg => (
                <div key={msg.id} className={`chat-bubble ${msg.isLocal ? 'local' : 'remote'}`}>
                  <div>{msg.text}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.7, textAlign: 'right', marginTop: '2px' }}>{msg.time}</div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={sendChatMessage} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              type="text"
              placeholder="Type a message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
            />
            <button type="submit" className="btn" style={{ padding: '8px 14px' }}>Send</button>
          </form>
        </div>
      )}

      {/* Interactive Emoji Bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>React:</span>
        {['❤️', '💖', '🥰', '😂', '🔥', '👏'].map(emoji => (
          <button
            key={emoji}
            onClick={() => sendReaction(emoji)}
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '20px',
              padding: '4px 10px',
              fontSize: '1.1rem',
              cursor: 'pointer',
              transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Primary Video Call Controls */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
        <button className="btn btn-secondary" onClick={toggleMic}>
          {isAudioMuted ? '🎙️ Unmute Mic' : '🎙️ Mute Mic'}
        </button>
        <button className="btn btn-secondary" onClick={toggleCam}>
          {isVideoMuted ? '📹 Start Video' : '📹 Stop Video'}
        </button>
        <button className="btn btn-secondary" onClick={toggleScreenShare}>
          {isScreenSharing ? '🖥️ Stop Share' : '🖥️ Share Screen'}
        </button>
        <button className="btn btn-secondary" onClick={() => setShowChat(prev => !prev)}>
          💬 {showChat ? 'Hide Chat' : 'Chat'}
        </button>
        <button className="btn btn-secondary" onClick={broadcastCouplePrompt}>
          ✨ Couple Question
        </button>
        <button className="btn" style={{ backgroundColor: 'var(--danger)' }} onClick={endCall}>
          End Call
        </button>
      </div>
    </div>
  );
}
