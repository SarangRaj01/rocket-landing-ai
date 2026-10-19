import React from 'react';
import {
  Compass,
  ArrowDown,
  ArrowRight,
  Flame,
  Fuel,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useSimulationStore } from '../../state/simulationStore';

export const TelemetryHUD: React.FC = () => {
  const telemetry = useSimulationStore((s) => s.telemetry);
  const status = telemetry.landingStatus;

  const isSoftDescent =
    telemetry.verticalSpeed < 0 && Math.abs(telemetry.verticalSpeed) <= 1.8;
  const isHighDescent = telemetry.verticalSpeed < -3.5;
  const isSafeTilt = telemetry.tiltAngleDeg <= 12.0;

  return (
    <div className="fixed bottom-6 left-6 z-20 flex flex-col space-y-3 pointer-events-none select-none">
      {/* 1. Large Dynamic Outcome Alert Banner */}
      {status !== 'AIRBORNE' && (
        <div className="animate-in fade-in zoom-in-95 duration-200">
          {status === 'LANDED' && (
            <div className="bg-emerald-950/90 border-2 border-emerald-400 text-emerald-100 px-5 py-3 rounded-xl shadow-2xl shadow-emerald-500/30 flex items-center space-x-3.5 backdrop-blur-md">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 animate-pulse stroke-[2.5]" />
              <div>
                <div className="font-black text-base tracking-wider text-emerald-300 font-mono">
                  SUCCESSFUL LANDING!
                </div>
                <div className="text-xs text-emerald-200/80">
                  Touchdown: {Math.abs(telemetry.verticalSpeed).toFixed(2)} m/s • Tilt: {telemetry.tiltAngleDeg.toFixed(1)}° • Offset: {telemetry.distanceToPadCenter.toFixed(2)}m
                </div>
              </div>
            </div>
          )}

          {status === 'TOUCHDOWN' && (
            <div className="bg-amber-950/90 border-2 border-amber-400 text-amber-100 px-5 py-2.5 rounded-xl shadow-xl shadow-amber-500/20 flex items-center space-x-3 backdrop-blur-md">
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              <div className="font-bold text-sm tracking-wide text-amber-300 font-mono">
                TOUCHDOWN DETECTED • SETTLING... ({telemetry.settledFrames}/25)
              </div>
            </div>
          )}

          {status === 'CRASHED' && (
            <div className="bg-rose-950/90 border-2 border-rose-500 text-rose-100 px-5 py-3 rounded-xl shadow-2xl shadow-rose-500/30 flex items-center space-x-3.5 backdrop-blur-md">
              <AlertTriangle className="w-7 h-7 text-rose-400 stroke-[2.5]" />
              <div>
                <div className="font-black text-base tracking-wider text-rose-300 font-mono">
                  CRASH / IMPACT DETECTED
                </div>
                <div className="text-xs text-rose-200/80">
                  {telemetry.tiltAngleDeg > 35
                    ? `Excessive tilt (${telemetry.tiltAngleDeg.toFixed(1)}°)`
                    : Math.abs(telemetry.verticalSpeed) > 3.5
                    ? `High impact speed (${Math.abs(telemetry.verticalSpeed).toFixed(2)} m/s)`
                    : telemetry.distanceToPadCenter > 4.5
                    ? `Missed landing target (${telemetry.distanceToPadCenter.toFixed(1)}m offset)`
                    : 'Unrecoverable trajectory'}
                </div>
              </div>
            </div>
          )}

          {status === 'TIMEOUT' && (
            <div className="bg-slate-900/90 border border-slate-700 text-slate-200 px-5 py-2.5 rounded-xl shadow-xl flex items-center space-x-3 backdrop-blur-md">
              <Clock className="w-5 h-5 text-amber-400" />
              <div className="font-bold text-sm tracking-wide text-slate-200 font-mono">
                EPISODE TIMEOUT (MAX FLIGHT TIME REACHED)
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Glassmorphic Telemetry Instrument Cluster */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 backdrop-blur-md shadow-2xl w-80 text-white font-mono text-xs pointer-events-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <div className="flex items-center space-x-1.5 text-slate-300 font-bold tracking-wider text-[11px]">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>FLIGHT TELEMETRY</span>
          </div>
          <span className="text-[10px] text-slate-400">RAPID 60Hz</span>
        </div>

        {/* Meters Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Altitude */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-[10px] text-slate-400 uppercase">Altitude (AGL)</div>
            <div className="text-lg font-black text-cyan-400">
              {telemetry.altitude.toFixed(2)} <span className="text-xs font-normal text-slate-400">m</span>
            </div>
            {/* Visual altitude bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, (telemetry.altitude / 18.0) * 100)}%` }}
              />
            </div>
          </div>

          {/* Vertical Velocity */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
              <span>Vert Speed (Vy)</span>
              <ArrowDown className="w-3 h-3 text-slate-400" />
            </div>
            <div
              className={`text-lg font-black ${
                isSoftDescent
                  ? 'text-emerald-400'
                  : isHighDescent
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}
            >
              {telemetry.verticalSpeed > 0 ? '+' : ''}
              {telemetry.verticalSpeed.toFixed(2)}{' '}
              <span className="text-xs font-normal text-slate-400">m/s</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-1">Target: -1.0 to -1.5 m/s</div>
          </div>

          {/* Tilt Angle */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-[10px] text-slate-400 uppercase">Rocket Tilt</div>
            <div
              className={`text-lg font-black ${
                isSafeTilt ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {telemetry.tiltAngleDeg.toFixed(1)}°
            </div>
            <div className="text-[9px] text-slate-400 mt-1">Limit: &lt; 12.0°</div>
          </div>

          {/* Horizontal Drift Speed */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
              <span>Drift Speed</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </div>
            <div
              className={`text-lg font-black ${
                telemetry.horizontalSpeed < 1.0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {telemetry.horizontalSpeed.toFixed(2)}{' '}
              <span className="text-xs font-normal text-slate-400">m/s</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-1">
              Pad Dist: {telemetry.distanceToPadCenter.toFixed(1)}m
            </div>
          </div>
        </div>

        {/* Actuators: Throttle & RCS */}
        <div className="space-y-2 pt-1 border-t border-slate-800/60">
          {/* Main Throttle */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-300 mb-1">
              <span className="flex items-center space-x-1">
                <Flame className="w-3 h-3 text-orange-400" />
                <span>MAIN ENGINE THROTTLE</span>
              </span>
              <span className="font-bold text-orange-400">
                {Math.round(telemetry.throttle * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-900 border border-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-75"
                style={{ width: `${Math.round(telemetry.throttle * 100)}%` }}
              />
            </div>
          </div>

          {/* RCS Pitch & Roll Torques */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-slate-400">RCS Pitch: </span>
              <span className="font-bold text-cyan-300">
                {telemetry.rcsPitch > 0 ? '+' : ''}
                {telemetry.rcsPitch.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">RCS Roll: </span>
              <span className="font-bold text-cyan-300">
                {telemetry.rcsRoll > 0 ? '+' : ''}
                {telemetry.rcsRoll.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Fuel Remaining */}
          <div className="pt-1">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span className="flex items-center space-x-1">
                <Fuel className="w-3 h-3 text-emerald-400" />
                <span>PROPELLANT MASS</span>
              </span>
              <span className="font-bold text-emerald-400">
                {telemetry.fuelRemaining.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-slate-900 border border-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full"
                style={{ width: `${telemetry.fuelRemaining}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
