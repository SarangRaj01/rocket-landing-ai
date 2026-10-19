import RAPIER from '@dimforge/rapier3d-compat';
import { ObservationVector, ActionVector, TelemetryData, LandingStatus } from '../types/simulation';

export interface RocketPhysicsConfig {
  gravity: number;
  rocketMass: number;
  maxMainThrust: number;
  maxRcsTorque: number;
  initialAltitudeMin: number;
  initialAltitudeMax: number;
  initialHorizontalOffset: number;
  initialTiltMaxRad: number;
  initialVelocityMax: number;
  maxStepsPerEpisode: number;
  windEnabled: boolean;
  windIntensity: number; // 0 to 1
}

export const DEFAULT_PHYSICS_CONFIG: RocketPhysicsConfig = {
  gravity: -9.81,
  rocketMass: 1000.0,
  maxMainThrust: 24000.0, // ~2.44 TWR max, hover throttle ~ 0.41
  maxRcsTorque: 5500.0,
  initialAltitudeMin: 12.0,
  initialAltitudeMax: 18.0,
  initialHorizontalOffset: 3.5,
  initialTiltMaxRad: 0.18, // ~10.3 degrees initial tilt
  initialVelocityMax: 1.5,
  maxStepsPerEpisode: 600, // 600 steps at 60Hz = 10 seconds
  windEnabled: false,
  windIntensity: 0.3,
};

export class RocketPhysicsSimulation {
  private R: typeof RAPIER;
  public world!: RAPIER.World;
  public rocketBody!: RAPIER.RigidBody;
  public groundCollider!: RAPIER.Collider;
  public padCollider!: RAPIER.Collider;

  public config: RocketPhysicsConfig;
  public stepCount: number = 0;
  public settledFrames: number = 0;
  public status: LandingStatus = 'AIRBORNE';
  public currentAction: ActionVector = { mainThruster: 0, pitchTorque: 0, rollTorque: 0, yawTorque: 0 };
  public fuelRemaining: number = 100.0;
  public fuelUsed: number = 0.0;
  public isContactingPad: boolean = false;

  private windForce: [number, number, number] = [0, 0, 0];
  private windPhase: number = 0;

  constructor(rapierInstance: typeof RAPIER, config: Partial<RocketPhysicsConfig> = {}) {
    this.R = rapierInstance;
    this.config = { ...DEFAULT_PHYSICS_CONFIG, ...config };
    this.initPhysicsWorld();
  }

  private initPhysicsWorld(): void {
    const gravity = new this.R.Vector3(0, this.config.gravity, 0);
    this.world = new this.R.World(gravity);

    // 1. Static Ground Plane (concrete airfield)
    const groundBodyDesc = this.R.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0);
    const groundBody = this.world.createRigidBody(groundBodyDesc);
    const groundColliderDesc = this.R.ColliderDesc.cuboid(60.0, 0.5, 60.0)
      .setFriction(0.8)
      .setRestitution(0.05);
    this.groundCollider = this.world.createCollider(groundColliderDesc, groundBody);

    // 2. Circular Landing Pad (slightly raised center surface)
    const padBodyDesc = this.R.RigidBodyDesc.fixed().setTranslation(0, 0.02, 0);
    const padBody = this.world.createRigidBody(padBodyDesc);
    const padColliderDesc = this.R.ColliderDesc.cylinder(0.05, 4.5)
      .setFriction(0.9)
      .setRestitution(0.02);
    this.padCollider = this.world.createCollider(padColliderDesc, padBody);

    // 3. Rocket Dynamic Rigid Body
    const rocketBodyDesc = this.R.RigidBodyDesc.dynamic()
      .setTranslation(0, 14.0, 0)
      .setLinearDamping(0.15)
      .setAngularDamping(0.8)
      .setAdditionalMass(this.config.rocketMass);
    this.rocketBody = this.world.createRigidBody(rocketBodyDesc);

