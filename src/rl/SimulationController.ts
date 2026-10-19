import RAPIER from '@dimforge/rapier3d-compat';
import confetti from 'canvas-confetti';
import { RocketPhysicsSimulation } from '../physics/RocketPhysics';
import { PPOAgent } from './PPOAgent';
import { RewardCalculator } from './RewardFunction';
import { getPretrainedCheckpoint } from './PretrainedCheckpoint';
import { useSimulationStore } from '../state/simulationStore';
import { AgentCheckpoint, EpisodeResult } from '../types/simulation';

export class SimulationController {
  private static instance: SimulationController | null = null;

  public physicsSim: RocketPhysicsSimulation | null = null;
  public agent: PPOAgent | null = null;
  private worker: Worker | null = null;

  private isRunning: boolean = false;
  private isInitialized: boolean = false;
  private prevAltitude: number = 14.0;
  private episodeStartTime: number = Date.now();
  private episodeRewardAccum: number = 0;
  private resetDelayTimer: any = null;

  private constructor() {}

  public static getInstance(): SimulationController {
    if (!SimulationController.instance) {
      SimulationController.instance = new SimulationController();
    }
    return SimulationController.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      await RAPIER.init();
      this.physicsSim = new RocketPhysicsSimulation(RAPIER);
      this.agent = new PPOAgent();

      // Load pre-trained weights by default
      const pretrained = getPretrainedCheckpoint();
      this.agent.loadCheckpoint(pretrained);

      // Web worker initialization with fallback
      try {
        this.worker = new Worker(new URL('./trainingWorker.ts', import.meta.url), {
          type: 'module',
        });

        this.worker.onmessage = (e: MessageEvent) => {
          const { type, payload } = e.data;
          if (type === 'SYNC_MODEL_WEIGHTS' && payload && this.agent) {
            const store = useSimulationStore.getState();
            if (store.mode === 'TRAINING') {
              this.agent.loadCheckpoint(payload as AgentCheckpoint);
            }
          } else if (type === 'PPO_UPDATE_DONE' && payload) {
            useSimulationStore.getState().updatePpoMetrics(
              payload.actorLoss,
              payload.criticLoss,
              payload.entropy
            );
          }
        };

        this.worker.postMessage({ type: 'INIT' });
      } catch (workerErr) {
        console.warn('Worker initialization notice (falling back to direct thread):', workerErr);
      }

      useSimulationStore.getState().setInitialized(true);
      this.resetEpisode();
      this.startLoop();
    } catch (err) {
      console.error('Fatal initialization error:', err);
    }
  }

  public startLoop(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      if (!this.isRunning) return;

      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const store = useSimulationStore.getState();
      if (store.isRunning && this.physicsSim && this.agent) {
        // Multi-stepping based on simSpeed
        const subSteps = Math.max(1, Math.min(10, Math.round(store.simSpeed)));
        for (let i = 0; i < subSteps; i++) {
          this.stepSimulation();
          if (this.physicsSim.status !== 'AIRBORNE') {
            break;
          }
        }
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  private stepSimulation(): void {
    if (!this.physicsSim || !this.agent) return;

    const store = useSimulationStore.getState();
    const isEvaluation = store.mode === 'EVALUATION';

    // If episode ended and waiting for reset delay, do not step physics
    if (this.physicsSim.status !== 'AIRBORNE' && this.physicsSim.status !== 'TOUCHDOWN') {
      return;
    }

    try {
      const obs = this.physicsSim.getObservation();
      const stateArr = this.agent.stateToArray(obs);

      // In evaluation mode: deterministic actions; in training: continuous stochastic policy
      const { actionVector, rawAction, logProb, value } = this.agent.selectAction(obs, isEvaluation);

      // Apply wind setting from store
      this.physicsSim.config.windEnabled = store.windEnabled;
      this.physicsSim.config.windIntensity = store.windIntensity;

      const { observation: nextObs, status } = this.physicsSim.step(actionVector);
      const telemetry = this.physicsSim.getTelemetry();

      // Calculate transparent reward
      const rewardBreakdown = RewardCalculator.calculateStepReward(
        telemetry,
        status,
        this.prevAltitude
      );
      this.prevAltitude = telemetry.altitude;
      this.episodeRewardAccum += rewardBreakdown.total;

      // Stream telemetry to store & add motion trail point
      store.updateTelemetry(telemetry, rewardBreakdown);
      if (telemetry.currentStep % 2 === 0) {
        store.addMotionTrailPoint([
          telemetry.position[0],
          telemetry.position[1],
          telemetry.position[2],
        ]);
      }

      const done = (status === 'LANDED' || status === 'CRASHED' || status === 'TIMEOUT');

      // Store transition for training if in training mode
      if (store.mode === 'TRAINING' && store.isTraining) {
        const nextStateArr = this.agent.stateToArray(nextObs);
        this.agent.storeTransition({
          state: stateArr,
          action: rawAction,
          reward: rewardBreakdown.total,
          nextState: nextStateArr,
          done,
          logProb,
          value,
        });

        // Trigger PPO optimization update when batch is ready
        if (this.agent.buffer.length >= this.agent.hyperparams.batchSize) {
          const metrics = this.agent.update();
          store.updatePpoMetrics(metrics.actorLoss, metrics.criticLoss, metrics.entropy);
        }
      }

      // Episode terminal handling
      if (done) {
        this.handleEpisodeEnd(status, telemetry);
      }
    } catch (stepErr) {
      console.error('Error during stepSimulation:', stepErr);
    }
  }

  private handleEpisodeEnd(status: string, telemetry: any): void {
    if (this.resetDelayTimer) return;

    const store = useSimulationStore.getState();
    const epDurationSec = (Date.now() - this.episodeStartTime) / 1000;

    // Trigger celebratory confetti on landing!
    if (status === 'LANDED') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00ff66', '#00e5ff', '#ffffff', '#ffb703'],
        });
      } catch (e) {
        // ignore
      }
    }

    const epResult: EpisodeResult = {
      episodeNumber: store.stats.totalEpisodes + 1,
      status: telemetry.landingStatus,
      totalReward: this.episodeRewardAccum,
      durationSteps: telemetry.currentStep,
      durationSeconds: epDurationSec,
      finalPosition: telemetry.position,
      finalVelocity: telemetry.velocity,
      finalTiltDeg: telemetry.tiltAngleDeg,
      fuelUsed: this.physicsSim ? this.physicsSim.fuelUsed : 0,
      timestamp: Date.now(),
    };

    store.recordEpisodeResult(epResult);

    // Brief pause so user sees touchdown or crash clearly before next episode starts
    const delayMs = status === 'LANDED' ? 1800 : 1200;
    this.resetDelayTimer = setTimeout(() => {
      this.resetDelayTimer = null;
      this.resetEpisode();
    }, delayMs);
  }

  public resetEpisode(): void {
    if (this.resetDelayTimer) {
      clearTimeout(this.resetDelayTimer);
      this.resetDelayTimer = null;
    }
    if (this.physicsSim) {
      this.physicsSim.reset(true);
      const tel = this.physicsSim.getTelemetry();
      this.prevAltitude = tel.altitude;
      useSimulationStore.getState().updateTelemetry(tel, {
        total: 0,
        distancePenalty: 0,
        uprightReward: 0,
        angularVelocityPenalty: 0,
        horizontalSpeedPenalty: 0,
        descentVelocityShaping: 0,
        groundProximityBonus: 0,
        fuelPenalty: 0,
        terminalReward: 0,
      });
    }
    this.episodeStartTime = Date.now();
    this.episodeRewardAccum = 0;
    useSimulationStore.getState().clearMotionTrail();
  }

  public saveAgentCheckpoint(): void {
    if (!this.agent) return;
    const store = useSimulationStore.getState();
    const checkpoint = this.agent.exportCheckpoint(
      store.stats.totalEpisodes,
      store.stats.bestReward,
      store.stats.successRateRecent
    );

    const jsonStr = JSON.stringify(checkpoint, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rocket-agent-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public loadAgentCheckpoint(checkpoint: AgentCheckpoint): void {
    if (!this.agent) return;
    this.agent.loadCheckpoint(checkpoint);
    if (this.worker) {
      this.worker.postMessage({ type: 'LOAD_CHECKPOINT', payload: checkpoint });
    }
    this.resetEpisode();
  }

  public loadPretrained(): void {
    const checkpoint = getPretrainedCheckpoint();
    this.loadAgentCheckpoint(checkpoint);
  }

  public restartFromScratch(): void {
    this.agent = new PPOAgent();
    useSimulationStore.getState().resetAllStats();
    if (this.worker) {
      this.worker.postMessage({ type: 'RESET_STATS' });
    }
    this.resetEpisode();
  }
}
