import React from 'react';
import { X, Cpu, Layers } from 'lucide-react';
import { useSimulationStore } from '../../state/simulationStore';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const telemetry = useSimulationStore((s) => s.telemetry);
  const rewards = useSimulationStore((s) => s.rewardBreakdown);
  const stats = useSimulationStore((s) => s.stats);

  if (!isOpen) return null;

  return (
    <div className="fixed top-18 right-6 z-40 bg-slate-950/90 border border-slate-800 rounded-2xl p-4.5 backdrop-blur-md shadow-2xl w-96 text-white text-[11px] font-mono select-none animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center space-x-1.5 text-slate-200 font-bold tracking-wider">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>RL DEBUGGER & REWARD DECOMPOSITION</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
        {/* 1. Observation & Kinematics Vector */}
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-1.5 flex items-center space-x-1">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>RIGID BODY KINEMATICS</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Position (X, Y, Z):</span>
              <span className="text-slate-200">
                [{telemetry.position.map((v) => v.toFixed(2)).join(', ')}]
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Velocity (Vx, Vy, Vz):</span>
              <span className="text-slate-200">
                [{telemetry.velocity.map((v) => v.toFixed(2)).join(', ')}]
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Euler Angles (P, Y, R):</span>
              <span className="text-slate-200">
                [{telemetry.rotationEuler.map((v) => v.toFixed(1)).join('°, ')}°]
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Angular Vel (wx, wy, wz):</span>
              <span className="text-slate-200">
                [{telemetry.angularVelocity.map((v) => v.toFixed(2)).join(', ')}]
              </span>
            </div>
          </div>
        </div>

        {/* 2. Live Reward Breakdown */}
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-1.5">
            STEP REWARD SHAPING BREAKDOWN
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Distance to Target:</span>
              <span className={rewards.distancePenalty >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {rewards.distancePenalty.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Upright Alignment (cos θ):</span>
              <span className="text-emerald-400">
                +{rewards.uprightReward.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Angular Velocity Penalty:</span>
              <span className="text-rose-400">
                {rewards.angularVelocityPenalty.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Horizontal Drift Penalty:</span>
              <span className="text-rose-400">
                {rewards.horizontalSpeedPenalty.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Descent Velocity Shaping:</span>
              <span className={rewards.descentVelocityShaping >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {rewards.descentVelocityShaping.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ground Proximity & Stability:</span>
              <span className="text-emerald-400">
                +{rewards.groundProximityBonus.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Fuel & Actuator Action:</span>
              <span className="text-rose-400">
                {rewards.fuelPenalty.toFixed(3)}
              </span>
            </div>
            {rewards.terminalReward !== 0 && (
              <div className="flex justify-between font-bold border-t border-slate-800 pt-1">
                <span className="text-amber-300">Terminal Reward/Penalty:</span>
                <span className={rewards.terminalReward > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {rewards.terminalReward > 0 ? '+' : ''}{rewards.terminalReward.toFixed(1)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-slate-800 pt-1">
              <span className="text-slate-200">Total Step Reward:</span>
              <span className={rewards.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {rewards.total >= 0 ? '+' : ''}{rewards.total.toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Neural Network & PPO Optimizer State */}
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-1.5">
            NEURAL NETWORK LOSS & ENTROPY
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Actor PPO Loss:</span>
              <span className="text-cyan-400">{stats.actorLoss.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Critic Value Loss:</span>
              <span className="text-purple-400">{stats.criticLoss.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Policy Entropy:</span>
              <span className="text-emerald-400">{stats.entropy.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">PPO Gradient Updates:</span>
              <span className="text-slate-200">{stats.learningUpdates}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
