import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  User,
  RoundState,
  Bet,
  FlightHistoryItem,
  LeaderboardEntry,
  UserWonInfo,
} from './types.ts';
import { api } from './services/api.ts';
import { sound } from './services/sound.ts';
import { Header } from './components/Header.tsx';
import { FlightStage } from './components/FlightStage.tsx';
import { BettingPanel } from './components/BettingPanel.tsx';
import { MultiplayerFeed } from './components/MultiplayerFeed.tsx';
import { FlightDataVisualization } from './components/FlightDataVisualization.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { ProvablyFairModal } from './components/ProvablyFairModal.tsx';
import { RulesModal } from './components/RulesModal.tsx';
import { DepositModal } from './components/DepositModal.tsx';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getIsMuted());

  // Round & Multiplier state
  const [roundState, setRoundState] = useState<RoundState>({
    roundId: 'R-48202',
    status: 'WAITING',
    startTime: 0,
    elapsedMs: 0,
    currentMultiplier: 1.0,
    crashMultiplier: 14.85,
    countdownRemaining: 5.0,
    serverSeedHash: '',
    clientSeed: '',
  });

  // Bets and Multiplayer state
  const [currentBets, setCurrentBets] = useState<Bet[]>([]);
  const [userBetsHistory, setUserBetsHistory] = useState<Bet[]>([]);
  const [flightHistory, setFlightHistory] = useState<FlightHistoryItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // User active bets per panel
  const [panel1ActiveBet, setPanel1ActiveBet] = useState<Bet | null>(null);
  const [panel1QueuedBet, setPanel1QueuedBet] = useState<Bet | null>(null);
  const [panel2ActiveBet, setPanel2ActiveBet] = useState<Bet | null>(null);
  const [panel2QueuedBet, setPanel2QueuedBet] = useState<Bet | null>(null);

  // Synchronized refs to avoid re-subscribing WebSocket listeners on state updates
  const userRef = useRef<User | null>(user);
  userRef.current = user;

  const roundIdRef = useRef<string>(roundState.roundId);
  roundIdRef.current = roundState.roundId;

  const panel1ActiveBetRef = useRef<Bet | null>(panel1ActiveBet);
  panel1ActiveBetRef.current = panel1ActiveBet;
  const panel2ActiveBetRef = useRef<Bet | null>(panel2ActiveBet);
  panel2ActiveBetRef.current = panel2ActiveBet;

  const panel1QueuedBetRef = useRef<Bet | null>(panel1QueuedBet);
  panel1QueuedBetRef.current = panel1QueuedBet;
  const panel2QueuedBetRef = useRef<Bet | null>(panel2QueuedBet);
  panel2QueuedBetRef.current = panel2QueuedBet;

  // Instant win notification
  const [userWonInfo, setUserWonInfo] = useState<UserWonInfo | null>(null);

  const handleClearWonInfo = useCallback(() => {
    setUserWonInfo(null);
  }, []);

  // Modal States
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isProvablyFairOpen, setIsProvablyFairOpen] = useState<boolean>(false);
  const [selectedProofFlight, setSelectedProofFlight] = useState<FlightHistoryItem | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState<boolean>(false);

  // Sync user state
  useEffect(() => {
    const unsub = api.onUserChange((u) => setUser(u));
    api.fetchUser().then((u) => {
      if (u) setUser(u);
    });
    return () => unsub();
  }, []);

  // Listen to WebSocket game events (stable mount-only subscription)
  useEffect(() => {
    // 1. Initial full state sync
    const unsubSync = api.onSyncState((data) => {
      setRoundState(data.round);
      setCurrentBets(data.bets || []);
      if (data.flightHistory?.length) setFlightHistory(data.flightHistory);
      if (data.leaderboard?.length) setLeaderboard(data.leaderboard);
    });

    // 2. Multiplier tick
    const unsubTick = api.onTick(({ multiplier, elapsedMs }) => {
      setRoundState((prev) => ({
        ...prev,
        status: 'FLYING',
        currentMultiplier: multiplier,
        elapsedMs,
      }));
    });

    // 3. Countdown tick
    const unsubCountdown = api.onCountdown(({ countdown, roundId }) => {
      setRoundState((prev) => ({
        ...prev,
        status: 'WAITING',
        countdownRemaining: countdown,
        roundId,
        currentMultiplier: 1.0,
      }));
    });

    // 4. Flight start
    const unsubStart = api.onRoundStart(({ roundId, startTime, bets, serverSeedHash }) => {
      setRoundState((prev) => ({
        ...prev,
        roundId,
        status: 'FLYING',
        startTime,
        elapsedMs: 0,
        currentMultiplier: 1.0,
        serverSeedHash,
      }));
      setCurrentBets(bets);

      // Dismiss prior win notification on new round start
      setUserWonInfo(null);

      // Promote queued bets to active bets
      const nextP1 = panel1QueuedBetRef.current;
      setPanel1ActiveBet(nextP1);
      panel1ActiveBetRef.current = nextP1;
      panel1QueuedBetRef.current = null;
      setPanel1QueuedBet(null);

      const nextP2 = panel2QueuedBetRef.current;
      setPanel2ActiveBet(nextP2);
      panel2ActiveBetRef.current = nextP2;
      panel2QueuedBetRef.current = null;
      setPanel2QueuedBet(null);
    });

    // 5. Flight crash
    const unsubCrash = api.onRoundCrash(({ roundId, crashMultiplier, serverSeed, historyItem }) => {
      setRoundState((prev) => ({
        ...prev,
        roundId,
        status: 'CRASHED',
        crashMultiplier,
        serverSeed,
      }));

      // Dismiss any win notification immediately on crash
      setUserWonInfo(null);

      // Update flight history
      if (historyItem) {
        setFlightHistory((prev) => [historyItem, ...prev.slice(0, 99)]);
      }

      // Mark uncashed bets as lost
      setCurrentBets((prev) =>
        prev.map((b) => (b.status === 'active' ? { ...b, status: 'lost' } : b))
      );

      // Clear user active bets
      setPanel1ActiveBet(null);
      panel1ActiveBetRef.current = null;
      setPanel2ActiveBet(null);
      panel2ActiveBetRef.current = null;
    });

    // 6. Bet placed
    const unsubBetPlaced = api.onBetPlaced((bet) => {
      setCurrentBets((prev) => [...prev, bet]);
    });

    // 7. Bet cashed out
    const unsubCashedOut = api.onBetCashedOut(
      ({ betId, userId, multiplier, payout, username }) => {
        setCurrentBets((prev) =>
          prev.map((b) =>
            b.id === betId
              ? { ...b, status: 'won', cashedOutAt: multiplier, payout }
              : b
          )
        );

        const currentUser = userRef.current;
        const isMyBet =
          (currentUser && userId === currentUser.id) ||
          panel1ActiveBetRef.current?.id === betId ||
          panel2ActiveBetRef.current?.id === betId;

        // If it was the current user's bet
        if (isMyBet) {
          setUserWonInfo({ id: betId, multiplier, payout });
          setUserBetsHistory((prev) => {
            if (prev.some((b) => b.id === betId)) return prev;
            return [
              {
                id: betId,
                roundId: roundIdRef.current,
                userId: currentUser?.id || userId,
                username: currentUser?.username || username,
                avatar: currentUser?.avatar || '👨‍✈️',
                panel: panel2ActiveBetRef.current?.id === betId ? 2 : 1,
                amount: multiplier > 0 ? Number((payout / multiplier).toFixed(2)) : 0,
                autoCashOutAt: null,
                cashedOutAt: multiplier,
                payout,
                status: 'won',
                timestamp: Date.now(),
              },
              ...prev,
            ];
          });

          if (panel1ActiveBetRef.current?.id === betId) {
            setPanel1ActiveBet(null);
            panel1ActiveBetRef.current = null;
          }
          if (panel2ActiveBetRef.current?.id === betId) {
            setPanel2ActiveBet(null);
            panel2ActiveBetRef.current = null;
          }
        }
      }
    );

    return () => {
      unsubSync();
      unsubTick();
      unsubCountdown();
      unsubStart();
      unsubCrash();
      unsubBetPlaced();
      unsubCashedOut();
    };
  }, []);

  // Handle placing a bet
  const handlePlaceBet = async (
    panel: 1 | 2,
    amount: number,
    autoCashOutAt?: number | null
  ) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const res = await api.placeBet({
      panel,
      amount,
      autoCashOutAt,
    });

    if (res.isQueuedForNextRound) {
      if (panel === 1) {
        setPanel1QueuedBet(res.bet);
        panel1QueuedBetRef.current = res.bet;
      } else {
        setPanel2QueuedBet(res.bet);
        panel2QueuedBetRef.current = res.bet;
      }
    } else {
      if (panel === 1) {
        setPanel1ActiveBet(res.bet);
        panel1ActiveBetRef.current = res.bet;
      } else {
        setPanel2ActiveBet(res.bet);
        panel2ActiveBetRef.current = res.bet;
      }
    }
  };

  // Handle cashout
  const handleCashOut = async (betId: string) => {
    try {
      const res = await api.cashOut(betId);
      setUserWonInfo({ id: betId, multiplier: res.multiplier, payout: res.payout });

      if (panel1ActiveBetRef.current?.id === betId) {
        const bet = panel1ActiveBetRef.current;
        setUserBetsHistory((prev) => {
          if (prev.some((b) => b.id === betId)) return prev;
          return [
            { ...bet, status: 'won', cashedOutAt: res.multiplier, payout: res.payout },
            ...prev,
          ];
        });
        setPanel1ActiveBet(null);
        panel1ActiveBetRef.current = null;
      }
      if (panel2ActiveBetRef.current?.id === betId) {
        const bet = panel2ActiveBetRef.current;
        setUserBetsHistory((prev) => {
          if (prev.some((b) => b.id === betId)) return prev;
          return [
            { ...bet, status: 'won', cashedOutAt: res.multiplier, payout: res.payout },
            ...prev,
          ];
        });
        setPanel2ActiveBet(null);
        panel2ActiveBetRef.current = null;
      }
    } catch {
      // Handled in service
    }
  };

  // Handle cancel bet
  const handleCancelBet = async (betId: string) => {
    try {
      await api.cancelBet(betId);
      if (panel1ActiveBetRef.current?.id === betId) {
        setPanel1ActiveBet(null);
        panel1ActiveBetRef.current = null;
      }
      if (panel1QueuedBetRef.current?.id === betId) {
        setPanel1QueuedBet(null);
        panel1QueuedBetRef.current = null;
      }
      if (panel2ActiveBetRef.current?.id === betId) {
        setPanel2ActiveBet(null);
        panel2ActiveBetRef.current = null;
      }
      if (panel2QueuedBetRef.current?.id === betId) {
        setPanel2QueuedBet(null);
        panel2QueuedBetRef.current = null;
      }
    } catch {
      // Handled in service
    }
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleOpenProvablyFair = (item?: FlightHistoryItem) => {
    setSelectedProofFlight(item || flightHistory[0] || null);
    setIsProvablyFairOpen(true);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setPanel1ActiveBet(null);
    setPanel2ActiveBet(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-gray-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Top Navigation & History Pills */}
      <Header
        user={user}
        flightHistory={flightHistory}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenProvablyFair={handleOpenProvablyFair}
        onOpenDeposit={() => setIsDepositOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Aviator Arena */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
        {/* Left Side: Live Multiplayer Lobby & Leaderboard (4 cols on lg) */}
        <div className="lg:col-span-4 w-full order-2 lg:order-1 h-full">
          <MultiplayerFeed
            currentBets={currentBets}
            userBetsHistory={userBetsHistory}
            leaderboard={leaderboard}
            currentUserId={user?.id}
          />
        </div>

        {/* Right Side: Central Flight Stage & Dual Betting Panels (8 cols on lg) */}
        <div className="lg:col-span-8 w-full order-1 lg:order-2 flex flex-col gap-3 sm:gap-4">
          {/* Real-time Multiplier Flight Canvas */}
          <FlightStage
            status={roundState.status}
            currentMultiplier={roundState.currentMultiplier}
            crashMultiplier={roundState.crashMultiplier}
            countdownRemaining={roundState.countdownRemaining}
            roundId={roundState.roundId}
            userWonInfo={userWonInfo}
            onClearWonInfo={handleClearWonInfo}
          />

          {/* Dual Spribe Betting Consoles (Panel 1 & Panel 2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <BettingPanel
              panelNumber={1}
              roundStatus={roundState.status}
              currentMultiplier={roundState.currentMultiplier}
              userBalance={user?.balance || 0}
              activeBet={panel1ActiveBet}
              queuedBet={panel1QueuedBet}
              onPlaceBet={handlePlaceBet}
              onCashOut={handleCashOut}
              onCancelBet={handleCancelBet}
            />

            <BettingPanel
              panelNumber={2}
              roundStatus={roundState.status}
              currentMultiplier={roundState.currentMultiplier}
              userBalance={user?.balance || 0}
              activeBet={panel2ActiveBet}
              queuedBet={panel2QueuedBet}
              onPlaceBet={handlePlaceBet}
              onCashOut={handleCashOut}
              onCancelBet={handleCancelBet}
            />
          </div>
        </div>
      </main>

      {/* Interactive Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          api.fetchUser().then((u) => setUser(u));
        }}
      />

      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      <FlightDataVisualization
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        flightHistory={flightHistory}
        onSelectRoundForProof={(item) => {
          setIsStatsOpen(false);
          handleOpenProvablyFair(item);
        }}
      />

      <ProvablyFairModal
        isOpen={isProvablyFairOpen}
        onClose={() => setIsProvablyFairOpen(false)}
        flightItem={selectedProofFlight}
      />

      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        currentBalance={user?.balance || 0}
      />
    </div>
  );
}
