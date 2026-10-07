import type {
  User,
  RoundState,
  Bet,
  FlightHistoryItem,
  LeaderboardEntry,
  WSMessage,
} from '../types.ts';

type Listener<T> = (data: T) => void;

class ApiService {
  private token: string | null = null;
  private currentUser: User | null = null;
  private ws: WebSocket | null = null;
  private reconnectTimeout: any = null;

  // Listeners
  private tickListeners = new Set<Listener<{ multiplier: number; elapsedMs: number }>>();
  private countdownListeners = new Set<Listener<{ countdown: number; roundId: string }>>();
  private roundStartListeners = new Set<
    Listener<{ roundId: string; startTime: number; bets: Bet[]; serverSeedHash: string }>
  >();
  private roundCrashListeners = new Set<
    Listener<{ roundId: string; crashMultiplier: number; serverSeed?: string; historyItem: FlightHistoryItem }>
  >();
  private betPlacedListeners = new Set<Listener<Bet>>();
  private betCashedOutListeners = new Set<
    Listener<{ betId: string; userId: string; multiplier: number; payout: number; username: string }>
  >();
  private syncStateListeners = new Set<
    Listener<{
      round: RoundState;
      bets: Bet[];
      flightHistory: FlightHistoryItem[];
      leaderboard: LeaderboardEntry[];
    }>
  >();
  private userChangeListeners = new Set<Listener<User | null>>();

  constructor() {
    this.token = localStorage.getItem('aviator_token');
    // Pre-populate demo user if first time
    if (!this.token) {
      this.token = 'token_demo_12345';
      localStorage.setItem('aviator_token', this.token);
    }
    this.connectWs();
    this.fetchUser();
  }

