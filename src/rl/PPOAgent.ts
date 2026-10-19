import {
  ObservationVector,
  ActionVector,
  PPOHyperparameters,
  AgentCheckpoint,
} from '../types/simulation';

// Helper matrix / vector operations
function createMatrix(rows: number, cols: number, initFn: () => number): number[][] {
  const m: number[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < cols; j++) {
      row.push(initFn());
    }
    m.push(row);
  }
  return m;
}

function xavierInit(fanIn: number, fanOut: number): number {
  const limit = Math.sqrt(6 / (fanIn + fanOut));
  return (Math.random() * 2 - 1) * limit;
}

export interface Transition {
  state: number[];
  action: number[];
  reward: number;
  nextState: number[];
  done: boolean;
  logProb: number;
  value: number;
}

export const DEFAULT_HYPERPARAMS: PPOHyperparameters = {
  learningRateActor: 0.0003,
  learningRateCritic: 0.001,
  gamma: 0.99,
  gaeLambda: 0.95,
  clipRatio: 0.2,
  targetKLDivergence: 0.015,
  entropyCoeff: 0.01,
  valueLossCoeff: 0.5,
  batchSize: 2048,
  miniBatchSize: 64,
  epochsPerUpdate: 4,
};

export class PPOAgent {
  public stateDim: number = 15;
  public actionDim: number = 3; // [mainThrottle, pitchTorque, rollTorque]
  public hiddenDim: number = 64;

  public hyperparams: PPOHyperparameters;

  // Actor Network Weights
  public actorW1: number[][]; // [hiddenDim, stateDim]
  public actorB1: number[];   // [hiddenDim]
  public actorW2: number[][]; // [hiddenDim, hiddenDim]
  public actorB2: number[];   // [hiddenDim]
  public actorWMean: number[][]; // [actionDim, hiddenDim]
  public actorBMean: number[];   // [actionDim]
  public logStd: number[];       // [actionDim]

  // Critic Network Weights
  public criticW1: number[][]; // [hiddenDim, stateDim]
  public criticB1: number[];   // [hiddenDim]
  public criticW2: number[][]; // [hiddenDim, hiddenDim]
  public criticB2: number[];   // [hiddenDim]
  public criticWVal: number[][]; // [1, hiddenDim]
  public criticBVal: number[];   // [1]

  // Adam Optimizer Moments for Actor
  private mActorW1: number[][];
  private vActorW1: number[][];
  private mActorB1: number[];
  private vActorB1: number[];
  private mActorW2: number[][];
  private vActorW2: number[][];
  private mActorB2: number[];
  private vActorB2: number[];
  private mActorWMean: number[][];
  private vActorWMean: number[][];
  private mActorBMean: number[];
  private vActorBMean: number[];
  private mLogStd: number[];
  private vLogStd: number[];

  // Adam Optimizer Moments for Critic
  private mCriticW1: number[][];
  private vCriticW1: number[][];
  private mCriticB1: number[];
  private vCriticB1: number[];
  private mCriticW2: number[][];
  private vCriticW2: number[][];
  private mCriticB2: number[];
  private vCriticB2: number[];
  private mCriticWVal: number[][];
  private vCriticWVal: number[][];
  private mCriticBVal: number[];
  private vCriticBVal: number[];

  private optimizerStep: number = 0;

  // Rollout buffer
  public buffer: Transition[] = [];

