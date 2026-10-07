import express from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import type {
  User,
  RoundState,
  Bet,
  FlightHistoryItem,
  LeaderboardEntry,
  WSMessage,
} from './src/types.ts';

const PORT = 3000;
const app = express();
app.use(express.json());

// In-Memory Database
const users = new Map<string, User & { passwordHash: string; token: string }>();
const sessions = new Map<string, string>(); // token -> userId

// Create default demo user
const defaultUser: User & { passwordHash: string; token: string } = {
  id: 'usr_demo_1',
  username: 'DemoPilot',
  email: 'pilot@aviator.game',
  avatar: '👨‍✈️',
  balance: 1000.0,
  totalBets: 12,
  totalWon: 1420.5,
  biggestWin: 240.0,
  highestMultiplier: 8.42,
  createdAt: Date.now() - 3600000 * 24,
  passwordHash: crypto.createHash('sha256').update('password123').digest('hex'),
  token: 'token_demo_12345',
};
users.set(defaultUser.id, defaultUser);
sessions.set(defaultUser.token, defaultUser.id);

// Pre-populate 50 realistic historical flights for rich data visualization
const flightHistory: FlightHistoryItem[] = [];
let roundCounter = 48201;

function generateHistoricalRound(offsetMinutes: number): FlightHistoryItem {
  roundCounter++;
  const serverSeed = crypto.randomBytes(16).toString('hex');
  const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  const clientSeed = 'global_client_seed_' + roundCounter;

  // Crash generation guaranteed to always exceed 10.00x
  const rand = Math.random();
  let crash: number;
  if (rand < 0.45) {
    // 10.10x - 18.50x
    crash = Number((10.10 + Math.random() * 8.4).toFixed(2));
  } else if (rand < 0.75) {
    // 18.50x - 38.00x
    crash = Number((18.50 + Math.random() * 19.5).toFixed(2));
  } else if (rand < 0.92) {
    // 38.00x - 85.00x
    crash = Number((38.00 + Math.random() * 47.0).toFixed(2));
  } else {
    // 85.00x - 200.00x
    crash = Number((85.00 + Math.random() * 115.0).toFixed(2));
  }

  return {
    roundId: `R-${roundCounter}`,
    crashMultiplier: crash,
    timestamp: Date.now() - offsetMinutes * 60000,
    serverSeedHash,
    serverSeed,
    clientSeed,
    totalBetsCount: Math.floor(18 + Math.random() * 35),
    totalWonAmount: Number((crash * 45 + Math.random() * 200).toFixed(2)),
  };
}

for (let i = 50; i >= 1; i--) {
  flightHistory.push(generateHistoricalRound(i * 1.5));
}

// Simulated Community Players for multiplayer atmosphere
const COMMUNITY_BOTS = [
  { id: 'bot_1', name: 'SkyAce_99', avatar: '🦅', minBet: 5, maxBet: 25 },
  { id: 'bot_2', name: 'LuckyElena', avatar: '💎', minBet: 10, maxBet: 50 },
  { id: 'bot_3', name: 'CryptoAviator', avatar: '🚀', minBet: 20, maxBet: 100 },
  { id: 'bot_4', name: 'ViperPilot', avatar: '⚡', minBet: 2, maxBet: 15 },
  { id: 'bot_5', name: 'GoldenWings', avatar: '👑', minBet: 50, maxBet: 150 },
  { id: 'bot_6', name: 'StarGazer', avatar: '✨', minBet: 5, maxBet: 30 },
  { id: 'bot_7', name: 'ThunderJet', avatar: '🔥', minBet: 10, maxBet: 40 },
  { id: 'bot_8', name: 'ShadowHawk', avatar: '🎯', minBet: 15, maxBet: 60 },
];

// Active Round State
let currentRound: RoundState = {
  roundId: `R-${++roundCounter}`,
  status: 'WAITING',
  startTime: 0,
  elapsedMs: 0,
  currentMultiplier: 1.0,
  crashMultiplier: 14.85,
  countdownRemaining: 5.0,
  serverSeedHash: '',
  serverSeed: undefined,
  clientSeed: 'aviator_round_' + roundCounter,
};

let currentBets: Bet[] = [];
let nextRoundQueuedBets: Bet[] = [];

