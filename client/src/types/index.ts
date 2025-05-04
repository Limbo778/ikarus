// Примечание: для Conference используйте тип из @shared/schema
// Этот интерфейс Conference должен соответствовать типу из shared/schema.ts
export interface Conference {
  id: string;
  name: string;
  description?: string | null;
  creatorId: number;
  creatorName?: string | null;
  hostId?: string | null;
  active?: boolean | null;
  maxParticipants?: number | null;
  currentParticipants?: number;
  startedAt?: Date | null;
  endedAt?: Date | null;
  duration?: number | null;
  hasScreenShare?: boolean | null;
  hasChat?: boolean | null;
  hasVideoEnabled?: boolean | null;
  hostVideoPriority?: boolean | null;
  allowParticipantDetach?: boolean | null;
  isLocked?: boolean | null;
  createdAt: Date;
}
export interface WebRTCState {
  localStream?: MediaStream;
  screenStream?: MediaStream;
  remoteStreams: Map<string, MediaStream>;
  participants: Participant[];
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isRecording: boolean;
  confDuration: number;
  chatMessages: ChatMessage[];
  raisedHands: string[];
  focusedParticipantId: string | null;
  isConnected: boolean;
  fileShares: FileShare[];
  activePolls: Poll[];
  endedPolls: Poll[];
  whiteboardActions: WhiteboardAction[];
  isWhiteboardActive: boolean;
  sharedWebPage?: string;
  isHost: boolean;
  hostSettings: {
    hostVideoPriority: boolean;
    allowParticipantDetach: boolean;
  };
}

export interface WebRTCContextType extends WebRTCState {
  joinConference: (roomId: string, userName: string, options?: JoinOptions) => Promise<void>;
  leaveConference: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  toggleHand: () => void;
  toggleRecording: () => void;
  sendChatMessage: (message: string) => void;
  setFocusedParticipant: (participantId: string | null) => void;
  kickParticipant: (participantId: string) => void;
  muteParticipant: (participantId: string) => void;
  shareFile: (file: File) => Promise<void>;
  createPoll: (question: string, options: string[]) => void;
  votePoll: (pollId: string, optionIndex: number) => void;
  endPoll: (pollId: string) => void;
  toggleWhiteboard: () => void;
  sendWhiteboardAction: (action: WhiteboardAction) => void;
  shareWebPage: (url: string) => void;
  navigateSharedWebPage: (action: 'back' | 'forward' | 'refresh' | 'goto', url?: string) => void;
  stopSharingWebPage: () => void;
  updateHostSettings: (settings: { hostVideoPriority?: boolean, allowParticipantDetach?: boolean }) => void;
  isUserHost: () => boolean;
}

export interface JoinOptions {
  isAdmin?: boolean;
  isHost?: boolean;
  hostVideoPriority?: boolean;
  allowParticipantDetach?: boolean;
  withAudio?: boolean;
  withVideo?: boolean;
}

export interface Participant {
  id: string;
  name: string;
  isAdmin: boolean;
  isHost?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
  isRecording?: boolean;
  isSpeaking?: boolean;
  avatarUrl?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface FileShare {
  id: string;
  senderId: string;
  senderName: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  timestamp: number;
}

export interface Poll {
  id: string;
  creatorId: string;
  question: string;
  options: PollOption[];
  timestamp: number;
  isActive: boolean;
  endTime?: number;
}

export interface PollOption {
  text: string;
  votes: string[]; // массив ID участников, проголосовавших за этот вариант
}

export interface WhiteboardAction {
  id: string;
  type: 'add' | 'clear' | 'undo' | 'redo' | 'draw' | 'erase';
  userId: string;
  element?: DrawElement;
  timestamp: number;
  creator?: string; // Для обратной совместимости
}

export interface DrawElement {
  id?: string;
  type: 'pencil' | 'line' | 'rectangle' | 'circle' | 'text' | 'eraser' | 'freehand';
  points: {x: number, y: number}[];
  color: string;
  thickness?: number;
  width?: number; // Для обратной совместимости
  text?: string;
  creator?: string; // Для обратной совместимости
}