  constructor(hyperparams: Partial<PPOHyperparameters> = {}) {
    this.hyperparams = { ...DEFAULT_HYPERPARAMS, ...hyperparams };

    const S = this.stateDim;
    const H = this.hiddenDim;
    const A = this.actionDim;

    // Initialize Actor
    this.actorW1 = createMatrix(H, S, () => xavierInit(S, H));
    this.actorB1 = new Array(H).fill(0);
    this.actorW2 = createMatrix(H, H, () => xavierInit(H, H));
    this.actorB2 = new Array(H).fill(0);
    this.actorWMean = createMatrix(A, H, () => xavierInit(H, A) * 0.5);
    this.actorBMean = [0.2, 0.0, 0.0]; // Bias main thruster slightly upward
    this.logStd = [-0.6, -0.6, -0.6];  // std ~ 0.55

    // Initialize Critic
    this.criticW1 = createMatrix(H, S, () => xavierInit(S, H));
    this.criticB1 = new Array(H).fill(0);
    this.criticW2 = createMatrix(H, H, () => xavierInit(H, H));
    this.criticB2 = new Array(H).fill(0);
    this.criticWVal = createMatrix(1, H, () => xavierInit(H, 1));
    this.criticBVal = [0];

    // Optimizer Moments Actor
    this.mActorW1 = createMatrix(H, S, () => 0);
    this.vActorW1 = createMatrix(H, S, () => 0);
    this.mActorB1 = new Array(H).fill(0);
    this.vActorB1 = new Array(H).fill(0);
    this.mActorW2 = createMatrix(H, H, () => 0);
    this.vActorW2 = createMatrix(H, H, () => 0);
    this.mActorB2 = new Array(H).fill(0);
    this.vActorB2 = new Array(H).fill(0);
    this.mActorWMean = createMatrix(A, H, () => 0);
    this.vActorWMean = createMatrix(A, H, () => 0);
    this.mActorBMean = new Array(A).fill(0);
    this.vActorBMean = new Array(A).fill(0);
    this.mLogStd = new Array(A).fill(0);
    this.vLogStd = new Array(A).fill(0);

    // Optimizer Moments Critic
    this.mCriticW1 = createMatrix(H, S, () => 0);
    this.vCriticW1 = createMatrix(H, S, () => 0);
    this.mCriticB1 = new Array(H).fill(0);
    this.vCriticB1 = new Array(H).fill(0);
    this.mCriticW2 = createMatrix(H, H, () => 0);
    this.vCriticW2 = createMatrix(H, H, () => 0);
    this.mCriticB2 = new Array(H).fill(0);
    this.vCriticB2 = new Array(H).fill(0);
    this.mCriticWVal = createMatrix(1, H, () => 0);
    this.vCriticWVal = createMatrix(1, H, () => 0);
    this.mCriticBVal = [0];
    this.vCriticBVal = [0];
  }

  public stateToArray(obs: ObservationVector): number[] {
    return [
      obs.relX,
      obs.relY,
      obs.relZ,
      obs.vx,
      obs.vy,
      obs.vz,
      obs.sinPitch,
      obs.cosPitch,
      obs.sinRoll,
      obs.cosRoll,
      obs.angVelX,
      obs.angVelY,
      obs.angVelZ,
      obs.contactState,
      obs.distanceToPad,
    ];
  }

  // Forward Pass for Actor (evaluates mean action)
  public forwardActor(state: number[]): { mean: number[]; h1: number[]; h2: number[] } {
    const H = this.hiddenDim;

    // Layer 1
    const h1: number[] = new Array(H);
    for (let i = 0; i < H; i++) {
      let sum = this.actorB1[i];
      for (let j = 0; j < this.stateDim; j++) {
        sum += this.actorW1[i][j] * state[j];
      }
      h1[i] = Math.tanh(sum);
    }

    // Layer 2
    const h2: number[] = new Array(H);
    for (let i = 0; i < H; i++) {
      let sum = this.actorB2[i];
      for (let j = 0; j < H; j++) {
        sum += this.actorW2[i][j] * h1[j];
      }
      h2[i] = Math.tanh(sum);
    }

    // Mean Action output
    const mean: number[] = new Array(this.actionDim);
    for (let i = 0; i < this.actionDim; i++) {
      let sum = this.actorBMean[i];
      for (let j = 0; j < H; j++) {
        sum += this.actorWMean[i][j] * h2[j];
      }
      mean[i] = Math.tanh(sum);
    }

    return { mean, h1, h2 };
  }