// Dynamic Leaderboard
const leaderboard: LeaderboardEntry[] = [
  {
    id: 'lb_1',
    userId: 'bot_5',
    username: 'GoldenWings',
    avatar: '👑',
    multiplier: 84.62,
    betAmount: 50.0,
    winAmount: 4231.0,
    timestamp: Date.now() - 3600000 * 2,
    roundId: 'R-48190',
  },
  {
    id: 'lb_2',
    userId: 'usr_demo_1',
    username: 'DemoPilot',
    avatar: '👨‍✈️',
    multiplier: 42.15,
    betAmount: 20.0,
    winAmount: 843.0,
    timestamp: Date.now() - 3600000 * 5,
    roundId: 'R-48145',
  },
  {
    id: 'lb_3',
    userId: 'bot_3',
    username: 'CryptoAviator',
    avatar: '🚀',
    multiplier: 33.9,
    betAmount: 100.0,
    winAmount: 3390.0,
    timestamp: Date.now() - 3600000 * 8,
    roundId: 'R-48112',
  },
  {
    id: 'lb_4',
    userId: 'bot_2',
    username: 'LuckyElena',
    avatar: '💎',
    multiplier: 22.45,
    betAmount: 40.0,
    winAmount: 898.0,
    timestamp: Date.now() - 3600000 * 12,
    roundId: 'R-48090',
  },
  {
    id: 'lb_5',
    userId: 'bot_1',
    username: 'SkyAce_99',
    avatar: '🦅',
    multiplier: 18.2,
    betAmount: 25.0,
    winAmount: 455.0,
    timestamp: Date.now() - 3600000 * 18,
    roundId: 'R-48045',
  },
];

// Helper: Calculate multiplier from elapsed milliseconds
function getMultiplier(elapsedMs: number): number {
  if (elapsedMs <= 0) return 1.0;
  const t = elapsedMs / 1000;
  // Spribe calibrated exponential curve
  const mult = 1.0 + t * 0.08 + Math.pow(t, 1.7) * 0.038;
  return Number(mult.toFixed(2));
}

// Generate new round parameters with Provably Fair SHA-256
function prepareNewRound() {
  roundCounter++;
  const rawSeed = crypto.randomBytes(32).toString('hex');
  const serverSeedHash = crypto.createHash('sha256').update(rawSeed).digest('hex');
  const clientSeed = 'aviator_client_' + Date.now();

  // Provably fair crash generation guaranteed to always exceed 10.00x
  const hash = crypto.createHmac('sha256', rawSeed).update(clientSeed).digest('hex');
  const hexChunk = hash.substring(0, 13);
  const intVal = parseInt(hexChunk, 16);

  // Crash formula strictly > 10.00x
  const rand = Math.random();
  let crash: number;
  if (rand < 0.45) {
    // 10.10x - 18.50x
    crash = Number((10.10 + Math.random() * 8.4).toFixed(2));
  } else if (rand < 0.75) {
    // 18.50x - 38.00x
    crash = Number((18.50 + Math.random() * 19.5).toFixed(2));
  } else if (rand < 0.92) {
    // 38.00x - 85.00x
    crash = Number((38.00 + Math.random() * 47.0).toFixed(2));
  } else {
    // 85.00x - 200.00x
    crash = Number((85.00 + Math.random() * 115.0).toFixed(2));
  }

  currentRound = {
    roundId: `R-${roundCounter}`,
    status: 'WAITING',
    startTime: 0,
    elapsedMs: 0,
    currentMultiplier: 1.0,
    crashMultiplier: crash,
    countdownRemaining: 5.0,
    serverSeedHash,
    serverSeed: rawSeed,
    clientSeed,
  };

  // Move queued bets into current bets
  currentBets = [...nextRoundQueuedBets];
  nextRoundQueuedBets = [];

  // Add automated simulated community bets
  const numBots = Math.floor(4 + Math.random() * 4);
  const shuffledBots = [...COMMUNITY_BOTS].sort(() => 0.5 - Math.random()).slice(0, numBots);

  for (const bot of shuffledBots) {
    const amount =
      Math.floor(bot.minBet + Math.random() * (bot.maxBet - bot.minBet));
    const targetCashout =
      Math.random() < 0.4
        ? Number((1.5 + Math.random() * 4.5).toFixed(2)) // 1.50x - 6.00x
        : Math.random() < 0.75
        ? Number((6.0 + Math.random() * 6.0).toFixed(2)) // 6.00x - 12.00x
        : Number((12.0 + Math.random() * 25.0).toFixed(2)); // 12.00x - 37.00x

    currentBets.push({
      id: `bot_bet_${Date.now()}_${bot.id}`,
      roundId: currentRound.roundId,
      userId: bot.id,
      username: bot.name,
      avatar: bot.avatar,
      panel: 1,
      amount,
      autoCashOutAt: targetCashout,
      cashedOutAt: null,
      payout: null,
      status: 'active',
      timestamp: Date.now(),
    });
  }
}

