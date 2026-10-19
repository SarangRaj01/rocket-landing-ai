import { TelemetryData, RewardBreakdown, LandingStatus } from '../types/simulation';

export class RewardCalculator {
  /**
   * Calculates transparent reward components at each simulation step.
   */
  public static calculateStepReward(
    telemetry: TelemetryData,
    status: LandingStatus,
    prevAltitude: number
  ): RewardBreakdown {
    const {
      altitude,
      distanceToPadCenter,
      tiltAngleDeg,
      horizontalSpeed,
      verticalSpeed,
      angularVelocity,
      throttle,
      rcsPitch,
      rcsRoll,
      settledFrames,
    } = telemetry;

    // 1. Proximity to Pad Center Reward / Distance Penalty
    // Higher penalty when far from the pad center (x, z)
    const distancePenalty = -0.08 * distanceToPadCenter;

    // 2. Upright Alignment Reward
    // 0 deg tilt -> +0.6, 15 deg tilt -> ~+0.35, >30 deg -> 0 or negative
    const tiltRad = (tiltAngleDeg * Math.PI) / 180;
    const uprightReward = 0.6 * Math.max(-0.5, Math.cos(tiltRad));

    // 3. Angular Velocity Penalty (discourage wobbling and spinning)
    const angVelMagSq =
      angularVelocity[0] * angularVelocity[0] +
      angularVelocity[1] * angularVelocity[1] +
      angularVelocity[2] * angularVelocity[2];
    const angularVelocityPenalty = -0.06 * Math.min(20.0, angVelMagSq);

    // 4. Horizontal Speed Penalty (discourage lateral drifting)
    const horizontalSpeedPenalty = -0.12 * Math.min(10.0, horizontalSpeed * horizontalSpeed);

    // 5. Descent Velocity Shaping
    // Ideal descent speed depends on altitude:
    // When high (altitude > 8m), target descent speed is ~ -2.0 m/s.
    // Near ground (altitude < 2m), target descent speed is ~ -0.8 m/s.
    // Rising rapidly (vy > 0.5) is penalized to prevent hovering forever.
    const targetVy = -Math.max(0.5, Math.min(2.5, 0.4 + altitude * 0.15));
    const vyDiff = Math.abs(verticalSpeed - targetVy);
    const descentVelocityShaping = -0.08 * vyDiff - (verticalSpeed > 0.8 ? 0.15 * verticalSpeed : 0);

    // 6. Ground Proximity Bonus
    // Award stability when close to the pad
    let groundProximityBonus = 0;
    if (altitude < 3.0) {
      const proximityFactor = (3.0 - altitude) / 3.0; // 0 to 1
      const isUpright = tiltAngleDeg < 12.0;
      const isSlow = Math.abs(verticalSpeed) < 1.8 && horizontalSpeed < 1.0;
      const isOverPad = distanceToPadCenter < 3.5;

      if (isUpright && isSlow && isOverPad) {
        groundProximityBonus = 0.5 * proximityFactor;
      }
    }

    // Touchdown settling bonus
    if (settledFrames > 0) {
      groundProximityBonus += Math.min(1.0, settledFrames * 0.05);
    }

    // 7. Fuel / Actuator Penalty (encourage smooth, efficient control)
    const fuelPenalty =
      -0.03 * throttle - 0.015 * (Math.abs(rcsPitch) + Math.abs(rcsRoll));

    // 8. Terminal Rewards & Penalties
    let terminalReward = 0;
    if (status === 'LANDED') {
      // Substantial positive terminal bonus: scales with landing precision
      const accuracyBonus = Math.max(0, 50.0 * (1.0 - distanceToPadCenter / 3.5));
      const softnessBonus = Math.max(0, 30.0 * (1.0 - Math.abs(verticalSpeed) / 1.8));
      terminalReward = 220.0 + accuracyBonus + softnessBonus;
    } else if (status === 'CRASHED') {
      // Negative crash penalty
      terminalReward = -120.0;
    } else if (status === 'TIMEOUT') {
      // Timeout penalty (penalize stalling/hovering without landing)
      terminalReward = -35.0;
    }

    const total =
      distancePenalty +
      uprightReward +
      angularVelocityPenalty +
      horizontalSpeedPenalty +
      descentVelocityShaping +
      groundProximityBonus +
      fuelPenalty +
      terminalReward;

    return {
      total,
      distancePenalty,
      uprightReward,
      angularVelocityPenalty,
      horizontalSpeedPenalty,
      descentVelocityShaping,
      groundProximityBonus,
      fuelPenalty,
      terminalReward,
    };
  }
}