  public connectWs() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          this.handleWsMessage(msg);
        } catch {
          // Ignore parse errors
        }
      };

      this.ws.onclose = () => {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => this.connectWs(), 2000);
      };

      this.ws.onerror = () => {
        // Will close and reconnect
      };
    } catch {
      // Ignore
    }
  }

  private handleWsMessage(msg: WSMessage) {
    switch (msg.type) {
      case 'SYNC_STATE':
        this.syncStateListeners.forEach((l) => l(msg.payload));
        break;
      case 'TICK':
        this.tickListeners.forEach((l) => l(msg.payload));
        break;
      case 'COUNTDOWN':
        this.countdownListeners.forEach((l) => l(msg.payload));
        break;
      case 'ROUND_START':
        this.roundStartListeners.forEach((l) => l(msg.payload));
        break;
      case 'ROUND_CRASH':
        this.roundCrashListeners.forEach((l) => l(msg.payload));
        break;
      case 'BET_PLACED':
        this.betPlacedListeners.forEach((l) => l(msg.payload));
        break;
      case 'BET_CASHED_OUT':
        this.betCashedOutListeners.forEach((l) => l(msg.payload));
        // If current user cashed out, refresh balance
        if (this.currentUser && msg.payload.userId === this.currentUser.id) {
          this.updateUserBalance(msg.payload.payout);
        }
        break;
    }
  }

  public onTick(cb: Listener<{ multiplier: number; elapsedMs: number }>) {
    this.tickListeners.add(cb);
    return () => { this.tickListeners.delete(cb); };
  }

  public onCountdown(cb: Listener<{ countdown: number; roundId: string }>) {
    this.countdownListeners.add(cb);
    return () => { this.countdownListeners.delete(cb); };
  }

  public onRoundStart(
    cb: Listener<{ roundId: string; startTime: number; bets: Bet[]; serverSeedHash: string }>
  ) {
    this.roundStartListeners.add(cb);
    return () => { this.roundStartListeners.delete(cb); };
  }

  public onRoundCrash(
    cb: Listener<{ roundId: string; crashMultiplier: number; serverSeed?: string; historyItem: FlightHistoryItem }>
  ) {
    this.roundCrashListeners.add(cb);
    return () => { this.roundCrashListeners.delete(cb); };
  }

  public onBetPlaced(cb: Listener<Bet>) {
    this.betPlacedListeners.add(cb);
    return () => { this.betPlacedListeners.delete(cb); };
  }

  public onBetCashedOut(
    cb: Listener<{
      betId: string;
      userId: string;
      multiplier: number;
      payout: number;
      username: string;
    }>
  ) {
    this.betCashedOutListeners.add(cb);
    return () => { this.betCashedOutListeners.delete(cb); };
  }

  public onSyncState(
    cb: Listener<{
      round: RoundState;
      bets: Bet[];
      flightHistory: FlightHistoryItem[];
      leaderboard: LeaderboardEntry[];
    }>
  ) {
    this.syncStateListeners.add(cb);
    return () => { this.syncStateListeners.delete(cb); };
  }

  public onUserChange(cb: Listener<User | null>) {
    this.userChangeListeners.add(cb);
    return () => { this.userChangeListeners.delete(cb); };
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  private setCurrentUser(user: User | null) {
    this.currentUser = user;
    this.userChangeListeners.forEach((l) => l(user));
  }

  private updateUserBalance(delta: number) {
    if (this.currentUser) {
      this.currentUser = {
        ...this.currentUser,
        balance: Number((this.currentUser.balance + delta).toFixed(2)),
      };
      this.userChangeListeners.forEach((l) => l(this.currentUser));
    }
  }

  // HTTP API Calls
  public async fetchUser(): Promise<User | null> {
    if (!this.token) return null;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        this.setCurrentUser(data.user);
        return data.user;
      } else {
        this.token = null;
        localStorage.removeItem('aviator_token');
        this.setCurrentUser(null);
      }
    } catch {
      // Ignore network errors
    }
    return null;
  }

  public async register(payload: {
    username: string;
    email: string;
    password: string;
    avatar?: string;
  }): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register');

    this.token = data.token;
    localStorage.setItem('aviator_token', data.token);
    this.setCurrentUser(data.user);
    return data;
  }

  public async login(payload: {
    identifier: string;
    password: string;
  }): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to login');

    this.token = data.token;
    localStorage.setItem('aviator_token', data.token);
    this.setCurrentUser(data.user);
    return data;
  }

  public logout() {
    this.token = null;
    localStorage.removeItem('aviator_token');
    this.setCurrentUser(null);
  }

  public async faucet(amount: number = 500): Promise<number> {
    if (!this.token) throw new Error('Not authenticated');
    const res = await fetch('/api/auth/faucet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Faucet failed');
    if (this.currentUser) {
      this.setCurrentUser({ ...this.currentUser, balance: data.balance });
    }
    return data.balance;
  }

  public async placeBet(params: {
    amount: number;
    panel: 1 | 2;
    autoCashOutAt?: number | null;
  }): Promise<{ bet: Bet; balance: number; isQueuedForNextRound: boolean }> {
    if (!this.token) throw new Error('Please login to place a bet');
    const res = await fetch('/api/game/bet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to place bet');
    if (this.currentUser) {
      this.setCurrentUser({ ...this.currentUser, balance: data.balance });
    }
    return data;
  }

  public async cancelBet(betId: string): Promise<number> {
    if (!this.token) throw new Error('Not authenticated');
    const res = await fetch('/api/game/cancel-bet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ betId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to cancel bet');
    if (this.currentUser) {
      this.setCurrentUser({ ...this.currentUser, balance: data.balance });
    }
    return data.balance;
  }

  public async cashOut(betId: string): Promise<{ multiplier: number; payout: number; balance: number }> {
    if (!this.token) throw new Error('Not authenticated');
    const res = await fetch('/api/game/cashout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ betId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Cash out failed');
    if (this.currentUser) {
      this.setCurrentUser({ ...this.currentUser, balance: data.balance });
    }
    return data;
  }

  public async fetchHistory(): Promise<FlightHistoryItem[]> {
    try {
      const res = await fetch('/api/game/history');
      if (res.ok) {
        const data = await res.json();
        return data.history || [];
      }
    } catch {
      // Ignore
    }
    return [];
  }

  public async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const res = await fetch('/api/game/leaderboard');
      if (res.ok) {
        const data = await res.json();
        return data.leaderboard || [];
      }
    } catch {
      // Ignore
    }
    return [];
  }
}

export const api = new ApiService();
