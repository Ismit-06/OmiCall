export interface UserInfo {
  id: number;
  email: string;
  displayName: string;
  profilePicture: string | null;
  status: string;
  role: string;
  createdAt: string;
}

export interface AuthState {
  authenticated: boolean;
  user: UserInfo | null;
  loading: boolean;
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

export interface Room {
  id: number;
  roomCode: string;
  hostId: number;
  hasPassword: boolean;
  status: string;
  createdAt: string;
  expiresAt: string;
  participantCount: number;
}

export interface MatchPreferences {
  interests: string[];
  language: string;
  country: string;
  preferredGender: string;
}

export interface MatchResult {
  matchId: number;
  token: string;
  livekitUrl: string;
  roomName: string;
  otherUserId?: number;
  otherUserName?: string;
  otherUserProfilePicture?: string | null;
  otherUser?: {
    id?: number;
    displayName: string;
    profilePicture: string | null;
  };
}

export interface ApiError {
  error: string;
  timestamp: string;
}
