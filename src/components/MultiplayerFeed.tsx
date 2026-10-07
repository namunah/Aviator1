import React, { useState } from 'react';
import { Users, User as UserIcon, Trophy, Flame } from 'lucide-react';
import type { Bet, LeaderboardEntry } from '../types.ts';
import { sound } from '../services/sound.ts';

interface MultiplayerFeedProps {
  currentBets: Bet[];
  userBetsHistory: Bet[];
  leaderboard: LeaderboardEntry[];
  currentUserId?: string;
}

export const MultiplayerFeed: React.FC<MultiplayerFeedProps> = ({
  currentBets,
  userBetsHistory,
  leaderboard,
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'top'>('all');
  const [leaderboardFilter, setLeaderboardFilter] = useState<'multiplier' | 'win'>('win');

  const totalPool = currentBets.reduce((acc, b) => acc + b.amount, 0);

  // Sorted leaderboard based on filter
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (leaderboardFilter === 'multiplier') {
      return b.multiplier - a.multiplier;
    }
    return b.winAmount - a.winAmount;
  });

  return (
    <div
      id="multiplayer-feed-panel"
      className="bg-[#12141c] border border-[#222736] rounded-xl flex flex-col h-full overflow-hidden shadow-lg"
    >
      {/* Tab Navigation Header */}
      <div className="flex items-center justify-between border-b border-[#202534] bg-[#0f1118] px-3 py-2">
        <div className="flex items-center gap-1 bg-[#171a24] p-0.5 rounded-lg border border-[#232938]">
          <button
            id="tab-all-bets"
            onClick={() => {
              sound.playClick();
              setActiveTab('all');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all ${
              activeTab === 'all'
                ? 'bg-[#2a3042] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Bets</span>
            <span className="text-[10px] bg-red-950/80 text-red-400 px-1.5 py-0.2 rounded-full font-mono">
              {currentBets.length}
            </span>
          </button>

          <button
            id="tab-my-bets"
            onClick={() => {
              sound.playClick();
              setActiveTab('my');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all ${
              activeTab === 'my'
                ? 'bg-[#2a3042] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>My Bets</span>
          </button>

          <button
            id="tab-top-leaderboard"
            onClick={() => {
              sound.playClick();
              setActiveTab('top');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all ${
              activeTab === 'top'
                ? 'bg-[#2a3042] text-amber-400 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Top</span>
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider block">
              Round Pool
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              ${totalPool.toFixed(2)}
            </span>
          </div>
        )}

        {activeTab === 'top' && (
          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => setLeaderboardFilter('win')}
              className={`px-2 py-0.5 rounded ${
                leaderboardFilter === 'win'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Biggest Win
            </button>
            <button
              onClick={() => setLeaderboardFilter('multiplier')}
              className={`px-2 py-0.5 rounded ${
                leaderboardFilter === 'multiplier'
                  ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Multiplier
            </button>
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto max-h-[380px] p-2 divide-y divide-[#1b1f2b] no-scrollbar">
        {/* TAB 1: ALL BETS IN CURRENT ROUND */}
        {activeTab === 'all' && (
          <div>
            {currentBets.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                Waiting for bets in current round...
              </div>
            ) : (
              currentBets.map((bet) => {
                const isUser = bet.userId === currentUserId;
                return (
                  <div
                    key={bet.id}
                    className={`flex items-center justify-between py-2 px-2 text-xs transition-colors rounded ${
                      isUser
                        ? 'bg-red-950/20 border border-red-900/40'
                        : 'hover:bg-[#181c26]'
                    }`}
                  >
                    {/* User info */}
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <span className="text-base">{bet.avatar || '👤'}</span>
                      <div className="flex flex-col">
                        <span className={`font-semibold ${isUser ? 'text-red-400 font-bold' : 'text-gray-200'}`}>
                          {bet.username} {isUser && '(You)'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          Bet: ${bet.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Status & Multiplier Pill */}
                    <div className="flex items-center gap-3">
                      {bet.status === 'won' && bet.cashedOutAt ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-[#1d3525] text-emerald-400 border border-emerald-700/50">
                            {bet.cashedOutAt.toFixed(2)}x
                          </span>
                          <span className="font-mono font-bold text-emerald-400 text-xs min-w-[65px] text-right">
                            +${bet.payout?.toFixed(2)}
                          </span>
                        </div>
                      ) : bet.status === 'lost' ? (
                        <span className="text-[11px] text-red-500 font-medium font-mono">
                          Flew away
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1 animate-pulse">
                          <Flame className="w-3 h-3 text-amber-400" />
                          <span>Flying</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: MY BETS HISTORY */}
        {activeTab === 'my' && (
          <div>
            {userBetsHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                You haven't placed any bets yet. Place a bet below!
              </div>
            ) : (
              userBetsHistory.map((bet) => (
                <div
                  key={bet.id}
                  className="flex items-center justify-between py-2 px-2 text-xs hover:bg-[#181c26] transition-colors rounded"
                >
                  <div className="flex flex-col">
                    <span className="font-mono font-bold text-gray-300">
                      Round {bet.roundId}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(bet.timestamp).toLocaleTimeString()} · Bet ${bet.amount.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    {bet.status === 'won' ? (
                      <div className="flex flex-col items-end">
                        <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {bet.cashedOutAt?.toFixed(2)}x
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                          +${bet.payout?.toFixed(2)}
                        </span>
                      </div>
                    ) : bet.status === 'lost' ? (
                      <span className="px-2 py-0.5 rounded font-mono text-[11px] font-medium bg-red-950/60 text-red-400 border border-red-900/50">
                        -${bet.amount.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-amber-400 text-xs">Waiting...</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: LEADERBOARD */}
        {activeTab === 'top' && (
          <div>
            {sortedLeaderboard.map((entry, idx) => {
              let medal = null;
              if (idx === 0) medal = '🥇';
              else if (idx === 1) medal = '🥈';
              else if (idx === 2) medal = '🥉';

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2 px-2 text-xs hover:bg-[#181c26] transition-colors rounded"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 text-center font-mono font-bold text-gray-400">
                      {medal || idx + 1}
                    </div>
                    <span className="text-base">{entry.avatar}</span>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-200">{entry.username}</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        Bet ${entry.betAmount.toFixed(2)} · Round {entry.roundId}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800/60">
                      {entry.multiplier.toFixed(2)}x
                    </span>
                    <span className="font-mono font-black text-amber-400 text-xs min-w-[70px]">
                      ${entry.winAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
