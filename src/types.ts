export type RoundStatus = 'WAITING' | 'FLYING' | 'CRASHED';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  balance: number;
  totalBets: number;
  totalWon: number;
  biggestWin: number;
  highestMultiplier: number;
  createdAt: number;
}

export interface RoundState {
  roundId: string;
  status: RoundStatus;
  startTime: number;
  elapsedMs: number;
  currentMultiplier: number;
  crashMultiplier: number;
  countdownRemaining: number; // in seconds, e.g. 5.0 -> 0.0
  serverSeedHash: string;
  serverSeed?: string; // only revealed on crash
  clientSeed: string;
}

export interface Bet {
  id: string;
  roundId: string;
  userId: string;
  username: string;
  avatar: string;
  panel: 1 | 2;
  amount: number;
  autoCashOutAt: number | null;
  cashedOutAt: number | null;
  payout: number | null;
  status: 'active' | 'won' | 'lost' | 'cancelled';
  timestamp: number;
}

export interface UserWonInfo {
  id: string;
  multiplier: number;
  payout: number;
}

export interface FlightHistoryItem {
  roundId: string;
  crashMultiplier: number;
  timestamp: number;
  serverSeedHash: string;
  serverSeed: string;
  clientSeed: string;
  totalBetsCount: number;
  totalWonAmount: number;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  multiplier: number;
  betAmount: number;
  winAmount: number;
  timestamp: number;
  roundId: string;
}

export interface WSMessage {
  type:
    | 'SYNC_STATE'
    | 'TICK'
    | 'ROUND_START'
    | 'ROUND_CRASH'
    | 'COUNTDOWN'
    | 'BET_PLACED'
    | 'BET_CASHED_OUT'
    | 'BET_CANCELLED'
    | 'COMMUNITY_BETS'
    | 'LEADERBOARD_UPDATE'
    | 'USER_BALANCE_UPDATE';
  payload: any;
}
