import React, { useEffect, useState } from 'react';
import { SimulationCanvas } from './components/3d/SimulationCanvas';
import { Header } from './components/ui/Header';
import { TelemetryHUD } from './components/ui/TelemetryHUD';
import { ControlPanel } from './components/ui/ControlPanel';
import { AnalyticsModal } from './components/ui/AnalyticsModal';
import { DebugPanel } from './components/ui/DebugPanel';
import { SimulationController } from './rl/SimulationController';
import { useSimulationStore } from './state/simulationStore';
import { Rocket, Loader2 } from 'lucide-react';

export function App() {
  const isInitialized = useSimulationStore((s) => s.isInitialized);
  const [isAnalyticsOpen, setAnalyticsOpen] = useState(false);
  const [isDebugOpen, setDebugOpen] = useState(false);

  useEffect(() => {
    const controller = SimulationController.getInstance();
    controller.initialize().catch((err) => {
      console.error('Failed to initialize simulation:', err);
    });
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 1. 3D Simulation WebGL Canvas */}
      <SimulationCanvas />

      {/* 2. Top Navigation Header */}
      <Header
        onToggleAnalytics={() => setAnalyticsOpen(!isAnalyticsOpen)}
        onToggleDebug={() => setDebugOpen(!isDebugOpen)}
        isAnalyticsOpen={isAnalyticsOpen}
        isDebugOpen={isDebugOpen}
      />

      {/* 3. Bottom-Left Telemetry HUD & Outcome Banners */}
      <TelemetryHUD />

      {/* 4. Bottom-Right Mission Control Dock */}
      <ControlPanel />

      {/* 5. Collapsible Training Analytics Modal */}
      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
      />

      {/* 6. Collapsible Physics & RL Debugger Panel */}
      <DebugPanel
        isOpen={isDebugOpen}
        onClose={() => setDebugOpen(false)}
      />

      {/* 7. Loading Splash Screen while Rapier WASM Physics Boots */}
      {!isInitialized && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl text-white">
          <div className="relative flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-pulse">
              <Rocket className="w-10 h-10 text-slate-950 stroke-[2.5]" />
            </div>
            <Loader2 className="absolute -bottom-2 -right-2 w-7 h-7 text-cyan-400 animate-spin" />
          </div>
          <h2 className="text-xl font-black tracking-widest text-slate-100 font-mono mb-2">
            INITIALIZING ROCKET PHYSICS & RL ENGINE
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Loading Rapier 3D WASM & PPO Actor-Critic Neural Networks...
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