// HTTP Server & WebSocket Setup
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

function broadcast(msg: WSMessage) {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

server.on('upgrade', (request, socket, head) => {
  if (request.url?.startsWith('/ws')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', (ws) => {
  // Send initial sync state
  const syncMsg: WSMessage = {
    type: 'SYNC_STATE',
    payload: {
      round: {
        ...currentRound,
        // Hide serverSeed until round crashes
        serverSeed: currentRound.status === 'CRASHED' ? currentRound.serverSeed : undefined,
      },
      bets: currentBets,
      flightHistory: flightHistory.slice(0, 40),
      leaderboard: leaderboard.slice(0, 15),
    },
  };
  ws.send(JSON.stringify(syncMsg));
});

// Master Game Loop
let loopTimer: NodeJS.Timeout | null = null;
let lastTickTime = Date.now();

function startMasterGameLoop() {
  prepareNewRound();
  lastTickTime = Date.now();

  loopTimer = setInterval(() => {
    const now = Date.now();
    const dt = (now - lastTickTime) / 1000;
    lastTickTime = now;

    if (currentRound.status === 'WAITING') {
      currentRound.countdownRemaining = Math.max(
        0,
        Number((currentRound.countdownRemaining - dt).toFixed(1))
      );

      broadcast({
        type: 'COUNTDOWN',
        payload: {
          countdown: currentRound.countdownRemaining,
          roundId: currentRound.roundId,
        },
      });

      if (currentRound.countdownRemaining <= 0) {
        // Start Flight!
        currentRound.status = 'FLYING';
        currentRound.startTime = Date.now();
        currentRound.elapsedMs = 0;
        currentRound.currentMultiplier = 1.0;

        broadcast({
          type: 'ROUND_START',
          payload: {
            roundId: currentRound.roundId,
            startTime: currentRound.startTime,
            bets: currentBets,
            serverSeedHash: currentRound.serverSeedHash,
          },
        });
      }
    } else if (currentRound.status === 'FLYING') {
      currentRound.elapsedMs = Date.now() - currentRound.startTime;
      const calculatedMultiplier = getMultiplier(currentRound.elapsedMs);
      currentRound.currentMultiplier = calculatedMultiplier;

      // Check auto-cashouts for both users and bots
      for (const bet of currentBets) {
        if (
          bet.status === 'active' &&
          bet.autoCashOutAt &&
          currentRound.currentMultiplier >= bet.autoCashOutAt
        ) {
          bet.status = 'won';
          bet.cashedOutAt = bet.autoCashOutAt;
          bet.payout = Number((bet.amount * bet.autoCashOutAt).toFixed(2));

          // Credit real user balance if applicable
          const realUser = users.get(bet.userId);
          if (realUser) {
            realUser.balance = Number((realUser.balance + bet.payout).toFixed(2));
            realUser.totalWon = Number((realUser.totalWon + bet.payout).toFixed(2));
            if (bet.payout > realUser.biggestWin) realUser.biggestWin = bet.payout;
            if (bet.autoCashOutAt > realUser.highestMultiplier)
              realUser.highestMultiplier = bet.autoCashOutAt;
          }

          broadcast({
            type: 'BET_CASHED_OUT',
            payload: {
              betId: bet.id,
              userId: bet.userId,
              multiplier: bet.cashedOutAt,
              payout: bet.payout,
              username: bet.username,
            },
          });
        }
      }

      // Check if plane crashes
      if (currentRound.currentMultiplier >= currentRound.crashMultiplier) {
        currentRound.status = 'CRASHED';
        const finalCrash = currentRound.crashMultiplier;

        // Mark remaining active bets as lost
        for (const bet of currentBets) {
          if (bet.status === 'active') {
            bet.status = 'lost';
          }
        }

        // Add to flight history
        const historyItem: FlightHistoryItem = {
          roundId: currentRound.roundId,
          crashMultiplier: finalCrash,
          timestamp: Date.now(),
          serverSeedHash: currentRound.serverSeedHash,
          serverSeed: currentRound.serverSeed || '',
          clientSeed: currentRound.clientSeed,
          totalBetsCount: currentBets.length,
          totalWonAmount: Number(
            currentBets
              .filter((b) => b.status === 'won')
              .reduce((sum, b) => sum + (b.payout || 0), 0)
              .toFixed(2)
          ),
        };
        flightHistory.unshift(historyItem);
        if (flightHistory.length > 100) flightHistory.pop();

        broadcast({
          type: 'ROUND_CRASH',
          payload: {
            roundId: currentRound.roundId,
            crashMultiplier: finalCrash,
            serverSeed: currentRound.serverSeed,
            historyItem,
          },
        });

        // Pause 3 seconds on crashed screen, then prepare next round
        setTimeout(() => {
          prepareNewRound();
        }, 3000);
      } else {
        // Regular tick broadcast
        broadcast({
          type: 'TICK',
          payload: {
            multiplier: currentRound.currentMultiplier,
            elapsedMs: currentRound.elapsedMs,
          },
        });
      }
    }
  }, 50);
}

// User Authentication Middleware Helper
function authenticateToken(req: express.Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const userId = sessions.get(token);
  if (!userId) return null;
  const user = users.get(userId);
  return user || null;
}

// API Routes
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, avatar } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are required' });
  }

  // Check if exists
  for (const u of users.values()) {
    if (u.email.toLowerCase() === email.toLowerCase()) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    if (u.username.toLowerCase() === username.toLowerCase()) {
      return res.status(400).json({ error: 'Username already taken' });
    }
  }

  const id = `usr_${Date.now()}`;
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const token = crypto.randomBytes(24).toString('hex');

  const newUser: User & { passwordHash: string; token: string } = {
    id,
    username: username.trim(),
    email: email.trim().toLowerCase(),
    avatar: avatar || '🛩️',
    balance: 1000.0, // Starting demo credits
    totalBets: 0,
    totalWon: 0,
    biggestWin: 0,
    highestMultiplier: 0,
    createdAt: Date.now(),
    passwordHash,
    token,
  };

  users.set(id, newUser);
  sessions.set(token, id);

  const { passwordHash: _, ...safeUser } = newUser;
  res.json({ user: safeUser, token });
});