  // Forward Pass for Critic (evaluates state value V(s))
  public forwardCritic(state: number[]): { value: number; h1: number[]; h2: number[] } {
    const H = this.hiddenDim;

    // Layer 1
    const h1: number[] = new Array(H);
    for (let i = 0; i < H; i++) {
      let sum = this.criticB1[i];
      for (let j = 0; j < this.stateDim; j++) {
        sum += this.criticW1[i][j] * state[j];
      }
      h1[i] = Math.tanh(sum);
    }

    // Layer 2
    const h2: number[] = new Array(H);
    for (let i = 0; i < H; i++) {
      let sum = this.criticB2[i];
      for (let j = 0; j < H; j++) {
        sum += this.criticW2[i][j] * h1[j];
      }
      h2[i] = Math.tanh(sum);
    }

    // Value output
    let val = this.criticBVal[0];
    for (let j = 0; j < H; j++) {
      val += this.criticWVal[0][j] * h2[j];
    }

    return { value: val, h1, h2 };
  }

  /**
   * Selects an action given observation.
   * In training mode: samples from Gaussian distribution with exploration noise.
   * In evaluation mode: returns deterministic mean action.
   */
  public selectAction(
    obs: ObservationVector,
    deterministic: boolean = false
  ): { actionVector: ActionVector; rawAction: number[]; logProb: number; value: number } {
    const state = this.stateToArray(obs);
    const { mean } = this.forwardActor(state);
    const { value } = this.forwardCritic(state);

    const rawAction: number[] = new Array(this.actionDim);
    let logProb = 0;

    for (let i = 0; i < this.actionDim; i++) {
      const std = Math.exp(this.logStd[i]);
      if (deterministic) {
        rawAction[i] = mean[i];
      } else {
        // Box-Muller transform for standard normal sample
        const u1 = Math.max(1e-7, Math.random());
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        rawAction[i] = mean[i] + std * z0;
      }

      // Gaussian log likelihood
      const diff = rawAction[i] - mean[i];
      const lp = -0.5 * ((diff * diff) / (std * std) + 2.0 * this.logStd[i] + Math.log(2 * Math.PI));
      logProb += lp;
    }

    // Map raw actions to physical actuator ranges:
    // Raw action 0 (throttle): raw in [-1, 1] -> throttle in [0, 1]
    const mainThruster = Math.max(0.0, Math.min(1.0, (rawAction[0] + 1.0) * 0.5));
    // Raw action 1 (pitch torque): in [-1, 1]
    const pitchTorque = Math.max(-1.0, Math.min(1.0, rawAction[1]));
    // Raw action 2 (roll torque): in [-1, 1]
    const rollTorque = Math.max(-1.0, Math.min(1.0, rawAction[2]));

    // Lateral stabilization yaw
    const yawTorque = -0.2 * obs.angVelY;

    return {
      actionVector: { mainThruster, pitchTorque, rollTorque, yawTorque },
      rawAction,
      logProb,
      value,
    };
  }

  public storeTransition(transition: Transition): void {
    this.buffer.push(transition);
  }

