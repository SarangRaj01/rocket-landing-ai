import React, { useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  Download,
  Upload,
  Wind,
  Video,
  Eye,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useSimulationStore, CameraMode } from '../../state/simulationStore';
import { SimulationController } from '../../rl/SimulationController';

export const ControlPanel: React.FC = () => {
  const isRunning = useSimulationStore((s) => s.isRunning);
  const isTraining = useSimulationStore((s) => s.isTraining);
  const mode = useSimulationStore((s) => s.mode);
  const simSpeed = useSimulationStore((s) => s.simSpeed);
  const cameraMode = useSimulationStore((s) => s.cameraMode);
  const showMotionTrail = useSimulationStore((s) => s.showMotionTrail);
  const windEnabled = useSimulationStore((s) => s.windEnabled);
  const windIntensity = useSimulationStore((s) => s.windIntensity);

  const setRunning = useSimulationStore((s) => s.setRunning);
  const setTraining = useSimulationStore((s) => s.setTraining);
  const setMode = useSimulationStore((s) => s.setMode);
  const setSimSpeed = useSimulationStore((s) => s.setSimSpeed);
  const setCameraMode = useSimulationStore((s) => s.setCameraMode);
  const setShowMotionTrail = useSimulationStore((s) => s.setShowMotionTrail);
  const setWindEnabled = useSimulationStore((s) => s.setWindEnabled);
  const setWindIntensity = useSimulationStore((s) => s.setWindIntensity);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const controller = SimulationController.getInstance();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        controller.loadAgentCheckpoint(json);
        alert('Agent model loaded successfully!');
      } catch (err) {
        alert('Error parsing checkpoint file: ' + err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed bottom-6 right-6 z-20 flex flex-col space-y-2 pointer-events-auto select-none">
      <div className="bg-slate-950/85 border border-slate-800/90 rounded-2xl p-4 backdrop-blur-md shadow-2xl w-84 text-white text-xs font-mono">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <div className="flex items-center space-x-1.5 text-slate-200 font-bold tracking-wider text-[11px]">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>MISSION CONTROL</span>
          </div>
          <span className="text-[10px] text-slate-400">PPO INTERACTIVE</span>
        </div>

        {/* 1. Primary Action Controls */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => setRunning(!isRunning)}
            className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl font-bold transition-all ${
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
            className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white transition-all font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>RESET EPISODE</span>
          </button>
        </div>

        {/* 2. Mode & Training State Switcher */}
        <div className="space-y-2 mb-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>AGENT MODE</span>
            <span className="font-bold text-slate-200">{mode}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                setMode('TRAINING');
                setTraining(true);
              }}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                mode === 'TRAINING'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              TRAINING (LEARNING)
            </button>
            <button
              onClick={() => {
                setMode('EVALUATION');
                setTraining(false);
              }}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                mode === 'EVALUATION'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              EVALUATION (LOCKED)
            </button>
          </div>
        </div>

        {/* 3. Simulation Speed Mult */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
            <span>SIMULATION PHYSICS SPEED</span>
            <span className="font-bold text-emerald-400">{simSpeed}x</span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[0.5, 1.0, 2.0, 5.0, 10.0].map((s) => (
              <button
                key={s}
                onClick={() => setSimSpeed(s)}
                className={`py-1 rounded text-[10px] font-bold transition-all ${
                  simSpeed === s
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* 4. Camera View Modes */}
        <div className="mb-3">
          <div className="text-[10px] text-slate-400 mb-1.5 flex items-center space-x-1">
            <Video className="w-3 h-3 text-cyan-400" />
            <span>CAMERA ANGLE</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {(['CINEMATIC', 'FOLLOW', 'ORBIT', 'TOP_DOWN'] as CameraMode[]).map((cam) => (
              <button
                key={cam}
                onClick={() => setCameraMode(cam)}
                className={`py-1 px-1 rounded text-[9px] font-bold transition-all ${
                  cameraMode === cam
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cam === 'TOP_DOWN' ? 'TOP-DOWN' : cam}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Wind Disturbance & Motion Trail Toggles */}
        <div className="space-y-2 mb-3 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-300">
              <Wind className="w-3.5 h-3.5 text-blue-400" />
              <span>WIND DISTURBANCE</span>
            </div>
            <button
              onClick={() => setWindEnabled(!windEnabled)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                windEnabled
                  ? 'bg-blue-500 text-slate-950'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}
            >
              {windEnabled ? 'ENABLED' : 'OFF'}
            </button>
          </div>
          {windEnabled && (
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-[9px] text-slate-400">GUST:</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={windIntensity}
                onChange={(e) => setWindIntensity(parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-1 bg-slate-800 rounded cursor-pointer"
              />
              <span className="text-[10px] text-blue-400 font-bold">
                {Math.round(windIntensity * 100)}%
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-300">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>MOTION TRAJECTORY TRAIL</span>
            </div>
            <button
              onClick={() => setShowMotionTrail(!showMotionTrail)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                showMotionTrail
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}
            >
              {showMotionTrail ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* 6. Checkpoints & Model Management */}
        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800/60">
          <button
            onClick={() => controller.saveAgentCheckpoint()}
            className="flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-[10px] font-semibold"
          >
            <Download className="w-3 h-3 text-slate-400" />
            <span>SAVE AGENT</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-[10px] font-semibold"
          >
            <Upload className="w-3 h-3 text-slate-400" />
            <span>LOAD AGENT</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* 7. Load Pretrained Master & Reset Agent */}
        <div className="grid grid-cols-2 gap-1.5 pt-1.5">
          <button
            onClick={() => controller.loadPretrained()}
            className="flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-all text-[10px] font-bold"
          >
            <Zap className="w-3 h-3 text-purple-400" />
            <span>PRETRAINED</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Restart reinforcement learning from scratch? All policy weights will reset.')) {
                controller.restartFromScratch();
              }
            }}
            className="flex items-center justify-center space-x-1 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-all text-[10px] font-bold"
          >
            <RefreshCw className="w-3 h-3 text-rose-400" />
            <span>RESTART RL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
