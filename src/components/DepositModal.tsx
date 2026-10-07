import React, { useState } from 'react';
import { X, PlusCircle, DollarSign, Sparkles } from 'lucide-react';
import { sound } from '../services/sound.ts';
import { api } from '../services/api.ts';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
}) => {
  const [amount, setAmount] = useState<number>(500);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const PRESETS = [100, 250, 500, 1000, 2500];

  const handleDeposit = async () => {
    sound.playClick();
    setLoading(true);
    try {
      await api.faucet(amount);
      sound.playCashOut(5);
      onClose();
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#131621] border border-[#252c40] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-gray-200">
        <div className="flex items-center justify-between border-b border-[#212738] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-950/40 border border-emerald-800/40 rounded-lg text-emerald-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wide font-mono">
                Deposit Demo Funds
              </h2>
              <p className="text-xs text-gray-400">Reload free Aviator demo credits</p>
            </div>
          </div>
          <button
            id="btn-close-deposit-modal"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1e2434] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#181d2a] border border-[#262f44] p-3 rounded-xl mb-4 text-center">
          <span className="text-[11px] text-gray-400 uppercase tracking-wider block">
            Current Balance
          </span>
          <span className="text-2xl font-black font-mono text-emerald-400">
            ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-300 block mb-2">
            Select Deposit Amount
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  sound.playClick();
                  setAmount(p);
                }}
                className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                  amount === p
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 border border-emerald-400'
                    : 'bg-[#181d29] text-gray-300 border border-[#252b3d] hover:bg-[#202738]'
                }`}
              >
                +${p}
              </button>
            ))}
          </div>
        </div>

        <button
          id="btn-confirm-deposit"
          onClick={handleDeposit}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 transition-all active:scale-95 flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" />
          <span>{loading ? 'Adding...' : `Add +$${amount}.00 Demo Credits`}</span>
        </button>
      </div>
    </div>
  );
};