  /**
   * Generalized Advantage Estimation and PPO Optimization Update
   */
  public update(): { actorLoss: number; criticLoss: number; entropy: number } {
    if (this.buffer.length < this.hyperparams.miniBatchSize) {
      return { actorLoss: 0, criticLoss: 0, entropy: 0 };
    }

    const n = this.buffer.length;
    const gamma = this.hyperparams.gamma;
    const lambda = this.hyperparams.gaeLambda;

    // 1. Compute Generalized Advantage Estimation (GAE)
    const advantages: number[] = new Array(n).fill(0);
    const returns: number[] = new Array(n).fill(0);

    let lastGae = 0;
    for (let t = n - 1; t >= 0; t--) {
      const trans = this.buffer[t];
      let nextVal = 0;
      if (!trans.done && t < n - 1) {
        nextVal = this.buffer[t + 1].value;
      }
      const delta = trans.reward + gamma * nextVal * (trans.done ? 0 : 1) - trans.value;
      lastGae = delta + gamma * lambda * (trans.done ? 0 : 1) * lastGae;
      advantages[t] = lastGae;
      returns[t] = advantages[t] + trans.value;
    }

    // Normalize Advantages
    let meanAdv = 0;
    for (let i = 0; i < n; i++) meanAdv += advantages[i];
    meanAdv /= n;
    let varAdv = 0;
    for (let i = 0; i < n; i++) varAdv += (advantages[i] - meanAdv) * (advantages[i] - meanAdv);
    const stdAdv = Math.sqrt(varAdv / n) + 1e-8;
    for (let i = 0; i < n; i++) {
      advantages[i] = (advantages[i] - meanAdv) / stdAdv;
    }

    // 2. Multi-epoch Mini-batch SGD Updates
    let totalActorLoss = 0;
    let totalCriticLoss = 0;
    let totalEntropy = 0;
    let updateBatches = 0;

    const indices = Array.from({ length: n }, (_, i) => i);

    for (let epoch = 0; epoch < this.hyperparams.epochsPerUpdate; epoch++) {
      // Shuffle indices
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = indices[i];
        indices[i] = indices[j];
        indices[j] = temp;
      }

      for (let start = 0; start < n; start += this.hyperparams.miniBatchSize) {
        const end = Math.min(start + this.hyperparams.miniBatchSize, n);
        const batchIndices = indices.slice(start, end);
        const bSize = batchIndices.length;

        // Perform Adam Step on Batch
        const result = this.trainMiniBatch(batchIndices, advantages, returns);
        totalActorLoss += result.actorLoss;
        totalCriticLoss += result.criticLoss;
        totalEntropy += result.entropy;
        updateBatches++;
      }
    }

    // Clear buffer after update
    this.buffer = [];