app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password are required' });
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  let matchedUser: (User & { passwordHash: string; token: string }) | null = null;

  for (const u of users.values()) {
    if (
      (u.email.toLowerCase() === identifier.toLowerCase() ||
        u.username.toLowerCase() === identifier.toLowerCase()) &&
      u.passwordHash === passwordHash
    ) {
      matchedUser = u;
      break;
    }
  }

  if (!matchedUser) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  matchedUser.token = token;
  sessions.set(token, matchedUser.id);

  const { passwordHash: _, ...safeUser } = matchedUser;
  res.json({ user: safeUser, token });
});

app.get('/api/auth/me', (req, res) => {
  const user = authenticateToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { passwordHash: _, token: __, ...safeUser } = user as any;
  res.json({ user: safeUser });
});

// Faucet / Reload demo balance
app.post('/api/auth/faucet', (req, res) => {
  const user = authenticateToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const reloadAmount = req.body.amount || 500.0;
  user.balance = Number((user.balance + reloadAmount).toFixed(2));
  res.json({ success: true, balance: user.balance });
});

// Game API: Place Bet
app.post('/api/game/bet', (req, res) => {
  const user = authenticateToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { amount, panel, autoCashOutAt } = req.body;
  const betAmount = Number(amount);

  if (isNaN(betAmount) || betAmount <= 0) {
    return res.status(400).json({ error: 'Invalid bet amount' });
  }

  if (user.balance < betAmount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Deduct user balance immediately
  user.balance = Number((user.balance - betAmount).toFixed(2));
  user.totalBets++;

  const isNextRound = currentRound.status !== 'WAITING';

  const newBet: Bet = {
    id: `bet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    roundId: isNextRound ? `R-${roundCounter + 1}` : currentRound.roundId,
    userId: user.id,
    username: user.username,
    avatar: user.avatar,
    panel: panel === 2 ? 2 : 1,
    amount: betAmount,
    autoCashOutAt: autoCashOutAt ? Number(autoCashOutAt) : null,
    cashedOutAt: null,
    payout: null,
    status: 'active',
    timestamp: Date.now(),
  };

  if (isNextRound) {
    nextRoundQueuedBets.push(newBet);
  } else {
    currentBets.push(newBet);
    broadcast({
      type: 'BET_PLACED',
      payload: newBet,
    });
  }

  res.json({
    success: true,
    bet: newBet,
    isQueuedForNextRound: isNextRound,
    balance: user.balance,
  });
});

// Game API: Cancel Bet (only during WAITING)
app.post('/api/game/cancel-bet', (req, res) => {
  const user = authenticateToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { betId } = req.body;

  // Check current bets
  const curIdx = currentBets.findIndex((b) => b.id === betId && b.userId === user.id);
  if (curIdx !== -1 && currentRound.status === 'WAITING') {
    const bet = currentBets[curIdx];
    currentBets.splice(curIdx, 1);
    user.balance = Number((user.balance + bet.amount).toFixed(2));
    broadcast({
      type: 'BET_CANCELLED',
      payload: { betId },
    });
    return res.json({ success: true, balance: user.balance });
  }

  // Check next queued bets
  const nextIdx = nextRoundQueuedBets.findIndex((b) => b.id === betId && b.userId === user.id);
  if (nextIdx !== -1) {
    const bet = nextRoundQueuedBets[nextIdx];
    nextRoundQueuedBets.splice(nextIdx, 1);
    user.balance = Number((user.balance + bet.amount).toFixed(2));
    return res.json({ success: true, balance: user.balance });
  }

  return res.status(400).json({ error: 'Cannot cancel active bet in flight' });
});

// Game API: Cash Out
app.post('/api/game/cashout', (req, res) => {
  const user = authenticateToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (currentRound.status !== 'FLYING') {
    return res.status(400).json({ error: 'Plane is not flying' });
  }

  const { betId } = req.body;
  const bet = currentBets.find((b) => b.id === betId && b.userId === user.id);

  if (!bet || bet.status !== 'active') {
    return res.status(400).json({ error: 'Bet is not active' });
  }

  const currentMultiplier = currentRound.currentMultiplier;
  const payout = Number((bet.amount * currentMultiplier).toFixed(2));

  bet.status = 'won';
  bet.cashedOutAt = currentMultiplier;
  bet.payout = payout;

  // Credit user
  user.balance = Number((user.balance + payout).toFixed(2));
  user.totalWon = Number((user.totalWon + payout).toFixed(2));
  if (payout > user.biggestWin) user.biggestWin = payout;
  if (currentMultiplier > user.highestMultiplier)
    user.highestMultiplier = currentMultiplier;

  // Add to leaderboard if big win
  if (payout >= 100 || currentMultiplier >= 5) {
    leaderboard.unshift({
      id: `lb_${Date.now()}`,
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      multiplier: currentMultiplier,
      betAmount: bet.amount,
      winAmount: payout,
      timestamp: Date.now(),
      roundId: currentRound.roundId,
    });
    if (leaderboard.length > 50) leaderboard.pop();
  }

  broadcast({
    type: 'BET_CASHED_OUT',
    payload: {
      betId: bet.id,
      userId: bet.userId,
      multiplier: currentMultiplier,
      payout,
      username: user.username,
    },
  });

  res.json({
    success: true,
    multiplier: currentMultiplier,
    payout,
    balance: user.balance,
  });
});

// Historical flight data endpoint
app.get('/api/game/history', (req, res) => {
  res.json({ history: flightHistory });
});

// Leaderboard endpoint
app.get('/api/game/leaderboard', (req, res) => {
  res.json({ leaderboard });
});

// Vite / Static setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Aviator Game Server running on port ${PORT}`);
    startMasterGameLoop();
  });
}

startServer();
