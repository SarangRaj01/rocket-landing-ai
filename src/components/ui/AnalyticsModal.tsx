import React, { useMemo } from 'react';
import {
  X,
  TrendingUp,
  Activity,
  Award,
  AlertTriangle,
  Clock,
  Compass,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { useSimulationStore } from '../../state/simulationStore';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose }) => {
  const stats = useSimulationStore((s) => s.stats);

  // Compute moving average and chart dataset from recentEpisodes
  const chartData = useMemo(() => {
    let runningSum = 0;
    const windowSize = 10;

    return stats.recentEpisodes.map((ep, idx) => {
      runningSum += ep.totalReward;
      if (idx >= windowSize) {
        runningSum -= stats.recentEpisodes[idx - windowSize].totalReward;
      }
      const count = Math.min(idx + 1, windowSize);
      const movingAvg = runningSum / count;

      return {
        episode: ep.episodeNumber,
        reward: Math.round(ep.totalReward * 10) / 10,
        movingAvg: Math.round(movingAvg * 10) / 10,
        tilt: Math.round(ep.finalTiltDeg * 10) / 10,
        velocity: Math.round(Math.abs(ep.finalVelocity[1]) * 100) / 100,
        status: ep.status,
        duration: Math.round(ep.durationSeconds * 10) / 10,
      };
    });
  }, [stats.recentEpisodes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-black tracking-wider text-slate-100">
              REINFORCEMENT LEARNING ANALYTICS & DIAGNOSTICS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase">Total Episodes</div>
              <div className="text-xl font-black text-slate-100 mt-1">
                {stats.totalEpisodes}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase flex items-center space-x-1">
                <Award className="w-3 h-3 text-emerald-400" />
                <span>Landings</span>
              </div>
              <div className="text-xl font-black text-emerald-400 mt-1">
                {stats.successfulLandings}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Crashes</span>
              </div>
              <div className="text-xl font-black text-rose-400 mt-1">
                {stats.crashCount}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase">Success Rate</div>
              <div className="text-xl font-black text-amber-400 mt-1">
                {stats.successRateRecent.toFixed(1)}%
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase">Best Reward</div>
              <div className="text-xl font-black text-emerald-400 mt-1">
                {stats.bestReward > 0 ? '+' : ''}
                {Math.round(stats.bestReward)}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase">Recent Avg</div>
              <div className="text-xl font-black text-cyan-400 mt-1">
                {stats.averageRewardRecent > 0 ? '+' : ''}
                {Math.round(stats.averageRewardRecent)}
              </div>
            </div>
          </div>

          {/* Chart 1: Raw Episode Reward vs Moving Average */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>EPISODE REWARD & MOVING AVERAGE</span>
              </div>
              <div className="flex items-center space-x-4 text-[10px]">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />
                  <span className="text-slate-400">Raw Reward</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  <span className="text-emerald-400">10-Ep SMA Trend</span>
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="episode" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#090d16',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="reward"
                      stroke="#64748b"
                      strokeWidth={1}
                      dot={false}
                      opacity={0.6}
                    />
                    <Line
                      type="monotone"
                      dataKey="movingAvg"
                      stroke="#00ff66"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Run training episodes to populate learning curve...
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Touchdown Velocity & Tilt */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Impact Speed */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 mb-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>TERMINAL VERTICAL VELOCITY (|Vy| m/s)</span>
              </div>
              <div className="h-44 w-full">
                {chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="episode" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#090d16',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="velocity"
                        stroke="#06b6d4"
                        fill="#06b6d4"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    Awaiting data...
                  </div>
                )}
              </div>
            </div>

            {/* Tilt Angle */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 mb-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>TERMINAL TILT ANGLE (Degrees)</span>
              </div>
              <div className="h-44 w-full">
                {chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="episode" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#090d16',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="tilt"
                        stroke="#f59e0b"
                        fill="#f59e0b"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    Awaiting data...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Episodes History Table */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-200 mb-2.5">
              RECENT EPISODE LOGS
            </div>
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-left text-[11px] text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[9px] sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Episode</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Reward</th>
                    <th className="py-2 px-3">Duration</th>
                    <th className="py-2 px-3">Final Tilt</th>
                    <th className="py-2 px-3">Impact Vy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stats.recentEpisodes.slice(-15).reverse().map((ep) => (
                    <tr key={ep.episodeNumber} className="hover:bg-slate-800/30">
                      <td className="py-1.5 px-3 font-semibold">#{ep.episodeNumber}</td>
                      <td className="py-1.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            ep.status === 'LANDED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : ep.status === 'CRASHED'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {ep.status}
                        </span>
                      </td>
                      <td
                        className={`py-1.5 px-3 font-bold ${
                          ep.totalReward >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {ep.totalReward >= 0 ? '+' : ''}
                        {ep.totalReward.toFixed(1)}
                      </td>
                      <td className="py-1.5 px-3 text-slate-400">
                        {ep.durationSeconds.toFixed(1)}s ({ep.durationSteps} steps)
                      </td>
                      <td className="py-1.5 px-3 text-slate-400">
                        {ep.finalTiltDeg.toFixed(1)}°
                      </td>
                      <td className="py-1.5 px-3 text-slate-400">
                        {Math.abs(ep.finalVelocity[1]).toFixed(2)} m/s
                      </td>
                    </tr>
                  ))}
                  {stats.recentEpisodes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500">
                        No completed episodes yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