    return {
      actorLoss: updateBatches > 0 ? totalActorLoss / updateBatches : 0,
      criticLoss: updateBatches > 0 ? totalCriticLoss / updateBatches : 0,
      entropy: updateBatches > 0 ? totalEntropy / updateBatches : 0,
    };
  }

  private trainMiniBatch(
    indices: number[],
    advantages: number[],
    returns: number[]
  ): { actorLoss: number; criticLoss: number; entropy: number } {
    const B = indices.length;
    const H = this.hiddenDim;
    const S = this.stateDim;
    const A = this.actionDim;

    // Gradient accumulators
    const gActorW1 = createMatrix(H, S, () => 0);
    const gActorB1 = new Array(H).fill(0);
    const gActorW2 = createMatrix(H, H, () => 0);
    const gActorB2 = new Array(H).fill(0);
    const gActorWMean = createMatrix(A, H, () => 0);
    const gActorBMean = new Array(A).fill(0);
    const gLogStd = new Array(A).fill(0);

    const gCriticW1 = createMatrix(H, S, () => 0);
    const gCriticB1 = new Array(H).fill(0);
    const gCriticW2 = createMatrix(H, H, () => 0);
    const gCriticB2 = new Array(H).fill(0);
    const gCriticWVal = createMatrix(1, H, () => 0);
    const gCriticBVal = [0];

    let batchActorLoss = 0;
    let batchCriticLoss = 0;
    let batchEntropy = 0;

    for (let k = 0; k < B; k++) {
      const idx = indices[k];
      const trans = this.buffer[idx];
      const adv = advantages[idx];
      const ret = returns[idx];

      // --- Actor Forward & Backward ---
      const { mean, h1: ah1, h2: ah2 } = this.forwardActor(trans.state);

      // Compute new log prob and entropy
      let newLogProb = 0;
      let sampleEntropy = 0;
      const gradMeanAction: number[] = new Array(A);

      for (let i = 0; i < A; i++) {
        const std = Math.exp(this.logStd[i]);
        const diff = trans.action[i] - mean[i];
        const lp = -0.5 * ((diff * diff) / (std * std) + 2.0 * this.logStd[i] + Math.log(2 * Math.PI));
        newLogProb += lp;
        sampleEntropy += 0.5 * (1.0 + Math.log(2.0 * Math.PI * std * std));
      }
      batchEntropy += sampleEntropy;

      // PPO clipped ratio
      const ratio = Math.exp(newLogProb - trans.logProb);
      const surr1 = ratio * adv;
      const surr2 = Math.max(1.0 - this.hyperparams.clipRatio, Math.min(1.0 + this.hyperparams.clipRatio, ratio)) * adv;
      const ppoObj = Math.min(surr1, surr2);
      batchActorLoss -= ppoObj;

      // Gradient of PPO objective w.r.t newLogProb:
      // If surr1 <= surr2, or if ratio was unclipped:
      let dLoss_dLogProb = 0;
      if ((adv >= 0 && ratio < 1.0 + this.hyperparams.clipRatio) ||
          (adv < 0 && ratio > 1.0 - this.hyperparams.clipRatio)) {
        dLoss_dLogProb = -ratio * adv; // minus for gradient descent
      }

      for (let i = 0; i < A; i++) {
        const std = Math.exp(this.logStd[i]);
        const diff = trans.action[i] - mean[i];
        // dLogProb / dMean = (a - mean) / (std^2)
        const dLp_dMean = diff / (std * std);
        gradMeanAction[i] = dLoss_dLogProb * dLp_dMean;

        // dLogProb / dLogStd = (diff^2 / std^2) - 1
        const dLp_dLogStd = (diff * diff) / (std * std) - 1.0;
        gLogStd[i] += (dLoss_dLogProb * dLp_dLogStd - this.hyperparams.entropyCoeff) / B;
      }

      // Backpropagate to Actor Weights
      // Output layer: mean = tanh(WMean * ah2 + BMean)
      const dActPre: number[] = new Array(A);
      for (let i = 0; i < A; i++) {
        const dMean_dPre = 1.0 - mean[i] * mean[i]; // tanh derivative
        dActPre[i] = gradMeanAction[i] * dMean_dPre;
        gActorBMean[i] += dActPre[i] / B;
        for (let j = 0; j < H; j++) {
          gActorWMean[i][j] += (dActPre[i] * ah2[j]) / B;
        }
      }

      // Hidden 2: ah2 = tanh(W2 * ah1 + B2)
      const dAh2: number[] = new Array(H).fill(0);
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < A; i++) {
          dAh2[j] += dActPre[i] * this.actorWMean[i][j];
        }
      }
      const dPre2: number[] = new Array(H);
      for (let i = 0; i < H; i++) {
        dPre2[i] = dAh2[i] * (1.0 - ah2[i] * ah2[i]);
        gActorB2[i] += dPre2[i] / B;
        for (let j = 0; j < H; j++) {
          gActorW2[i][j] += (dPre2[i] * ah1[j]) / B;
        }
      }

      // Hidden 1: ah1 = tanh(W1 * state + B1)
      const dAh1: number[] = new Array(H).fill(0);
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < H; i++) {
          dAh1[j] += dPre2[i] * this.actorW2[i][j];
        }
      }
      for (let i = 0; i < H; i++) {
        const dPre1 = dAh1[i] * (1.0 - ah1[i] * ah1[i]);
        gActorB1[i] += dPre1 / B;
        for (let j = 0; j < S; j++) {
          gActorW1[i][j] += (dPre1 * trans.state[j]) / B;
        }
      }

      // --- Critic Forward & Backward ---
      const { value: predVal, h1: ch1, h2: ch2 } = this.forwardCritic(trans.state);
      const valDiff = predVal - ret;
      batchCriticLoss += 0.5 * valDiff * valDiff;

      // d(0.5 * valDiff^2) / dVal = valDiff
      const dVal = valDiff;
      gCriticBVal[0] += dVal / B;
      for (let j = 0; j < H; j++) {
        gCriticWVal[0][j] += (dVal * ch2[j]) / B;
      }

      // Hidden 2
      const dCh2: number[] = new Array(H);
      for (let j = 0; j < H; j++) {
        dCh2[j] = dVal * this.criticWVal[0][j];
      }
      const dCPre2: number[] = new Array(H);
      for (let i = 0; i < H; i++) {
        dCPre2[i] = dCh2[i] * (1.0 - ch2[i] * ch2[i]);
        gCriticB2[i] += dCPre2[i] / B;
        for (let j = 0; j < H; j++) {
          gCriticW2[i][j] += (dCPre2[i] * ch1[j]) / B;
        }
      }

      // Hidden 1
      const dCh1: number[] = new Array(H).fill(0);
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < H; i++) {
          dCh1[j] += dCPre2[i] * this.criticW2[i][j];
        }
      }
      for (let i = 0; i < H; i++) {
        const dCPre1 = dCh1[i] * (1.0 - ch1[i] * ch1[i]);
        gCriticB1[i] += dCPre1 / B;
        for (let j = 0; j < S; j++) {
          gCriticW1[i][j] += (dCPre1 * trans.state[j]) / B;
        }
      }
    }

    // Apply Adam Optimizer Updates with Gradient Clipping
    this.optimizerStep++;
    this.applyAdam(
      this.hyperparams.learningRateActor,
      this.hyperparams.learningRateCritic,
      {
        gActorW1, gActorB1, gActorW2, gActorB2, gActorWMean, gActorBMean, gLogStd,
        gCriticW1, gCriticB1, gCriticW2, gCriticB2, gCriticWVal, gCriticBVal,
      }
    );

    return {
      actorLoss: batchActorLoss / B,
      criticLoss: batchCriticLoss / B,
      entropy: batchEntropy / B,
    };
  }

  private applyAdam(
    lrActor: number,
    lrCritic: number,
    grads: {
      gActorW1: number[][]; gActorB1: number[]; gActorW2: number[][]; gActorB2: number[];
      gActorWMean: number[][]; gActorBMean: number[]; gLogStd: number[];
      gCriticW1: number[][]; gCriticB1: number[]; gCriticW2: number[][]; gCriticB2: number[];
      gCriticWVal: number[][]; gCriticBVal: number[];
    }
  ): void {
    const beta1 = 0.9;
    const beta2 = 0.999;
    const eps = 1e-8;
    const t = this.optimizerStep;
    const b1Corr = 1.0 - Math.pow(beta1, t);
    const b2Corr = 1.0 - Math.pow(beta2, t);

    // Helper for 2D weight update with gradient clipping
    const update2D = (
      w: number[][],
      grad: number[][],
      m: number[][],
      v: number[][],
      lr: number
    ) => {
      for (let i = 0; i < w.length; i++) {
        for (let j = 0; j < w[i].length; j++) {
          const g = Math.max(-1.0, Math.min(1.0, grad[i][j])); // Clip grad
          m[i][j] = beta1 * m[i][j] + (1 - beta1) * g;
          v[i][j] = beta2 * v[i][j] + (1 - beta2) * g * g;
          const mHat = m[i][j] / b1Corr;
          const vHat = v[i][j] / b2Corr;
          w[i][j] -= (lr * mHat) / (Math.sqrt(vHat) + eps);
        }
      }
    };

    // Helper for 1D vector update
    const update1D = (
      w: number[],
      grad: number[],
      m: number[],
      v: number[],
      lr: number
    ) => {
      for (let i = 0; i < w.length; i++) {
        const g = Math.max(-1.0, Math.min(1.0, grad[i]));
        m[i] = beta1 * m[i] + (1 - beta1) * g;
        v[i] = beta2 * v[i] + (1 - beta2) * g * g;
        const mHat = m[i] / b1Corr;
        const vHat = v[i] / b2Corr;
        w[i] -= (lr * mHat) / (Math.sqrt(vHat) + eps);
      }
    };

    // Update Actor Parameters
    update2D(this.actorW1, grads.gActorW1, this.mActorW1, this.vActorW1, lrActor);
    update1D(this.actorB1, grads.gActorB1, this.mActorB1, this.vActorB1, lrActor);
    update2D(this.actorW2, grads.gActorW2, this.mActorW2, this.vActorW2, lrActor);
    update1D(this.actorB2, grads.gActorB2, this.mActorB2, this.vActorB2, lrActor);
    update2D(this.actorWMean, grads.gActorWMean, this.mActorWMean, this.vActorWMean, lrActor);
    update1D(this.actorBMean, grads.gActorBMean, this.mActorBMean, this.vActorBMean, lrActor);
    update1D(this.logStd, grads.gLogStd, this.mLogStd, this.vLogStd, lrActor);

    // Keep logStd within stable bounds [-2.0, 0.2] -> std between [0.13, 1.22]
    for (let i = 0; i < this.actionDim; i++) {
      this.logStd[i] = Math.max(-2.0, Math.min(0.2, this.logStd[i]));
    }

    // Update Critic Parameters
    update2D(this.criticW1, grads.gCriticW1, this.mCriticW1, this.vCriticW1, lrCritic);
    update1D(this.criticB1, grads.gCriticB1, this.mCriticB1, this.vCriticB1, lrCritic);
    update2D(this.criticW2, grads.gCriticW2, this.mCriticW2, this.vCriticW2, lrCritic);
    update1D(this.criticB2, grads.gCriticB2, this.mCriticB2, this.vCriticB2, lrCritic);
    update2D(this.criticWVal, grads.gCriticWVal, this.mCriticWVal, this.vCriticWVal, lrCritic);
    update1D(this.criticBVal, grads.gCriticBVal, this.mCriticBVal, this.vCriticBVal, lrCritic);
  }

  /**
   * Export network parameters to JSON checkpoint
   */
  public exportCheckpoint(episodesTrained: number, bestReward: number, successRate: number): AgentCheckpoint {
    return {
      version: '1.0.0',
      name: 'PPO-Rocket-Lander-Agent',
      timestamp: new Date().toISOString(),
      totalEpisodesTrained: episodesTrained,
      bestReward,
      successRate,
      hyperparameters: { ...this.hyperparams },
      actorWeights: {
        w1: this.actorW1.map((r) => [...r]),
        b1: [...this.actorB1],
        w2: this.actorW2.map((r) => [...r]),
        b2: [...this.actorB2],
        wMean: this.actorWMean.map((r) => [...r]),
        bMean: [...this.actorBMean],
        logStd: [...this.logStd],
      },
      criticWeights: {
        w1: this.criticW1.map((r) => [...r]),
        b1: [...this.criticB1],
        w2: this.criticW2.map((r) => [...r]),
        b2: [...this.criticB2],
        wVal: this.criticWVal.map((r) => [...r]),
        bVal: [...this.criticBVal],
      },
    };
  }

  /**
   * Load network parameters from JSON checkpoint
   */
  public loadCheckpoint(checkpoint: AgentCheckpoint): void {
    if (!checkpoint.actorWeights || !checkpoint.criticWeights) {
      throw new Error('Invalid checkpoint format: missing actor or critic weights.');
    }

    this.actorW1 = checkpoint.actorWeights.w1.map((r) => [...r]);
    this.actorB1 = [...checkpoint.actorWeights.b1];
    this.actorW2 = checkpoint.actorWeights.w2.map((r) => [...r]);
    this.actorB2 = [...checkpoint.actorWeights.b2];
    this.actorWMean = checkpoint.actorWeights.wMean.map((r) => [...r]);
    this.actorBMean = [...checkpoint.actorWeights.bMean];
    this.logStd = [...checkpoint.actorWeights.logStd];

    this.criticW1 = checkpoint.criticWeights.w1.map((r) => [...r]);
    this.criticB1 = [...checkpoint.criticWeights.b1];
    this.criticW2 = checkpoint.criticWeights.w2.map((r) => [...r]);
    this.criticB2 = [...checkpoint.criticWeights.b2];
    this.criticWVal = checkpoint.criticWeights.wVal.map((r) => [...r]);
    this.criticBVal = [...checkpoint.criticWeights.bVal];

    if (checkpoint.hyperparameters) {
      this.hyperparams = { ...this.hyperparams, ...checkpoint.hyperparameters };
    }
  }
}
