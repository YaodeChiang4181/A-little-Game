import { Character, Terrain, RoundResolutionResult } from '../types';

export type OnlineRole = 'HOST' | 'GUEST';

export type OnlineConnectionStatus =
  | 'idle'
  | 'creating'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export type NetworkMessageType =
  | 'HELLO'
  | 'WELCOME'
  | 'ROUND_START'
  | 'DEPLOY_READY'
  | 'SUBMIT_DEPLOY'
  | 'ROUND_RESOLVED'
  | 'REMATCH_REQUEST'
  | 'REMATCH_START'
  | 'PING'
  | 'PONG'
  | 'LEAVE';

export interface BaseNetworkMessage {
  type: NetworkMessageType;
  sender: OnlineRole;
  timestamp: number;
}

export interface HelloMessage extends BaseNetworkMessage {
  type: 'HELLO';
  name: string;
}

export interface WelcomeMessage extends BaseNetworkMessage {
  type: 'WELCOME';
  roomCode: string;
  hostName: string;
}

export interface RoundStartMessage extends BaseNetworkMessage {
  type: 'ROUND_START';
  roundNumber: number;
  terrains: Terrain[];
  guestHand: Character[];
  roundPool: Character[];
  hostHp: number;
  guestHp: number;
  hostRole: 'ODD' | 'EVEN';
  guestRole: 'EVEN' | 'ODD';
}

export interface DeployReadyMessage extends BaseNetworkMessage {
  type: 'DEPLOY_READY';
  isReady: boolean;
}

export interface SubmitDeployMessage extends BaseNetworkMessage {
  type: 'SUBMIT_DEPLOY';
  deployment: Character[];
}

export interface RoundResolvedMessage extends BaseNetworkMessage {
  type: 'ROUND_RESOLVED';
  hostDeployment: Character[];
  guestDeployment: Character[];
  result: RoundResolutionResult;
}

export interface RematchRequestMessage extends BaseNetworkMessage {
  type: 'REMATCH_REQUEST';
}

export interface RematchStartMessage extends BaseNetworkMessage {
  type: 'REMATCH_START';
}

export interface PingMessage extends BaseNetworkMessage {
  type: 'PING';
}

export interface PongMessage extends BaseNetworkMessage {
  type: 'PONG';
}

export interface LeaveMessage extends BaseNetworkMessage {
  type: 'LEAVE';
}

export type NetworkMessage =
  | HelloMessage
  | WelcomeMessage
  | RoundStartMessage
  | DeployReadyMessage
  | SubmitDeployMessage
  | RoundResolvedMessage
  | RematchRequestMessage
  | RematchStartMessage
  | PingMessage
  | PongMessage
  | LeaveMessage;

export interface OnlineMatchState {
  roomCode: string;
  role: OnlineRole;
  myRole: 'ODD' | 'EVEN';
  opponentRole: 'EVEN' | 'ODD';
  roundNumber: number;
  myHp: number;
  opponentHp: number;
  myHand: Character[];
  myDeployment: (Character | null)[];
  opponentReady: boolean;
  myReady: boolean;
  currentTerrains: Terrain[];
  roundPool: Character[];
  isResolving: boolean;
  gameStatus: 'lobby' | 'playing' | 'game_over';
  winner: OnlineRole | null;
  rematchRequestedByMe: boolean;
  rematchRequestedByOpponent: boolean;
  pingMs: number;
}
