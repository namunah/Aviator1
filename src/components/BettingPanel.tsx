import React, { useState, useEffect } from 'react';
import { Minus, Plus, Zap, Check } from 'lucide-react';
import type { Bet, RoundStatus } from '../types.ts';
import { sound } from '../services/sound.ts';

interface BettingPanelProps {
  panelNumber: 1 | 2;
  roundStatus: RoundStatus;
  currentMultiplier: number;
  userBalance: number;
  activeBet: Bet | null;
  queuedBet: Bet | null;
  onPlaceBet: (panel: 1 | 2, amount: number, autoCashOutAt?: number | null) => Promise<void>;
  onCashOut: (betId: string) => Promise<void>;
  onCancelBet: (betId: string) => Promise<void>;
}

export const BettingPanel: React.FC<BettingPanelProps> = ({
  panelNumber,
  roundStatus,
  currentMultiplier,
  userBalance,
  activeBet,
  queuedBet,
  onPlaceBet,
  onCashOut,
  onCancelBet,
}) => {
  const [tab, setTab] = useState<'bet' | 'auto'>('bet');
  const [amount, setAmount] = useState<number>(panelNumber === 1 ? 10.0 : 20.0);
  const [isAutoBetEnabled, setIsAutoBetEnabled] = useState<boolean>(false);
  const [isAutoCashOutEnabled, setIsAutoCashOutEnabled] = useState<boolean>(false);
  const [autoCashOutValue, setAutoCashOutValue] = useState<number>(2.0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const QUICK_CHIPS = [1.0, 2.0, 5.0, 10.0, 50.0, 100.0];

  // Auto-Bet trigger when round transitions to WAITING
  useEffect(() => {
    if (
      roundStatus === 'WAITING' &&
      isAutoBetEnabled &&
      !activeBet &&
      !queuedBet &&
      userBalance >= amount
    ) {
      handleBetSubmit();
    }
  }, [roundStatus, isAutoBetEnabled, activeBet, queuedBet, userBalance, amount]);

  const handleAmountStep = (delta: number) => {
    sound.playClick();
    setAmount((prev) => Math.max(1.0, Number((prev + delta).toFixed(2))));
  };

  const handleQuickChip = (val: number) => {
    sound.playClick();
    setAmount(val);
  };

  const handleAutoCashOutStep = (delta: number) => {
    sound.playClick();
    setAutoCashOutValue((prev) => Math.max(1.05, Number((prev + delta).toFixed(2))));
  };

  const handleBetSubmit = async () => {
    if (isSubmitting) return;
    if (userBalance < amount) {
      return;
    }
    sound.playClick();
    setIsSubmitting(true);
    try {
      await onPlaceBet(
        panelNumber,
        amount,
        isAutoCashOutEnabled ? autoCashOutValue : null
      );
    } catch {
      // Error handled upstream
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCashOutClick = async () => {
    if (!activeBet || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCashOut(activeBet.id);
    } catch {
      // Error handled upstream
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = async () => {
    const betToCancel = activeBet || queuedBet;
    if (!betToCancel || isSubmitting) return;
    sound.playClick();
    setIsSubmitting(true);
    try {
      await onCancelBet(betToCancel.id);
    } catch {
      // Error handled upstream
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine button status and UI
  const isBetInFlight = Boolean(activeBet && activeBet.status === 'active' && roundStatus === 'FLYING');
  const livePayout = isBetInFlight && activeBet ? Number((activeBet.amount * currentMultiplier).toFixed(2)) : 0;

  return (
    <div
      id={`betting-panel-${panelNumber}`}
      className="bg-[#151821] border border-[#232938] rounded-xl p-3 flex flex-col justify-between shadow-lg"
    >
      {/* Panel Tab Selector: Bet / Auto */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex bg-[#0f1117] p-0.5 rounded-lg border border-[#212634]">
          <button
            id={`btn-tab-manual-${panelNumber}`}
            onClick={() => {
              sound.playClick();
              setTab('bet');
            }}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              tab === 'bet'
                ? 'bg-[#2a3040] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Bet
          </button>
          <button
            id={`btn-tab-auto-${panelNumber}`}
            onClick={() => {
              sound.playClick();
              setTab('auto');
            }}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
              tab === 'auto'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Auto</span>
          </button>
        </div>

        <span className="text-[11px] font-mono font-semibold text-gray-500 uppercase">
          Panel {panelNumber}
        </span>
      </div>

      {/* Main Controls Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        {/* Left column: Amount input & Quick chips */}
        <div className="flex flex-col gap-2">
          {/* Stepper Input */}
          <div className="flex items-center bg-[#0d0f14] border border-[#252b3b] rounded-lg p-1">
            <button
              id={`btn-minus-${panelNumber}`}
              onClick={() => handleAmountStep(-1)}
              disabled={isBetInFlight}
              className="w-8 h-8 rounded bg-[#1a1f2c] hover:bg-[#272f42] text-gray-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <div className="flex-1 text-center font-mono font-extrabold text-base text-white">
              ${amount.toFixed(2)}
            </div>
            <button
              id={`btn-plus-${panelNumber}`}
              onClick={() => handleAmountStep(1)}
              disabled={isBetInFlight}
              className="w-8 h-8 rounded bg-[#1a1f2c] hover:bg-[#272f42] text-gray-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Chip Presets */}
          <div className="grid grid-cols-6 gap-1">
            {QUICK_CHIPS.map((chipVal) => (
              <button
                key={chipVal}
                id={`btn-chip-${panelNumber}-${chipVal}`}
                onClick={() => handleQuickChip(chipVal)}
                disabled={isBetInFlight}
                className={`text-[11px] font-mono py-1 rounded bg-[#1c212e] hover:bg-[#283042] transition-colors ${
                  amount === chipVal
                    ? 'border border-red-500 text-red-400 font-bold'
                    : 'text-gray-400 border border-transparent'
                } disabled:opacity-40`}
              >
                ${chipVal}
              </button>
            ))}
          </div>
        </div>

        {/* Right column: Massive Spribe Action Button */}
        <div className="h-full flex flex-col justify-center">
          {isBetInFlight ? (
            /* Luminous Green Cash Out Button */
            <button
              id={`btn-cashout-${panelNumber}`}
              onClick={handleCashOutClick}
              disabled={isSubmitting}
              className="w-full h-16 rounded-xl bg-gradient-to-r from-[#28a745] to-[#20c997] hover:from-[#218838] hover:to-[#17a2b8] text-white font-black flex flex-col items-center justify-center shadow-lg shadow-green-900/50 border-2 border-emerald-300 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer animate-pulse"
            >
              <span className="text-xs uppercase tracking-widest text-emerald-100">
                CASH OUT
              </span>
              <span className="text-xl sm:text-2xl font-mono tracking-tight leading-none text-white drop-shadow">
                ${livePayout.toFixed(2)}
              </span>
            </button>
          ) : activeBet && roundStatus === 'WAITING' ? (
            /* Cancel Bet before round starts */
            <button
              id={`btn-cancel-${panelNumber}`}
              onClick={handleCancelClick}
              disabled={isSubmitting}
              className="w-full h-16 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-black flex flex-col items-center justify-center shadow-lg shadow-red-950/40 border border-red-400 transition-all active:scale-95"
            >
              <span className="text-xs uppercase tracking-widest text-red-200">
                CANCEL
              </span>
              <span className="text-sm font-mono text-white">
                ${activeBet.amount.toFixed(2)} (WAITING)
              </span>
            </button>
          ) : queuedBet ? (
            /* Queued Bet for Next Round */
            <button
              id={`btn-cancel-queued-${panelNumber}`}
              onClick={handleCancelClick}
              disabled={isSubmitting}
              className="w-full h-16 rounded-xl bg-[#282d3c] hover:bg-[#343b4e] text-amber-400 font-black flex flex-col items-center justify-center border border-amber-600/40 transition-all active:scale-95"
            >
              <span className="text-[11px] uppercase tracking-wider text-amber-300">
                WAITING FOR NEXT ROUND
              </span>
              <span className="text-xs text-gray-300">
                Cancel ${queuedBet.amount.toFixed(2)}
              </span>
            </button>
          ) : (
            /* Standard Place Bet Button */
            <button
              id={`btn-bet-${panelNumber}`}
              onClick={handleBetSubmit}
              disabled={isSubmitting || userBalance < amount}
              className={`w-full h-16 rounded-xl font-black flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 ${
                userBalance < amount
                  ? 'bg-[#222736] text-gray-500 border border-gray-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white border-2 border-emerald-400/50 shadow-emerald-950/40 cursor-pointer hover:scale-[1.02]'
              }`}
            >
              <span className="text-sm uppercase tracking-widest leading-none">
                {roundStatus === 'WAITING' ? 'BET' : 'BET (NEXT ROUND)'}
              </span>
              <span className="text-lg font-mono font-extrabold mt-0.5">
                ${amount.toFixed(2)}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Auto Settings Drawer (Shown when Auto tab is selected) */}
      {tab === 'auto' && (
        <div className="mt-3 pt-2.5 border-t border-[#232938] flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Auto Bet Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-gray-300 select-none">
            <input
              id={`check-auto-bet-${panelNumber}`}
              type="checkbox"
              checked={isAutoBetEnabled}
              onChange={(e) => {
                sound.playClick();
                setIsAutoBetEnabled(e.target.checked);
              }}
              className="w-4 h-4 rounded accent-red-600 cursor-pointer"
            />
            <span className="font-semibold">Auto Bet</span>
          </label>

          {/* Auto Cash Out Toggle & Multiplier */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 select-none">
              <input
                id={`check-auto-cashout-${panelNumber}`}
                type="checkbox"
                checked={isAutoCashOutEnabled}
                onChange={(e) => {
                  sound.playClick();
                  setIsAutoCashOutEnabled(e.target.checked);
                }}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
              <span className="font-semibold">Auto Cash Out</span>
            </label>

            <div className="flex items-center bg-[#0d0f14] border border-[#252b3b] rounded-lg p-0.5">
              <button
                id={`btn-cashout-minus-${panelNumber}`}
                onClick={() => handleAutoCashOutStep(-0.1)}
                disabled={!isAutoCashOutEnabled}
                className="w-6 h-6 rounded bg-[#1a1f2c] hover:bg-[#272f42] text-gray-300 flex items-center justify-center disabled:opacity-30"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-mono font-bold px-2 text-emerald-400">
                {autoCashOutValue.toFixed(2)}x
              </span>
              <button
                id={`btn-cashout-plus-${panelNumber}`}
                onClick={() => handleAutoCashOutStep(0.1)}
                disabled={!isAutoCashOutEnabled}
                className="w-6 h-6 rounded bg-[#1a1f2c] hover:bg-[#272f42] text-gray-300 flex items-center justify-center disabled:opacity-30"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