    // Rocket Main Fuselage Collider (capsule / cylinder)
    // Height: ~2.8m, radius: 0.6m
    const bodyColliderDesc = this.R.ColliderDesc.capsule(1.2, 0.58)
      .setTranslation(0, 0.3, 0)
      .setFriction(0.5)
      .setRestitution(0.1);
    this.world.createCollider(bodyColliderDesc, this.rocketBody);

    // 4 Articulated Footpad Colliders around base
    // Footpad radius 1.35m from center at y = -1.25m
    const legRadius = 1.35;
    const footpadY = -1.25;
    const footpadThickness = 0.12;
    const footpadSize = 0.22;

    const legAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    legAngles.forEach((angle) => {
      const lx = Math.cos(angle) * legRadius;
      const lz = Math.sin(angle) * legRadius;
      const footColliderDesc = this.R.ColliderDesc.cuboid(footpadSize, footpadThickness, footpadSize)
        .setTranslation(lx, footpadY, lz)
        .setFriction(1.0)
        .setRestitution(0.02);
      this.world.createCollider(footColliderDesc, this.rocketBody);
    });

    this.reset();
  }

  public reset(randomize: boolean = true): ObservationVector {
    this.stepCount = 0;
    this.settledFrames = 0;
    this.status = 'AIRBORNE';
    this.fuelRemaining = 100.0;
    this.fuelUsed = 0.0;
    this.isContactingPad = false;
    this.currentAction = { mainThruster: 0, pitchTorque: 0, rollTorque: 0, yawTorque: 0 };

    let posX = 0;
    let posY = 15.0;
    let posZ = 0;
    let vx = 0;
    let vy = -1.0;
    let vz = 0;
    let qx = 0, qy = 0, qz = 0, qw = 1;
    let wx = 0, wy = 0, wz = 0;

    if (randomize) {
      const hRange = this.config.initialHorizontalOffset;
      posX = (Math.random() * 2 - 1) * hRange;
      posZ = (Math.random() * 2 - 1) * hRange;
      posY = this.config.initialAltitudeMin + Math.random() * (this.config.initialAltitudeMax - this.config.initialAltitudeMin);

      const vMax = this.config.initialVelocityMax;
      vx = (Math.random() * 2 - 1) * vMax;
      vz = (Math.random() * 2 - 1) * vMax;
      vy = -0.5 - Math.random() * 2.0; // initial descent speed 0.5 to 2.5 m/s

      // Small initial tilt
      const tiltMax = this.config.initialTiltMaxRad;
      const pitchInit = (Math.random() * 2 - 1) * tiltMax;
      const rollInit = (Math.random() * 2 - 1) * tiltMax;
      const yawInit = (Math.random() * 2 - 1) * 0.3;

      // Convert Euler to Quaternion
      const cy = Math.cos(yawInit * 0.5);
      const sy = Math.sin(yawInit * 0.5);
      const cp = Math.cos(pitchInit * 0.5);
      const sp = Math.sin(pitchInit * 0.5);
      const cr = Math.cos(rollInit * 0.5);
      const sr = Math.sin(rollInit * 0.5);

      qw = cr * cp * cy + sr * sp * sy;
      qx = sr * cp * cy - cr * sp * sy;
      qy = cr * sp * cy + sr * cp * sy;
      qz = cr * cp * sy - sr * sp * cy;

      wx = (Math.random() * 2 - 1) * 0.2;
      wy = (Math.random() * 2 - 1) * 0.1;
      wz = (Math.random() * 2 - 1) * 0.2;
    }

    this.rocketBody.setTranslation({ x: posX, y: posY, z: posZ }, true);
    this.rocketBody.setRotation({ x: qx, y: qy, z: qz, w: qw }, true);
    this.rocketBody.setLinvel({ x: vx, y: vy, z: vz }, true);
    this.rocketBody.setAngvel({ x: wx, y: wy, z: wz }, true);

    this.windPhase = Math.random() * 100;
    this.updateWind();

    return this.getObservation();
  }

  private updateWind(): void {
    if (!this.config.windEnabled) {
      this.windForce = [0, 0, 0];
      return;
    }
    this.windPhase += 0.02;
    const maxWind = 1200.0 * this.config.windIntensity;
    this.windForce = [
      Math.sin(this.windPhase * 0.7) * maxWind + Math.cos(this.windPhase * 1.3) * (maxWind * 0.3),
      0,
      Math.cos(this.windPhase * 0.5) * maxWind + Math.sin(this.windPhase * 1.1) * (maxWind * 0.3),
    ];
  }

  public step(action: ActionVector): { observation: ObservationVector; status: LandingStatus } {
    if (this.status === 'LANDED' || this.status === 'CRASHED' || this.status === 'TIMEOUT') {
      return { observation: this.getObservation(), status: this.status };
    }

    this.stepCount++;
    this.updateWind();

    // Clamp actions
    const throttle = Math.max(0.0, Math.min(1.0, action.mainThruster));
    const pitchT = Math.max(-1.0, Math.min(1.0, action.pitchTorque));
    const rollT = Math.max(-1.0, Math.min(1.0, action.rollTorque));
    const yawT = Math.max(-1.0, Math.min(1.0, action.yawTorque));

    this.currentAction = { mainThruster: throttle, pitchTorque: pitchT, rollTorque: rollT, yawTorque: yawT };

    // Fuel consumption: 0.15% per step at full throttle + small RCS consumption
    const fuelCost = (throttle * 0.12 + (Math.abs(pitchT) + Math.abs(rollT) + Math.abs(yawT)) * 0.02);
    if (this.fuelRemaining > 0) {
      this.fuelRemaining = Math.max(0, this.fuelRemaining - fuelCost);
      this.fuelUsed += fuelCost;
    }

    const effectiveThrottle = this.fuelRemaining > 0 ? throttle : 0;
    const effectivePitch = this.fuelRemaining > 0 ? pitchT : 0;
    const effectiveRoll = this.fuelRemaining > 0 ? rollT : 0;
    const effectiveYaw = this.fuelRemaining > 0 ? yawT : 0;

    // Apply main thrust in rocket's local +Y direction
    const rot = this.rocketBody.rotation();
    // Rotate local vector (0, 1, 0) by quaternion (qx, qy, qz, qw)
    const qx = rot.x, qy = rot.y, qz = rot.z, qw = rot.w;
    const thrustUpX = 2 * (qx * qy - qw * qz);
    const thrustUpY = 1 - 2 * (qx * qx + qz * qz);
    const thrustUpZ = 2 * (qy * qz + qw * qx);

    const thrustMag = effectiveThrottle * this.config.maxMainThrust;
    const totalFx = thrustUpX * thrustMag + this.windForce[0];
    const totalFy = thrustUpY * thrustMag + this.windForce[1];
    const totalFz = thrustUpZ * thrustMag + this.windForce[2];

    this.rocketBody.resetForces(true);
    this.rocketBody.addForce({ x: totalFx, y: totalFy, z: totalFz }, true);

    // Apply RCS Torques in Rocket's local coordinate frame
    // Local axes rotated to world:
    // Local X axis (pitch):
    const lxX = 1 - 2 * (qy * qy + qz * qz);
    const lxY = 2 * (qx * qy + qw * qz);
    const lxZ = 2 * (qx * qz - qw * qy);

    // Local Y axis (yaw):
    const lyX = thrustUpX;
    const lyY = thrustUpY;
    const lyZ = thrustUpZ;

    // Local Z axis (roll):
    const lzX = 2 * (qx * qz + qw * qy);
    const lzY = 2 * (qy * qz - qw * qx);
    const lzZ = 1 - 2 * (qx * qx + qy * qy);

    const pitchTorqueMag = effectivePitch * this.config.maxRcsTorque;
    const rollTorqueMag = effectiveRoll * this.config.maxRcsTorque;
    const yawTorqueMag = effectiveYaw * (this.config.maxRcsTorque * 0.5);

    const torqueX = lxX * pitchTorqueMag + lyX * yawTorqueMag + lzX * rollTorqueMag;
    const torqueY = lxY * pitchTorqueMag + lyY * yawTorqueMag + lzY * rollTorqueMag;
    const torqueZ = lxZ * pitchTorqueMag + lyZ * yawTorqueMag + lzZ * rollTorqueMag;

    this.rocketBody.resetTorques(true);
    this.rocketBody.addTorque({ x: torqueX, y: torqueY, z: torqueZ }, true);

    // Step physics world (60Hz)
    this.world.step();

    // Check contacts and validation
    this.validateLandingState();

    return { observation: this.getObservation(), status: this.status };
  }

  private validateLandingState(): void {
    const pos = this.rocketBody.translation();
    const vel = this.rocketBody.linvel();
    const rot = this.rocketBody.rotation();

    // Calculate vertical alignment with world UP [0, 1, 0]
    // dot product with world up is the local Y axis in world coords:
    const qx = rot.x, qy = rot.y, qz = rot.z, qw = rot.w;
    const upDot = 1 - 2 * (qx * qx + qz * qz);
    const tiltAngleRad = Math.acos(Math.max(-1, Math.min(1, upDot)));
    const tiltAngleDeg = (tiltAngleRad * 180) / Math.PI;

    const horizSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    const vertSpeed = Math.abs(vel.y);
    const distToPad = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

    // Ground altitude of footpads: footpads are ~1.25m below center of mass
    const footpadAltitude = pos.y - 1.25;

    // Check contact with ground/pad
    let contactWithGroundOrPad = false;
    this.world.contactPairsWith(this.padCollider, (otherCollider: RAPIER.Collider) => {
      if (otherCollider.parent() === this.rocketBody) {
        contactWithGroundOrPad = true;
      }
    });
    if (!contactWithGroundOrPad) {
      this.world.contactPairsWith(this.groundCollider, (otherCollider: RAPIER.Collider) => {
        if (otherCollider.parent() === this.rocketBody) {
          contactWithGroundOrPad = true;
        }
      });
    }

    this.isContactingPad = contactWithGroundOrPad;

    // 1. Crash conditions
    // - Tilt exceeds 45 degrees
    // - Hard impact (vertical speed > 4.2 m/s or horizontal speed > 3.0 m/s while contacting)
    // - Ground penetration or out of bounds
    // - Falling outside pad radius by more than 14m
    if (tiltAngleDeg > 42.0) {
      this.status = 'CRASHED';
      return;
    }

    if (distToPad > 16.0 || pos.y > 35.0 || pos.y < -0.5) {
      this.status = 'CRASHED';
      return;
    }

    if (contactWithGroundOrPad) {
      // If contacting ground while moving too fast or outside the pad area
      if (vertSpeed > 3.8 || horizSpeed > 2.5 || tiltAngleDeg > 25.0) {
        this.status = 'CRASHED';
        return;
      }

      if (distToPad > 4.5) { // landed in dirt outside landing platform
        this.status = 'CRASHED';
        return;
      }

      // Check for successful touchdown criteria:
      // - Near pad surface (footpad altitude close to 0)
      // - Upright: tilt < 12 degrees
      // - Soft descent: vertical speed < 1.8 m/s
      // - Low lateral drift: horizontal speed < 1.0 m/s
      // - Inside pad target: distToPad < 3.8m
      const isSoftTouchdown = (
        tiltAngleDeg < 14.0 &&
        vertSpeed < 2.0 &&
        horizSpeed < 1.2 &&
        distToPad < 4.0
      );

      if (isSoftTouchdown) {
        this.settledFrames++;
        if (this.settledFrames >= 25) { // ~0.4 sec of stable contact
          this.status = 'LANDED';
          return;
        } else {
          this.status = 'TOUCHDOWN';
        }
      } else {
        // Unstable bouncing or drifting
        this.settledFrames = 0;
        this.status = 'AIRBORNE';
      }
    } else {
      this.settledFrames = 0;
      this.status = 'AIRBORNE';
    }

    // Timeout condition
    if (this.stepCount >= this.config.maxStepsPerEpisode) {
      this.status = 'TIMEOUT';
    }
  }

  public getObservation(): ObservationVector {
    const pos = this.rocketBody.translation();
    const vel = this.rocketBody.linvel();
    const rot = this.rocketBody.rotation();
    const angVel = this.rocketBody.angvel();

    // Convert quaternion to Euler angles (pitch, yaw, roll)
    const qx = rot.x, qy = rot.y, qz = rot.z, qw = rot.w;

    // Pitch: rotation around X
    const sinP = 2 * (qw * qx - qy * qz);
    const cosP = 1 - 2 * (qx * qx + qz * qz);
    const pitch = Math.atan2(sinP, cosP);

    // Roll: rotation around Z
    const sinR = 2 * (qw * qz - qx * qy);
    const cosR = 1 - 2 * (qy * qy + qz * qz);
    const roll = Math.atan2(sinR, cosR);

    const distToPad = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

    return {
      relX: pos.x / 10.0,
      relY: (pos.y - 1.25) / 15.0, // target altitude at pad is y ~ 1.25
      relZ: pos.z / 10.0,
      vx: vel.x / 10.0,
      vy: vel.y / 10.0,
      vz: vel.z / 10.0,
      sinPitch: Math.sin(pitch),
      cosPitch: Math.cos(pitch),
      sinRoll: Math.sin(roll),
      cosRoll: Math.cos(roll),
      angVelX: angVel.x / 5.0,
      angVelY: angVel.y / 5.0,
      angVelZ: angVel.z / 5.0,
      contactState: this.isContactingPad ? 1.0 : 0.0,
      distanceToPad: distToPad / 10.0,
    };
  }

  public getTelemetry(): TelemetryData {
    const pos = this.rocketBody.translation();
    const vel = this.rocketBody.linvel();
    const rot = this.rocketBody.rotation();
    const angVel = this.rocketBody.angvel();

    const qx = rot.x, qy = rot.y, qz = rot.z, qw = rot.w;
    const upDot = 1 - 2 * (qx * qx + qz * qz);
    const tiltAngleDeg = (Math.acos(Math.max(-1, Math.min(1, upDot))) * 180) / Math.PI;

    // Euler conversion
    const sinP = 2 * (qw * qx - qy * qz);
    const cosP = 1 - 2 * (qx * qx + qz * qz);
    const pitchDeg = (Math.atan2(sinP, cosP) * 180) / Math.PI;

    const sinR = 2 * (qw * qz - qx * qy);
    const cosR = 1 - 2 * (qy * qy + qz * qz);
    const rollDeg = (Math.atan2(sinR, cosR) * 180) / Math.PI;

    const sinY = 2 * (qw * qy + qx * qz);
    const cosY = 1 - 2 * (qy * qy + qz * qz);
    const yawDeg = (Math.atan2(sinY, cosY) * 180) / Math.PI;

    const horizSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    const distToPad = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

    return {
      position: [pos.x, pos.y, pos.z],
      velocity: [vel.x, vel.y, vel.z],
      rotationEuler: [pitchDeg, yawDeg, rollDeg],
      angularVelocity: [angVel.x, angVel.y, angVel.z],
      altitude: Math.max(0, pos.y - 1.25),
      tiltAngleDeg,
      horizontalSpeed: horizSpeed,
      verticalSpeed: vel.y,
      throttle: this.currentAction.mainThruster,
      rcsPitch: this.currentAction.pitchTorque,
      rcsRoll: this.currentAction.rollTorque,
      rcsYaw: this.currentAction.yawTorque,
      fuelRemaining: this.fuelRemaining,
      landingStatus: this.status,
      distanceToPadCenter: distToPad,
      settledFrames: this.settledFrames,
      currentStep: this.stepCount,
    };
  }

  public destroy(): void {
    if (this.world) {
      this.world.free();
    }
  }
}
