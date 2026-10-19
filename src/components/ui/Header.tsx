import React, { useState } from 'react';
import {
  Rocket,
  Play,
  Pause,
  RotateCcw,
  BarChart3,
  Terminal,
  Award,
  Zap,
  Video,
  Square,
} from 'lucide-react';
import { useSimulationStore } from '../../state/simulationStore';
import { SimulationController } from '../../rl/SimulationController';
import { videoRecorder } from '../../utils/videoRecorder';

interface HeaderProps {
  onToggleAnalytics: () => void;
  onToggleDebug: () => void;
  isAnalyticsOpen: boolean;
  isDebugOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleAnalytics,
  onToggleDebug,
  isAnalyticsOpen,
  isDebugOpen,
}) => {
  const isRunning = useSimulationStore((s) => s.isRunning);
  const mode = useSimulationStore((s) => s.mode);
  const stats = useSimulationStore((s) => s.stats);
  const currentScore = useSimulationStore((s) => s.currentEpisodeScore);
  const setRunning = useSimulationStore((s) => s.setRunning);
  const setMode = useSimulationStore((s) => s.setMode);

  const [isRecording, setIsRecording] = useState(false);
  const controller = SimulationController.getInstance();

  const handleToggleRecord = () => {
    if (isRecording) {
      videoRecorder.stopRecording();
      setIsRecording(false);
    } else {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const ok = videoRecorder.startRecording(canvas);
        if (ok) setIsRecording(true);
      } else {
        alert('Canvas element not found to record.');
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3.5 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 text-white select-none">
      {/* Title & Brand */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Rocket className="w-5 h-5 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-black text-lg tracking-wider text-slate-100 font-mono">
              ROCKET LANDING AI
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              PPO AGENT
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Reinforcement Learning Continuous Control Simulation
          </p>
        </div>
      </div>

      {/* Real-time Status Badges */}
      <div className="hidden md:flex items-center space-x-4 font-mono text-xs">
        {/* Episode */}
        <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2">
          <span className="text-slate-400 uppercase text-[10px]">Episode</span>
          <span className="font-bold text-slate-100 text-sm">
            #{stats.totalEpisodes + 1}
          </span>
        </div>

        {/* Live Reward Score */}
        <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2">
          <span className="text-slate-400 uppercase text-[10px]">Live Score</span>
          <span
            className={`font-black text-sm ${
              currentScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {currentScore >= 0 ? '+' : ''}
            {Math.round(currentScore)}
          </span>
        </div>

        {/* Success Rate */}
        <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 uppercase text-[10px]">Success</span>
          <span className="font-bold text-amber-400 text-sm">
            {stats.successRateRecent.toFixed(1)}%
          </span>
        </div>

        {/* Mode Switcher */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center">
          <button
            onClick={() => setMode('TRAINING')}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
              mode === 'TRAINING'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            TRAINING
          </button>
          <button
            onClick={() => setMode('EVALUATION')}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
              mode === 'EVALUATION'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            EVALUATION
          </button>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* Record Demo Video Button */}
        <button
          onClick={handleToggleRecord}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isRecording
              ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/40'
              : 'bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 hover:bg-slate-800'
          }`}
          title={isRecording ? 'Click to Stop & Save Demo Video' : 'Record High-Def Demo Video'}
        >
          {isRecording ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>RECORDING (STOP)</span>
            </>
          ) : (
            <>
              <Video className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">REC DEMO</span>
            </>
          )}
        </button>

        <button
          onClick={() => setRunning(!isRunning)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isRunning
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>RESUME</span>
            </>
          )}
        </button>

        <button
          onClick={() => controller.resetEpisode()}
          title="Reset Current Episode"
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => controller.loadPretrained()}
          title="Load Pretrained Master Agent"
          className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 text-xs font-semibold"
        >
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span>Pretrained</span>
        </button>

        <button
          onClick={onToggleAnalytics}
          className={`p-1.5 rounded-lg border transition-all ${
            isAnalyticsOpen
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Training Analytics"
        >
          <BarChart3 className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleDebug}
          className={`p-1.5 rounded-lg border transition-all ${
            isDebugOpen
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Debug & Telemetry Inspector"
        >
          <Terminal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
