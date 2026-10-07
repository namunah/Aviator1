import React, { useState } from 'react';
import { X, ShieldCheck, Copy, Check, Info } from 'lucide-react';
import type { FlightHistoryItem } from '../types.ts';
import { sound } from '../services/sound.ts';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  flightItem: FlightHistoryItem | null;
}

export const ProvablyFairModal: React.FC<ProvablyFairModalProps> = ({
  isOpen,
  onClose,
  flightItem,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !flightItem) return null;

  const handleCopy = (text: string, fieldName: string) => {
    sound.playClick();
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#131621] border border-[#252c40] rounded-2xl w-full max-w-lg shadow-2xl p-6 text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#212738] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-950/40 border border-emerald-800/40 rounded-lg text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wide font-mono">
                Provably Fair Flight
              </h2>
              <p className="text-xs text-gray-400">
                100% cryptographically verifiable round outcome
              </p>
            </div>
          </div>
          <button
            id="btn-close-provably-fair"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1e2434] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Round Overview Card */}
        <div className="bg-[#181d2c] border border-[#283149] rounded-xl p-3.5 mb-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-gray-400">
              Round ID
            </span>
            <span className="text-base font-black font-mono text-white">
              {flightItem.roundId}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold text-gray-400">
              Crash Multiplier
            </span>
            <span className="text-xl font-black font-mono text-red-400">
              {flightItem.crashMultiplier.toFixed(2)}x
            </span>
          </div>
        </div>

        {/* Cryptographic Seeds */}
        <div className="space-y-3 mb-4">
          {/* Server Seed */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-300 mb-1">
              <span>Server Seed (Revealed)</span>
              <button
                onClick={() => handleCopy(flightItem.serverSeed, 'serverSeed')}
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                {copiedField === 'serverSeed' ? (
                  <>
                    <Check className="w-3 h-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <div className="bg-[#0b0d13] border border-[#202737] p-2.5 rounded-lg font-mono text-[11px] text-gray-300 break-all select-all">
              {flightItem.serverSeed}
            </div>
          </div>

          {/* Server Seed Hash (SHA-256) */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-300 mb-1">
              <span>Server Seed Hash (SHA-256 generated before round)</span>
              <button
                onClick={() => handleCopy(flightItem.serverSeedHash, 'serverSeedHash')}
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                {copiedField === 'serverSeedHash' ? (
                  <>
                    <Check className="w-3 h-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <div className="bg-[#0b0d13] border border-[#202737] p-2.5 rounded-lg font-mono text-[11px] text-emerald-400/90 break-all select-all">
              {flightItem.serverSeedHash}
            </div>
          </div>

          {/* Client Seed */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-300 mb-1">
              <span>Client Seed</span>
              <button
                onClick={() => handleCopy(flightItem.clientSeed, 'clientSeed')}
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                {copiedField === 'clientSeed' ? (
                  <>
                    <Check className="w-3 h-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <div className="bg-[#0b0d13] border border-[#202737] p-2.5 rounded-lg font-mono text-[11px] text-gray-300 break-all select-all">
              {flightItem.clientSeed}
            </div>
          </div>
        </div>

        {/* Verification Explanation */}
        <div className="bg-[#10131c] border border-[#1f2536] p-3 rounded-xl flex items-start gap-2.5 text-xs text-gray-400">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            The multiplier is generated before the flight begins using HMAC-SHA256 of the
            Server Seed combined with the Client Seed. Because the hash is published before the
            round, the game outcome cannot be altered by either player or operator.
          </span>
        </div>
      </div>
    </div>
  );
};
