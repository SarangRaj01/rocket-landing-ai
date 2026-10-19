import RAPIER from '@dimforge/rapier3d-compat';
import { RocketPhysicsSimulation } from '../physics/RocketPhysics';
import { PPOAgent } from './PPOAgent';
import { RewardCalculator } from './RewardFunction';
import { AgentCheckpoint, EpisodeResult } from '../types/simulation';

let rapierInstance: typeof RAPIER | null = null;
let physicsSim: RocketPhysicsSimulation | null = null;
let agent: PPOAgent | null = null;

let isTrainingActive = false;
let episodeCount = 0;
let bestReward = -Infinity;
let totalLandings = 0;
let totalCrashes = 0;
let totalTimeouts = 0;

async function initWorker() {
  await RAPIER.init();
  rapierInstance = RAPIER;
  physicsSim = new RocketPhysicsSimulation(rapierInstance);
  agent = new PPOAgent();
  self.postMessage({ type: 'WORKER_READY' });
}

function runOneTrainingEpisode(): EpisodeResult {
  if (!physicsSim || !agent) throw new Error('Worker not initialized');

  let obs = physicsSim.reset(true);
  let totalReward = 0;
  let done = false;
  const startTime = Date.now();
  let prevAltitude = physicsSim.getTelemetry().altitude;

  while (!done) {
    const { actionVector, rawAction, logProb, value } = agent.selectAction(obs, false);
    const stateArr = agent.stateToArray(obs);

    const { observation: nextObs, status } = physicsSim.step(actionVector);
    const telemetry = physicsSim.getTelemetry();

    const rewardBreakdown = RewardCalculator.calculateStepReward(telemetry, status, prevAltitude);
    totalReward += rewardBreakdown.total;
    prevAltitude = telemetry.altitude;

    done = (status === 'LANDED' || status === 'CRASHED' || status === 'TIMEOUT');
    const nextStateArr = agent.stateToArray(nextObs);

    agent.storeTransition({
      state: stateArr,
      action: rawAction,
      reward: rewardBreakdown.total,
      nextState: nextStateArr,
      done,
      logProb,
      value,
    });

    obs = nextObs;

    // Check if buffer is large enough for PPO update
    if (agent.buffer.length >= agent.hyperparams.batchSize) {
      const updateMetrics = agent.update();
      self.postMessage({
        type: 'PPO_UPDATE_DONE',
        payload: updateMetrics,
      });
    }
  }

  episodeCount++;
  const finalTel = physicsSim.getTelemetry();
  if (finalTel.landingStatus === 'LANDED') totalLandings++;
  else if (finalTel.landingStatus === 'CRASHED') totalCrashes++;
  else totalTimeouts++;

  if (totalReward > bestReward) bestReward = totalReward;

  const result: EpisodeResult = {
    episodeNumber: episodeCount,
    status: finalTel.landingStatus,
    totalReward,
    durationSteps: finalTel.currentStep,
    durationSeconds: (Date.now() - startTime) / 1000,
    finalPosition: finalTel.position,
    finalVelocity: finalTel.velocity,
    finalTiltDeg: finalTel.tiltAngleDeg,
    fuelUsed: physicsSim.fuelUsed,
    timestamp: Date.now(),
  };

  return result;
}

function trainingLoop() {
  if (!isTrainingActive) return;

  // Run a batch of steps/episodes per loop cycle to maintain high throughput
  const epResult = runOneTrainingEpisode();

  self.postMessage({
    type: 'EPISODE_COMPLETED',
    payload: {
      result: epResult,
      totalEpisodes: episodeCount,
      totalLandings,
      totalCrashes,
      bestReward,
    },
  });

  // Periodically sync model weights to main thread every 5 episodes
  if (episodeCount % 5 === 0 && agent) {
    const successRate = episodeCount > 0 ? (totalLandings / episodeCount) * 100 : 0;
    const checkpoint = agent.exportCheckpoint(episodeCount, bestReward, successRate);
    self.postMessage({
      type: 'SYNC_MODEL_WEIGHTS',
      payload: checkpoint,
    });
  }

  // Yield to browser event loop
  setTimeout(trainingLoop, 0);
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT':
      await initWorker();
      break;

    case 'START_TRAINING':
      isTrainingActive = true;
      trainingLoop();
      break;

    case 'PAUSE_TRAINING':
      isTrainingActive = false;
      break;

    case 'LOAD_CHECKPOINT':
      if (agent && payload) {
        agent.loadCheckpoint(payload as AgentCheckpoint);
        episodeCount = payload.totalEpisodesTrained || episodeCount;
        bestReward = payload.bestReward || bestReward;
        self.postMessage({ type: 'CHECKPOINT_LOADED' });
      }
      break;

    case 'REQUEST_SYNC':
      if (agent) {
        const successRate = episodeCount > 0 ? (totalLandings / episodeCount) * 100 : 0;
        const checkpoint = agent.exportCheckpoint(episodeCount, bestReward, successRate);
        self.postMessage({
          type: 'SYNC_MODEL_WEIGHTS',
          payload: checkpoint,
        });
      }
      break;

    case 'RESET_STATS':
      episodeCount = 0;
      totalLandings = 0;
      totalCrashes = 0;
      totalTimeouts = 0;
      bestReward = -Infinity;
      if (agent) agent.buffer = [];
      break;
  }
};
