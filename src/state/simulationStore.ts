import { create } from 'zustand';
import {
  LandingStatus,
  SimulationMode,
  TelemetryData,
  RewardBreakdown,
  EpisodeResult,
  TrainingStats,
  AgentCheckpoint,
} from '../types/simulation';
import { getPretrainedCheckpoint } from '../rl/PretrainedCheckpoint';

export type CameraMode = 'CINEMATIC' | 'FOLLOW' | 'ORBIT' | 'TOP_DOWN';

export interface SimulationStoreState {
  // Operational state
  isInitialized: boolean;
  isRunning: boolean;
  isTraining: boolean;
  mode: SimulationMode;
  simSpeed: number; // 0.2 to 10
  cameraMode: CameraMode;
  showMotionTrail: boolean;
  windEnabled: boolean;
  windIntensity: number;

  // Real-time telemetry
  telemetry: TelemetryData;
  rewardBreakdown: RewardBreakdown;
  motionTrailPoints: [number, number, number][];

  // Training metrics & Scoreboard
  currentEpisodeScore: number;
  stats: TrainingStats;

  // Actions
  setInitialized: (val: boolean) => void;
  setRunning: (val: boolean) => void;
  setTraining: (val: boolean) => void;
  setMode: (mode: SimulationMode) => void;
  setSimSpeed: (speed: number) => void;
  setCameraMode: (cam: CameraMode) => void;
  setShowMotionTrail: (show: boolean) => void;
  setWindEnabled: (enabled: boolean) => void;
  setWindIntensity: (intensity: number) => void;

  updateTelemetry: (tel: TelemetryData, reward: RewardBreakdown) => void;
  addMotionTrailPoint: (pt: [number, number, number]) => void;
  clearMotionTrail: () => void;

  recordEpisodeResult: (result: EpisodeResult) => void;
  updatePpoMetrics: (actorLoss: number, criticLoss: number, entropy: number) => void;
  resetAllStats: () => void;
}

const initialTelemetry: TelemetryData = {
  position: [0, 14, 0],
  velocity: [0, 0, 0],
  rotationEuler: [0, 0, 0],
  angularVelocity: [0, 0, 0],
  altitude: 12.75,
  tiltAngleDeg: 0,
  horizontalSpeed: 0,
  verticalSpeed: 0,
  throttle: 0,
  rcsPitch: 0,
  rcsRoll: 0,
  rcsYaw: 0,
  fuelRemaining: 100,
  landingStatus: 'AIRBORNE',
  distanceToPadCenter: 0,
  settledFrames: 0,
  currentStep: 0,
};

const initialRewardBreakdown: RewardBreakdown = {
  total: 0,
  distancePenalty: 0,
  uprightReward: 0,
  angularVelocityPenalty: 0,
  horizontalSpeedPenalty: 0,
  descentVelocityShaping: 0,
  groundProximityBonus: 0,
  fuelPenalty: 0,
  terminalReward: 0,
};

const initialStats: TrainingStats = {
  totalEpisodes: 0,
  successfulLandings: 0,
  crashCount: 0,
  timeoutCount: 0,
  successRateRecent: 0,
  averageRewardRecent: 0,
  bestReward: 0,
  currentEpisodeReward: 0,
  recentEpisodes: [],
  actorLoss: 0,
  criticLoss: 0,
  entropy: 0,
  learningUpdates: 0,
};

export const useSimulationStore = create<SimulationStoreState>((set, get) => ({
  isInitialized: false,
  isRunning: true,
  isTraining: true,
  mode: 'TRAINING',
  simSpeed: 1.0,
  cameraMode: 'CINEMATIC',
  showMotionTrail: true,
  windEnabled: false,
  windIntensity: 0.3,

  telemetry: initialTelemetry,
  rewardBreakdown: initialRewardBreakdown,
  motionTrailPoints: [],

  currentEpisodeScore: 0,
  stats: initialStats,

  setInitialized: (isInitialized) => set({ isInitialized }),
  setRunning: (isRunning) => set({ isRunning }),
  setTraining: (isTraining) => set({ isTraining }),
  setMode: (mode) => set({ mode }),
  setSimSpeed: (simSpeed) => set({ simSpeed }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setShowMotionTrail: (showMotionTrail) => set({ showMotionTrail }),
  setWindEnabled: (windEnabled) => set({ windEnabled }),
  setWindIntensity: (windIntensity) => set({ windIntensity }),

  updateTelemetry: (telemetry, rewardBreakdown) => {
    set((state) => ({
      telemetry,
      rewardBreakdown,
      currentEpisodeScore: state.currentEpisodeScore + rewardBreakdown.total,
    }));
  },

  addMotionTrailPoint: (pt) => {
    set((state) => {
      // Keep up to 250 trail points for performance
      const pts = [...state.motionTrailPoints, pt];
      if (pts.length > 250) pts.shift();
      return { motionTrailPoints: pts };
    });
  },

  clearMotionTrail: () => set({ motionTrailPoints: [] }),

  recordEpisodeResult: (result) => {
    set((state) => {
      const recent = [...state.stats.recentEpisodes, result];
      if (recent.length > 100) recent.shift();

      const last50 = recent.slice(-50);
      const totalLandedLast50 = last50.filter((r) => r.status === 'LANDED').length;
      const successRateRecent = last50.length > 0 ? (totalLandedLast50 / last50.length) * 100 : 0;

      let sumRew = 0;
      for (const r of last50) sumRew += r.totalReward;
      const avgRewardRecent = last50.length > 0 ? sumRew / last50.length : 0;

      const isLanding = result.status === 'LANDED';
      const isCrash = result.status === 'CRASHED';
      const isTimeout = result.status === 'TIMEOUT';

      const bestReward = Math.max(state.stats.bestReward, result.totalReward);

      return {
        currentEpisodeScore: 0,
        stats: {
          ...state.stats,
          totalEpisodes: state.stats.totalEpisodes + 1,
          successfulLandings: state.stats.successfulLandings + (isLanding ? 1 : 0),
          crashCount: state.stats.crashCount + (isCrash ? 1 : 0),
          timeoutCount: state.stats.timeoutCount + (isTimeout ? 1 : 0),
          successRateRecent,
          averageRewardRecent: avgRewardRecent,
          bestReward,
          currentEpisodeReward: result.totalReward,
          recentEpisodes: recent,
        },
      };
    });
  },

  updatePpoMetrics: (actorLoss, criticLoss, entropy) => {
    set((state) => ({
      stats: {
        ...state.stats,
        actorLoss,
        criticLoss,
        entropy,
        learningUpdates: state.stats.learningUpdates + 1,
      },
    }));
  },

  resetAllStats: () => {
    set({
      currentEpisodeScore: 0,
      stats: initialStats,
      motionTrailPoints: [],
    });
  },
}));
