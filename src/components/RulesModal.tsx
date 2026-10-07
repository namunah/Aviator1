import React from 'react';
import { X, HelpCircle, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { sound } from '../services/sound.ts';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#131621] border border-[#252c40] rounded-2xl w-full max-w-lg shadow-2xl p-6 text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#212738] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-950/40 border border-red-800/40 rounded-lg text-red-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wide font-mono">
                How to Play Aviator
              </h2>
              <p className="text-xs text-gray-400">
                Official Spribe real-time crash mechanics & rules
              </p>
            </div>
          </div>
          <button
            id="btn-close-rules-modal"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1e2434] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rules content */}
        <div className="space-y-4 text-xs text-gray-300">
          <div className="flex items-start gap-3 bg-[#171b26] p-3 rounded-xl border border-[#232a3d]">
            <div className="w-6 h-6 rounded-full bg-red-600/30 border border-red-500 flex items-center justify-center text-red-400 font-bold shrink-0">
              1
            </div>
            <div>
              <h4 className="font-bold text-white mb-0.5">Place One or Two Bets</h4>
              <p className="text-gray-400">
                Set your bet amount in Panel 1 and/or Panel 2 before the round starts during the
                5-second countdown.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-[#171b26] p-3 rounded-xl border border-[#232a3d]">
            <div className="w-6 h-6 rounded-full bg-amber-600/30 border border-amber-500 flex items-center justify-center text-amber-400 font-bold shrink-0">
              2
            </div>
            <div>
              <h4 className="font-bold text-white mb-0.5">Watch the Multiplier Ascend</h4>
              <p className="text-gray-400">
                The lucky plane takes off and the coefficient multiplier starts at 1.00x, climbing
                exponentially.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-[#171b26] p-3 rounded-xl border border-[#232a3d]">
            <div className="w-6 h-6 rounded-full bg-emerald-600/30 border border-emerald-500 flex items-center justify-center text-emerald-400 font-bold shrink-0">
              3
            </div>
            <div>
              <h4 className="font-bold text-white mb-0.5">Cash Out Before the Plane Flies Away!</h4>
              <p className="text-gray-400">
                Hit the green <strong>CASH OUT</strong> button to multiply your bet by the current
                odds. If the plane flies away before you cash out, the bet is lost!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-[#171b26] p-3 rounded-xl border border-[#232a3d]">
            <div className="w-6 h-6 rounded-full bg-purple-600/30 border border-purple-500 flex items-center justify-center text-purple-400 font-bold shrink-0">
              4
            </div>
            <div>
              <h4 className="font-bold text-white mb-0.5">Auto Cash Out & Auto Bet</h4>
              <p className="text-gray-400">
                Switch to the <strong>Auto</strong> tab to configure automatic bet placement and
                automatic cash out at your target multiplier (e.g. 2.00x).
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="w-full mt-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
        >
          Got it, Let's Fly!
        </button>
      </div>
    </div>
  );
};
