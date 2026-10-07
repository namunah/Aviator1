import React, { useState } from 'react';
import { X, TrendingUp, BarChart2, ShieldCheck, Activity, Award } from 'lucide-react';
import type { FlightHistoryItem } from '../types.ts';
import { sound } from '../services/sound.ts';

interface FlightDataVisualizationProps {
  isOpen: boolean;
  onClose: () => void;
  flightHistory: FlightHistoryItem[];
  onSelectRoundForProof: (item: FlightHistoryItem) => void;
}

export const FlightDataVisualization: React.FC<FlightDataVisualizationProps> = ({
  isOpen,
  onClose,
  flightHistory,
  onSelectRoundForProof,
}) => {
  const [hoveredRound, setHoveredRound] = useState<FlightHistoryItem | null>(null);

  if (!isOpen) return null;

  // Compute metrics from flightHistory
  const totalRounds = flightHistory.length || 1;
  const multipliers = flightHistory.map((f) => f.crashMultiplier);
  const maxMultiplier = Math.max(...multipliers, 1.0);
  const minMultiplier = Math.min(...multipliers, 1.0);
  const avgMultiplier = Number(
    (multipliers.reduce((a, b) => a + b, 0) / totalRounds).toFixed(2)
  );

  // Tiers distribution
  const lowCount = multipliers.filter((m) => m < 2.0).length;
  const mediumCount = multipliers.filter((m) => m >= 2.0 && m < 5.0).length;
  const highCount = multipliers.filter((m) => m >= 5.0 && m < 10.0).length;
  const hugeCount = multipliers.filter((m) => m >= 10.0).length;

  const lowPct = Math.round((lowCount / totalRounds) * 100);
  const mediumPct = Math.round((mediumCount / totalRounds) * 100);
  const highPct = Math.round((highCount / totalRounds) * 100);
  const hugePct = Math.round((hugeCount / totalRounds) * 100);

  // Streaks
  let currentStreak = 0;
  let maxWinStreak = 0;
  for (const m of multipliers) {
    if (m >= 2.0) {
      currentStreak++;
      if (currentStreak > maxWinStreak) maxWinStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  // Instant crash (<1.20x) count
  const instantCrashCount = multipliers.filter((m) => m < 1.2).length;
  const instantCrashPct = Math.round((instantCrashCount / totalRounds) * 100);

  // SVG Chart Dimensions
  const chartHeight = 160;
  const chartWidth = 560;
  const displayItems = flightHistory.slice(0, 40).reverse(); // oldest to newest

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#131620] border border-[#272e42] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-5 text-gray-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#232a3d] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-950/40 border border-amber-800/40 rounded-lg text-amber-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wide font-mono">
                Flight Data Analytics
              </h2>
              <p className="text-xs text-gray-400">
                Statistical distribution and trends for the last {totalRounds} flights
              </p>
            </div>
          </div>
          <button
            id="btn-close-stats-modal"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#202636] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <div className="bg-[#181d2a] border border-[#262f45] rounded-xl p-2.5 flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">
              Average Crash
            </span>
            <span className="text-xl font-black font-mono text-emerald-400 mt-0.5">
              {avgMultiplier}x
            </span>
            <span className="text-[10px] text-gray-500">Across {totalRounds} flights</span>
          </div>

          <div className="bg-[#181d2a] border border-[#262f45] rounded-xl p-2.5 flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">
              Max Flight
            </span>
            <span className="text-xl font-black font-mono text-pink-400 mt-0.5">
              {maxMultiplier.toFixed(2)}x
            </span>
            <span className="text-[10px] text-gray-500">Top ceiling</span>
          </div>

          <div className="bg-[#181d2a] border border-[#262f45] rounded-xl p-2.5 flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">
              RTP (House Edge)
            </span>
            <span className="text-xl font-black font-mono text-blue-400 mt-0.5">
              97.0%
            </span>
            <span className="text-[10px] text-gray-500">Certified Provably Fair</span>
          </div>

          <div className="bg-[#181d2a] border border-[#262f45] rounded-xl p-2.5 flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">
              Max 2x+ Streak
            </span>
            <span className="text-xl font-black font-mono text-amber-400 mt-0.5">
              {maxWinStreak} In A Row
            </span>
            <span className="text-[10px] text-gray-500">Green flight run</span>
          </div>
        </div>

        {/* Interactive Flight Timeline Chart */}
        <div className="bg-[#171b26] border border-[#262f45] rounded-xl p-3 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Crash Multiplier Timeline (Past 40 Flights)</span>
            </div>
            {hoveredRound && (
              <div className="text-xs font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700/50">
                Round {hoveredRound.roundId}: {hoveredRound.crashMultiplier.toFixed(2)}x
              </div>
            )}
          </div>

          {/* SVG Bar Chart */}
          <div className="w-full overflow-x-auto">
            <svg
              className="w-full h-36"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
            >
              {/* Horizontal Reference Lines */}
              <line
                x1="0"
                y1={chartHeight - 20}
                x2={chartWidth}
                y2={chartHeight - 20}
                stroke="#2a3348"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1={chartHeight * 0.5}
                x2={chartWidth}
                y2={chartHeight * 0.5}
                stroke="#222b3e"
                strokeDasharray="4 4"
                strokeWidth="1"
              />

              {/* Data Bars */}
              {displayItems.map((item, idx) => {
                const barWidth = chartWidth / displayItems.length - 3;
                const x = idx * (chartWidth / displayItems.length) + 1.5;

                // Scale logarithmically so huge multipliers don't dwarf smaller ones
                const scaledHeight = Math.min(
                  Math.log(item.crashMultiplier + 0.1) * 35 + 10,
                  chartHeight - 25
                );
                const y = chartHeight - 20 - scaledHeight;

                let fill = '#3b82f6'; // < 2.0x
                if (item.crashMultiplier >= 10.0) fill = '#ec4899';
                else if (item.crashMultiplier >= 5.0) fill = '#a855f7';
                else if (item.crashMultiplier >= 2.0) fill = '#10b981';

                const isHovered = hoveredRound?.roundId === item.roundId;

                return (
                  <g
                    key={item.roundId}
                    className="cursor-pointer transition-opacity"
                    onMouseEnter={() => setHoveredRound(item)}
                    onMouseLeave={() => setHoveredRound(null)}
                    onClick={() => onSelectRoundForProof(item)}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={scaledHeight}
                      rx="2"
                      fill={fill}
                      opacity={isHovered ? 1 : 0.8}
                      stroke={isHovered ? '#ffffff' : 'none'}
                      strokeWidth="1"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
            <span>Oldest (40 rounds ago)</span>
            <span>Hover a bar to inspect · Click for Provably Fair seed</span>
            <span>Latest</span>
          </div>
        </div>

        {/* Multiplier Distribution Breakdown */}
        <div className="bg-[#171b26] border border-[#262f45] rounded-xl p-3.5 mb-4">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-3">
            Multiplier Tier Distribution
          </span>

          <div className="space-y-2.5">
            {/* Tier 1 */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-blue-400 font-bold">&lt; 2.00x (Low Tier)</span>
                <span className="text-gray-300">
                  {lowCount} rounds ({lowPct}%)
                </span>
              </div>
              <div className="w-full h-2 bg-[#222838] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${lowPct}%` }}
                />
              </div>
            </div>

            {/* Tier 2 */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-emerald-400 font-bold">2.00x - 4.99x (Medium Tier)</span>
                <span className="text-gray-300">
                  {mediumCount} rounds ({mediumPct}%)
                </span>
              </div>
              <div className="w-full h-2 bg-[#222838] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${mediumPct}%` }}
                />
              </div>
            </div>

            {/* Tier 3 */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-purple-400 font-bold">5.00x - 9.99x (High Tier)</span>
                <span className="text-gray-300">
                  {highCount} rounds ({highPct}%)
                </span>
              </div>
              <div className="w-full h-2 bg-[#222838] rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${highPct}%` }}
                />
              </div>
            </div>

            {/* Tier 4 */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-pink-400 font-bold">10.00x+ (Huge Flyaways)</span>
                <span className="text-gray-300">
                  {hugeCount} rounds ({hugePct}%)
                </span>
              </div>
              <div className="w-full h-2 bg-[#222838] rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-500 rounded-full"
                  style={{ width: `${hugePct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Instant Crash / Edge Statistics */}
        <div className="flex items-center justify-between text-xs bg-[#11141c] border border-[#232938] rounded-xl p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-gray-300">
              Immediate Crashes (&lt; 1.20x):{' '}
              <strong className="text-red-400 font-mono">
                {instantCrashCount} ({instantCrashPct}%)
              </strong>
            </span>
          </div>
          <span className="text-gray-500 text-[11px]">
            Spribe Standard 1:33 (3.03%) instant crash rate
          </span>
        </div>
      </div>
    </div>
  );
};
