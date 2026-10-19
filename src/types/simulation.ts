export type LandingStatus = 'AIRBORNE' | 'TOUCHDOWN' | 'LANDED' | 'CRASHED' | 'TIMEOUT';

export type SimulationMode = 'TRAINING' | 'EVALUATION' | 'MANUAL';

export interface ObservationVector {
  // Normalized state values
  relX: number;          // x position relative to pad [-1 to 1 range approx]
  relY: number;          // y altitude above pad
  relZ: number;          // z position relative to pad
  vx: number;            // horizontal velocity x
  vy: number;            // vertical velocity y
  vz: number;            // horizontal velocity z
  sinPitch: number;      // pitch angle sine
  cosPitch: number;      // pitch angle cosine
  sinRoll: number;       // roll angle sine
  cosRoll: number;       // roll angle cosine
  angVelX: number;       // angular velocity x (pitch rate)
  angVelY: number;       // angular velocity y (yaw rate)
  angVelZ: number;       // angular velocity z (roll rate)
  contactState: number;  // 1 if any leg touching, 0 otherwise
  distanceToPad: number; // euclidean distance to (0, 0, 0)
}

export interface ActionVector {
  mainThruster: number;  // 0 to 1 (throttle)
  pitchTorque: number;   // -1 to 1 (RCS pitch control)
  rollTorque: number;    // -1 to 1 (RCS roll control)
  yawTorque: number;     // -1 to 1 (RCS yaw / lateral stabilization)
}

export interface TelemetryData {
  position: [number, number, number];
  velocity: [number, number, number];
  rotationEuler: [number, number, number]; // in degrees: pitch, yaw, roll
  angularVelocity: [number, number, number];
  altitude: number;
  tiltAngleDeg: number;
  horizontalSpeed: number;
  verticalSpeed: number;
  throttle: number;
  rcsPitch: number;
  rcsRoll: number;
  rcsYaw: number;
  fuelRemaining: number;
  landingStatus: LandingStatus;
  distanceToPadCenter: number;
  settledFrames: number;
  currentStep: number;
}

export interface RewardBreakdown {
  total: number;
  distancePenalty: number;
  uprightReward: number;
  angularVelocityPenalty: number;
  horizontalSpeedPenalty: number;
  descentVelocityShaping: number;
  groundProximityBonus: number;
  fuelPenalty: number;
  terminalReward: number;
}

export interface EpisodeResult {
  episodeNumber: number;
  status: LandingStatus;
  totalReward: number;
  durationSteps: number;
  durationSeconds: number;
  finalPosition: [number, number, number];
  finalVelocity: [number, number, number];
  finalTiltDeg: number;
  fuelUsed: number;
  timestamp: number;
}

export interface TrainingStats {
  totalEpisodes: number;
  successfulLandings: number;
  crashCount: number;
  timeoutCount: number;
  successRateRecent: number;  // last 50 episodes
  averageRewardRecent: number;// last 50 episodes
  bestReward: number;
  currentEpisodeReward: number;
  recentEpisodes: EpisodeResult[];
  actorLoss: number;
  criticLoss: number;
  entropy: number;
  learningUpdates: number;
}

export interface PPOHyperparameters {
  learningRateActor: number;
  learningRateCritic: number;
  gamma: number;          // Discount factor (e.g. 0.99)
  gaeLambda: number;      // GAE lambda (e.g. 0.95)
  clipRatio: number;      // PPO clip epsilon (e.g. 0.2)
  targetKLDivergence: number;
  entropyCoeff: number;   // Exploration incentive (e.g. 0.01)
  valueLossCoeff: number;
  batchSize: number;
  miniBatchSize: number;
  epochsPerUpdate: number;
}

export interface AgentCheckpoint {
  version: string;
  name: string;
  timestamp: string;
  totalEpisodesTrained: number;
  bestReward: number;
  successRate: number;
  hyperparameters: PPOHyperparameters;
  actorWeights: {
    w1: number[][];
    b1: number[];
    w2: number[][];
    b2: number[];
    wMean: number[][];
    bMean: number[];
    logStd: number[];
  };
  criticWeights: {
    w1: number[][];
    b1: number[];
    w2: number[][];
    b2: number[];
    wVal: number[][];
    bVal: number[];
  };
}
