import React from 'react';
import {
  Volume2,
  VolumeX,
  PlusCircle,
  HelpCircle,
  BarChart3,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  Plane,
} from 'lucide-react';
import type { User, FlightHistoryItem } from '../types.ts';
import { sound } from '../services/sound.ts';

interface HeaderProps {
  user: User | null;
  flightHistory: FlightHistoryItem[];
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenAuth: () => void;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onOpenProvablyFair: (item?: FlightHistoryItem) => void;
  onOpenDeposit: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  flightHistory,
  isMuted,
  onToggleMute,
  onOpenAuth,
  onOpenRules,
  onOpenStats,
  onOpenProvablyFair,
  onOpenDeposit,
  onLogout,
}) => {
  return (
    <header className="bg-[#101217] border-b border-[#232733] px-3 sm:px-4 py-2 select-none">
      {/* Top Main Bar */}
      <div className="flex items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => onOpenRules()}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#d32f2f] to-[#ff5252] flex items-center justify-center shadow-lg shadow-red-900/30">
              <Plane className="w-5 h-5 text-white -rotate-12 fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-lg tracking-wider leading-none font-mono">
                AVIATOR
              </span>
              <span className="text-[10px] text-red-500 font-semibold tracking-widest uppercase">
                SPRIBE REAL-TIME
              </span>
            </div>
          </div>

          <button
            id="btn-how-to-play"
            onClick={onOpenRules}
            className="hidden md:flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded bg-[#1a1d26] hover:bg-[#232733] transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
            <span>How to Play</span>
          </button>

          <button
            id="btn-provably-fair-top"
            onClick={() => onOpenProvablyFair(flightHistory[0])}
            className="hidden lg:flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-950/30 border border-emerald-800/40 hover:bg-emerald-950/50 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Provably Fair</span>
          </button>
        </div>

        {/* Right Section: Stats, Balance, Sound, User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Historical Data & Charts Button */}
          <button
            id="btn-open-charts"
            onClick={onOpenStats}
            title="Flight Data Analytics"
            className="flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-950/30 border border-amber-800/40 hover:bg-amber-900/40 px-2.5 py-1.5 rounded-lg transition-all"
          >
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Analytics</span>
          </button>

          {/* Sound Toggle */}
          <button
            id="btn-toggle-sound"
            onClick={() => {
              sound.playClick();
              onToggleMute();
            }}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="w-8 h-8 rounded-lg bg-[#1a1d26] hover:bg-[#252a37] border border-[#2b3040] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-gray-300" />}
          </button>

          {/* User Balance & Deposit */}
          {user ? (
            <div className="flex items-center bg-[#181b24] border border-[#262c3d] rounded-lg p-1 pl-2.5 sm:pl-3 gap-2">
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                  Balance
                </span>
                <span className="text-sm sm:text-base font-extrabold text-emerald-400 font-mono tracking-tight">
                  ${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <button
                id="btn-faucet-deposit"
                onClick={onOpenDeposit}
                title="Add Demo Funds"
                className="bg-emerald-600 hover:bg-emerald-500 text-white p-1 sm:px-2.5 sm:py-1 rounded font-semibold text-xs flex items-center gap-1 shadow-md shadow-emerald-900/30 transition-all hover:scale-105 active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Deposit</span>
              </button>
            </div>
          ) : null}

          {/* User Auth Profile / Login */}
          {user ? (
            <div className="flex items-center gap-1.5 bg-[#1a1d26] border border-[#282e3f] rounded-lg p-1 pr-2">
              <span className="text-lg leading-none pl-1">{user.avatar || '👨‍✈️'}</span>
              <span className="text-xs font-semibold text-gray-200 hidden md:inline truncate max-w-[90px]">
                {user.username}
              </span>
              <button
                id="btn-logout"
                onClick={onLogout}
                title="Sign Out"
                className="text-gray-400 hover:text-red-400 p-1 ml-1 rounded hover:bg-[#232733] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="btn-open-login"
              onClick={onOpenAuth}
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-red-950/40 transition-transform active:scale-95"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Recent Multipliers Bar (Spribe-style colored badges) */}
      <div className="mt-2 pt-2 border-t border-[#1d212b] flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
          History:
        </span>
        <div className="flex items-center gap-1.5">
          {flightHistory.slice(0, 18).map((item, idx) => {
            const mult = item.crashMultiplier;
            let badgeStyle =
              'bg-[#1a233a] text-blue-400 border-blue-800/40 hover:border-blue-500'; // < 2.00x
            if (mult >= 10.0) {
              badgeStyle =
                'bg-[#3b1228] text-pink-400 font-bold border-pink-700/50 hover:border-pink-400';
            } else if (mult >= 2.0) {
              badgeStyle =
                'bg-[#281c3c] text-purple-300 font-semibold border-purple-800/50 hover:border-purple-400';
            }

            return (
              <button
                key={item.roundId || idx}
                onClick={() => onOpenProvablyFair(item)}
                title={`Round ${item.roundId} crashed at ${mult.toFixed(2)}x. Click for Provably Fair seeds.`}
                className={`text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-all hover:scale-110 active:scale-95 shrink-0 font-mono font-medium ${badgeStyle}`}
              >
                {mult.toFixed(2)}x
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
