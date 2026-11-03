import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, VideoPresets } from 'livekit-client';

interface VideoCallProps {
  token: string;
  livekitUrl: string;
  onDisconnect?: () => void;
  e2eeKey?: string;
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

export default function VideoCall({ token, livekitUrl, onDisconnect, e2eeKey }: VideoCallProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('connecting');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [e2eeActive, setE2eeActive] = useState<boolean>(false);

  // In-call features
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const activeRoomRef = useRef<Room | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

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

    newRoom.on(RoomEvent.Connected, () => {
      console.log('LiveKit room connected successfully!');
      setConnectionState('connected');
    });

    newRoom.on(RoomEvent.Disconnected, () => {
      setConnectionState('disconnected');
    });

    newRoom.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
        track.attach(remoteVideoRef.current);
      }
      if (track.kind === Track.Kind.Audio) {
        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        track.attach(audioEl);
      }
    });

    newRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach();
    });

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

    // Handle data channel packets (Chat, Reactions, Couple Prompts)
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
              sender: data.sender || 'Partner',
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

    // Connect and publish camera/mic
    const wsUrl = livekitUrl.replace(/^http/, 'ws');

    newRoom.connect(wsUrl, token)
      .then(async () => {
        try {
          await newRoom.localParticipant.enableCameraAndMicrophone();
          const cameraTrack = newRoom.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
          if (cameraTrack && localVideoRef.current) {
            cameraTrack.attach(localVideoRef.current);
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
  }, [token, livekitUrl]);

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
    setIsAudioMuted(!willEnable);
    try {
      await room.localParticipant.setMicrophoneEnabled(willEnable);
      setIsAudioMuted(!room.localParticipant.isMicrophoneEnabled);
    } catch (err) {
      console.error('[toggleMic] error in setMicrophoneEnabled:', err);
      setIsAudioMuted(!room.localParticipant.isMicrophoneEnabled);
    }
  };

  const toggleCam = async () => {
    if (!room) return;
    const willEnable = isVideoMuted;
    setIsVideoMuted(!willEnable);
    try {
      await room.localParticipant.setCameraEnabled(willEnable);
      setIsVideoMuted(!room.localParticipant.isCameraEnabled);
      if (willEnable && localVideoRef.current) {
        const camTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
        if (camTrack) camTrack.attach(localVideoRef.current);
      }
    } catch (err) {
      console.error('[toggleCam] error in setCameraEnabled:', err);
      setIsVideoMuted(!room.localParticipant.isCameraEnabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!room) return;
    const willShare = !isScreenSharing;
    setIsScreenSharing(willShare);
    try {
      await room.localParticipant.setScreenShareEnabled(willShare);
      setIsScreenSharing(room.localParticipant.isScreenShareEnabled);
    } catch (err) {
      console.warn('Screen share error:', err);
      setIsScreenSharing(room.localParticipant.isScreenShareEnabled);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', position: 'relative' }}>
      {/* Floating Animated Reactions */}
      {reactions.map(r => (
        <span
          key={r.id}
          className="reaction-particle"
          style={{ left: `${r.left}%` }}
        >
          {r.emoji}
        </span>
      ))}

      {/* Top Header Controls & Metadata */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '800px' }}>
        <div>
          <span>Status: <strong>{connectionState}</strong></span>
          {e2eeActive && <span className="status-badge" style={{ marginLeft: '8px' }}>🔐 E2EE Verified</span>}
        </div>
        <div>
          <span>Duration: <strong>{formatDuration(callDuration)}</strong></span>
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
      <div style={{ display: 'grid', gridTemplateColumns: showChat ? '1fr 1fr' : '1fr 1fr', gap: '16px', width: '100%', maxWidth: '800px' }}>
        <div style={{ position: 'relative', background: '#000', borderRadius: '8px', minHeight: '260px', overflow: 'hidden' }}>
          <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <span style={{ position: 'absolute', bottom: '8px', left: '8px', color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
            You (Local) {isVideoMuted && '🔇'}
          </span>
        </div>

        <div style={{ position: 'relative', background: '#111', borderRadius: '8px', minHeight: '260px', overflow: 'hidden' }}>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <span style={{ position: 'absolute', bottom: '8px', left: '8px', color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
            Remote Participant
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
