import * as THREE from 'three';
import { soundManager } from '../audio/soundEffects';

export interface VehiclePhysicsConfig {
  // Vehicle specs
  mass: number;
  enginePower: number;
  maxSpeedKmh: number;
  brakeForce: number;
  steerSpeed: number;
  maxSteerAngle: number;

  // Airtime Physics & Angular Momentum settings
  pitchTorque: number;
  rollTorque: number;
  yawTorque: number;
  angularDamping: number;
  airBrakePower: number;
  autoLevelAssist: boolean;
  autoLevelStrength: number;

  // Principle moments of inertia (kg*m^2)
  inertiaPitch: number;
  inertiaYaw: number;
  inertiaRoll: number;

  enableGyroscopicPrecession: boolean;

  // Suspension & Big Wheels
  wheelRadius: number;
  suspensionRestLength: number;
  suspensionStiffness: number;
  suspensionDamping: number;
  bounciness: number; // Restitution on hard ground impacts
  rampPopBoost: number;
}

export const DEFAULT_CONFIG: VehiclePhysicsConfig = {
  mass: 1250,
  enginePower: 48,
  maxSpeedKmh: 180,
  brakeForce: 60,
  steerSpeed: 4.2,
  maxSteerAngle: 0.62,

  // High authority mid-air flipping torques
  pitchTorque: 16000,
  rollTorque: 14000,
  yawTorque: 13000,
  angularDamping: 0.65,
  airBrakePower: 7.5,
  autoLevelAssist: false,
  autoLevelStrength: 4.0,

  inertiaPitch: 1050,
  inertiaYaw: 1250,
  inertiaRoll: 550,

  enableGyroscopicPrecession: true,

  // Big Stunt Wheels & Bouncy Suspension
  wheelRadius: 0.62,
  suspensionRestLength: 0.75,
  suspensionStiffness: 55,
  suspensionDamping: 5.5,
  bounciness: 0.48, // Generous bounce on rough landings
  rampPopBoost: 6.5,
};

export interface VehicleInput {
  throttle: number;
  steer: number;
  handbrake: boolean;
  nitro: boolean;
  airPitch: number;
  airRoll: number;
  airYaw: number;
  airBrake: boolean;
  autoLevel: boolean;
}

export interface LandingResult {
  grade: 'perfect' | 'great' | 'rough' | 'tumble' | 'crash' | 'recovery';
  alignmentAngleDeg: number;
  scoreMultiplier: number;
  bonusPoints: number;
  message: string;
  speedBoostKmh: number;
}

export type HeightProvider = (
  x: number,
  z: number
) => { height: number; normal: THREE.Vector3; surfaceType: 'tarmac' | 'ramp' | 'grass' | 'dirt' | 'landing_zone' };

export class VehiclePhysics {
  // 6-DOF Rigid Body State
  public position: THREE.Vector3 = new THREE.Vector3(0, 1.1, -90);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public quaternion: THREE.Quaternion = new THREE.Quaternion();
  public angularVelocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Big Wheels Stunt Geometry (wide stance, high clearance)
  public readonly wheelMounts = [
    new THREE.Vector3(-1.25, -0.1, 1.45),  // Front Left
    new THREE.Vector3(1.25, -0.1, 1.45),   // Front Right
    new THREE.Vector3(-1.25, -0.1, -1.35), // Rear Left
    new THREE.Vector3(1.25, -0.1, -1.35),  // Rear Right
  ];

  // 4 Roll Cage Roof Contact Points for Tumbling & Bouncing
  public readonly roofContacts = [
    new THREE.Vector3(-0.7, 1.15, 0.6),
    new THREE.Vector3(0.7, 1.15, 0.6),
    new THREE.Vector3(-0.7, 1.15, -1.1),
    new THREE.Vector3(0.7, 1.15, -1.1),
  ];

  public wheelPositions: THREE.Vector3[] = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ];
  public wheelContacts: boolean[] = [false, false, false, false];
  public wheelRotations: number[] = [0, 0, 0, 0];
  public steerAngle: number = 0;

  // Airborne & Tumbling State
  public isAirborne: boolean = false;
  public airborneTimer: number = 0;
  public isTumbling: boolean = false;
  public tumbleTimer: number = 0;
  public settleTimer: number = 0; // Tracks stationary duration before confirming crash

  public takeOffPosition: THREE.Vector3 = new THREE.Vector3();
  public takeOffVelocity: THREE.Vector3 = new THREE.Vector3();
  public apexAltitude: number = 0;
  public accumulatedPitch: number = 0;
  public accumulatedRoll: number = 0;
  public accumulatedYaw: number = 0;

  // Nitro state
  public nitroFuel: number = 100;
  public isNitroActive: boolean = false;

  // Confirmed Settled Crash state
  public isCrashed: boolean = false;
  public crashTimer: number = 0;

  public config: VehiclePhysicsConfig = { ...DEFAULT_CONFIG };

  // Math helpers
  private _localForward = new THREE.Vector3(0, 0, 1);
  private _localUp = new THREE.Vector3(0, 1, 0);
  private _localRight = new THREE.Vector3(1, 0, 0);
  private _worldForward = new THREE.Vector3();
  private _worldUp = new THREE.Vector3();
  private _worldRight = new THREE.Vector3();
  private _deltaQuat = new THREE.Quaternion();
  private _rotAxis = new THREE.Vector3();
  private _gravity = new THREE.Vector3(0, -21.5, 0);

  public groundProvider: HeightProvider | null = null;

  // Event callbacks
  public onTakeOff?: (takeOffSpeedKmh: number, height: number) => void;
  public onLand?: (result: LandingResult) => void;
  public onCrash?: () => void;
  public onRecovery?: () => void;

  constructor(groundProvider?: HeightProvider) {
    if (groundProvider) {
      this.groundProvider = groundProvider;
    }
    this.reset(0, 1.1, -90, 0);
  }

  public reset(x = 0, y = 1.1, z = -90, rotY = 0) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.quaternion.setFromAxisAngle(this._localUp, rotY);
    this.steerAngle = 0;
    this.isAirborne = false;
    this.airborneTimer = 0;
    this.isTumbling = false;
    this.tumbleTimer = 0;
    this.settleTimer = 0;
    this.accumulatedPitch = 0;
    this.accumulatedRoll = 0;
    this.accumulatedYaw = 0;
    this.apexAltitude = y;
    this.isCrashed = false;
    this.crashTimer = 0;
    this.nitroFuel = 100;
  }

  public getSpeedKmh(): number {
    return this.velocity.length() * 3.6;
  }

  public getForwardSpeedKmh(): number {
    this._worldForward.copy(this._localForward).applyQuaternion(this.quaternion);
    return this.velocity.dot(this._worldForward) * 3.6;
  }

  public getWorldDirections() {
    this._worldForward.copy(this._localForward).applyQuaternion(this.quaternion);
    this._worldUp.copy(this._localUp).applyQuaternion(this.quaternion);
    this._worldRight.copy(this._localRight).applyQuaternion(this.quaternion);
    return {
      forward: this._worldForward,
      up: this._worldUp,
      right: this._worldRight,
    };
  }

  /**
   * Main Physics Step
   */
  public update(dt: number, input: VehicleInput) {
    const stepDt = Math.min(dt, 0.04);

    // If already confirmed crashed and stationary, wait for reset
    if (this.isCrashed) {
      this.crashTimer += stepDt;
      this.velocity.multiplyScalar(Math.pow(0.85, stepDt * 60));
      this.angularVelocity.multiplyScalar(Math.pow(0.85, stepDt * 60));
      return;
    }

    // Nitro recharge / deplete
    if (input.nitro && this.nitroFuel > 0) {
      this.isNitroActive = true;
      this.nitroFuel = Math.max(0, this.nitroFuel - stepDt * 22);
      soundManager.playNitro();
    } else {
      this.isNitroActive = false;
      this.nitroFuel = Math.min(100, this.nitroFuel + stepDt * 8);
    }

    // Check contacts on 4 Big Wheels & Roll Cage Roof
    const groundInfo = this.checkMultiPointGroundContact();
    const wheelsOnGround = this.wheelContacts.filter(Boolean).length;
    const wasAirborne = this.isAirborne;

    // Handle Airborne -> Ground transition
    if (wheelsOnGround >= 2 || groundInfo.roofContactsCount > 0) {
      if (wasAirborne) {
        this.handleTouchdown(groundInfo.avgNormal, groundInfo.roofContactsCount > 0);
      }

      if (this.isTumbling) {
        this.updateTumblingPhysics(stepDt, input, groundInfo);
      } else {
        this.updateGroundPhysics(stepDt, input, groundInfo);
      }
    } else {
      // Vehicle is airborne
      if (!wasAirborne) {
        this.handleTakeOff();
      }
      this.updateAirPhysics(stepDt, input, groundInfo);
    }

    // Integrate linear position
    this.position.addScaledVector(this.velocity, stepDt);

    // Update wheel spinning
    const forwardSpeed = this.getForwardSpeedKmh() / 3.6;
    for (let i = 0; i < 4; i++) {
      this.wheelRotations[i] += (forwardSpeed / this.config.wheelRadius) * stepDt;
    }

    // Audio update
    soundManager.updateEngine(
      this.getSpeedKmh(),
      Math.abs(input.throttle),
      this.isAirborne,
      this.angularVelocity.length()
    );
  }

  /**
   * Multi-point Ground Contact: 4 Big Wheels + 4 Roll Cage Points
   */
  private checkMultiPointGroundContact() {
    let avgHeight = 0;
    const avgNormal = new THREE.Vector3(0, 1, 0);
    let wheelContactCount = 0;
    let roofContactsCount = 0;
    let surface: 'tarmac' | 'ramp' | 'grass' | 'dirt' | 'landing_zone' = 'tarmac';

    const { forward, up, right } = this.getWorldDirections();

    // 1. Check 4 Big Stunt Wheels
    for (let i = 0; i < 4; i++) {
      const mount = this.wheelMounts[i];
      const mountWorld = this.position
        .clone()
        .addScaledVector(right, mount.x)
        .addScaledVector(up, mount.y)
        .addScaledVector(forward, mount.z);

      if (this.groundProvider) {
        const sample = this.groundProvider(mountWorld.x, mountWorld.z);
        const groundY = sample.height;
        surface = sample.surfaceType;

        const dist = mountWorld.y - groundY;
        // Big wheel contact zone: suspension + wheel radius
        if (dist <= this.config.suspensionRestLength + this.config.wheelRadius && dist >= -1.8) {
          this.wheelContacts[i] = true;
          wheelContactCount++;
          avgHeight += groundY;
          avgNormal.add(sample.normal);
          this.wheelPositions[i].set(
            mountWorld.x,
            Math.max(groundY + this.config.wheelRadius, mountWorld.y - this.config.suspensionRestLength * 0.4),
            mountWorld.z
          );
        } else {
          this.wheelContacts[i] = false;
          this.wheelPositions[i]
            .copy(mountWorld)
            .addScaledVector(up, -this.config.suspensionRestLength * 0.5);
        }
      } else {
        if (mountWorld.y <= 0.8) {
          this.wheelContacts[i] = true;
          wheelContactCount++;
          avgNormal.add(new THREE.Vector3(0, 1, 0));
        } else {
          this.wheelContacts[i] = false;
        }
      }
    }

    // 2. Check 4 Roll Cage Roof points
    for (let i = 0; i < 4; i++) {
      const roof = this.roofContacts[i];
      const roofWorld = this.position
        .clone()
        .addScaledVector(right, roof.x)
        .addScaledVector(up, roof.y)
        .addScaledVector(forward, roof.z);

      if (this.groundProvider) {
        const sample = this.groundProvider(roofWorld.x, roofWorld.z);
        if (roofWorld.y <= sample.height + 0.35) {
          roofContactsCount++;
        }
      }
    }

    if (wheelContactCount > 0) {
      avgHeight /= wheelContactCount;
      avgNormal.normalize();
    }

    return {
      contactCount: wheelContactCount,
      wheelContactCount,
      avgHeight,
      avgNormal,
      roofContactsCount,
      surface,
    };
  }

  private handleTakeOff() {
    this.isAirborne = true;
    this.airborneTimer = 0;
    this.isTumbling = false;
    this.settleTimer = 0;
    this.takeOffPosition.copy(this.position);
    this.takeOffVelocity.copy(this.velocity);
    this.apexAltitude = this.position.y;
    this.accumulatedPitch = 0;
    this.accumulatedRoll = 0;
    this.accumulatedYaw = 0;

    // Launch pop boost
    this.velocity.y += this.config.rampPopBoost;
    soundManager.playRampPop();

    if (this.onTakeOff) {
      this.onTakeOff(this.getSpeedKmh(), this.position.y);
    }
  }

  /**
   * Touchdown & Landing Evaluation with Bouncy Tolerance
   */
  private handleTouchdown(groundNormal: THREE.Vector3, hitOnRoof: boolean) {
    if (this.airborneTimer < 0.32) {
      this.isAirborne = false;
      return;
    }

    this.isAirborne = false;
    const { up, forward } = this.getWorldDirections();

    const dotUp = THREE.MathUtils.clamp(up.dot(groundNormal), -1, 1);
    const alignmentAngleRad = Math.acos(dotUp);
    const alignmentAngleDeg = THREE.MathUtils.radToDeg(alignmentAngleRad);

    const horizontalVel = this.velocity.clone();
    horizontalVel.y = 0;
    let forwardDot = 1;
    if (horizontalVel.length() > 1.0) {
      const horizForward = forward.clone();
      horizForward.y = 0;
      horizForward.normalize();
      forwardDot = THREE.MathUtils.clamp(horizontalVel.normalize().dot(horizForward), -1, 1);
    }

    let grade: 'perfect' | 'great' | 'rough' | 'tumble' | 'crash' = 'rough';
    let multiplier = 1.0;
    let bonusPoints = 300;
    let message = 'ROUGH LANDING';
    let speedBoostKmh = 0;

    // If landed upside-down or at extreme angle (> 55 degrees) or roof hit ground:
    // DO NOT CRASH INSTANTLY! Enter TUMBLING / BOUNCING state!
    if (hitOnRoof || dotUp < 0.35 || alignmentAngleDeg > 55) {
      this.isTumbling = true;
      this.tumbleTimer = 0;
      this.settleTimer = 0;

      // Realistic bouncy restitution impulse
      this.velocity.y = Math.abs(this.velocity.y) * this.config.bounciness + 2.0;
      // Tumbling angular impulse
      this.angularVelocity.x += (Math.random() - 0.5) * 5;
      this.angularVelocity.z += (Math.random() - 0.5) * 6;

      soundManager.playLanding('rough');

      if (this.onLand) {
        this.onLand({
          grade: 'tumble',
          alignmentAngleDeg,
          scoreMultiplier: 1.0,
          bonusPoints: 0,
          message: 'BOUNCING & TUMBLING! RECOVER!',
          speedBoostKmh: 0,
        });
      }
      return;
    }

    // Clean or great landings on big tires:
    if (alignmentAngleDeg <= 16 && forwardDot > 0.8) {
      grade = 'perfect';
      multiplier = 4.0;
      bonusPoints = 2500;
      message = 'PERFECT LANDING!';
      speedBoostKmh = 35;
      this.velocity.addScaledVector(forward, 9.5);
      soundManager.playLanding('perfect');
    } else if (alignmentAngleDeg <= 32 && forwardDot > 0.5) {
      grade = 'great';
      multiplier = 2.0;
      bonusPoints = 1200;
      message = 'GREAT LANDING';
      speedBoostKmh = 18;
      this.velocity.addScaledVector(forward, 5.0);
      soundManager.playLanding('great');
    } else {
      grade = 'rough';
      multiplier = 1.0;
      bonusPoints = 500;
      message = 'BOUNCY LANDING';
      speedBoostKmh = 0;
      // Big wheels bounce smoothly
      this.velocity.y = Math.abs(this.velocity.y) * 0.3;
      soundManager.playLanding('rough');
    }

    this.angularVelocity.multiplyScalar(0.2);

    if (this.onLand) {
      this.onLand({
        grade,
        alignmentAngleDeg,
        scoreMultiplier: multiplier,
        bonusPoints,
        message,
        speedBoostKmh,
      });
    }
  }

  /**
   * Mid-Air Physics: Physics-based Torque, Angular Momentum & Euler Integration
   */
  private updateAirPhysics(
    dt: number,
    input: VehicleInput,
    groundInfo: { avgNormal: THREE.Vector3 }
  ) {
    this.airborneTimer += dt;
    if (this.position.y > this.apexAltitude) {
      this.apexAltitude = this.position.y;
    }

    this.velocity.addScaledVector(this._gravity, dt);

    if (this.isNitroActive) {
      const { forward, up } = this.getWorldDirections();
      this.velocity.addScaledVector(forward, 28 * dt);
      this.velocity.addScaledVector(up, 9 * dt);
    }

    this.velocity.x *= Math.pow(0.994, dt * 60);
    this.velocity.z *= Math.pow(0.994, dt * 60);

    // Active Torques:
    // W/Up = Pitch Down (+X), S/Down = Pitch Up (-X)
    let appliedTorqueX = input.airPitch * this.config.pitchTorque;
    let appliedTorqueY = input.airYaw * this.config.yawTorque;
    let appliedTorqueZ = input.airRoll * this.config.rollTorque;

    // Air Brake / Stabilizer
    if (input.airBrake || input.handbrake) {
      const brakeCoeff = this.config.airBrakePower * 14;
      appliedTorqueX -= this.angularVelocity.x * this.config.inertiaPitch * brakeCoeff;
      appliedTorqueY -= this.angularVelocity.y * this.config.inertiaYaw * brakeCoeff;
      appliedTorqueZ -= this.angularVelocity.z * this.config.inertiaRoll * brakeCoeff;
    }

    // Auto Level Assist (if toggled)
    if (this.config.autoLevelAssist || input.autoLevel) {
      const { up, forward, right } = this.getWorldDirections();
      const targetNormal = groundInfo.avgNormal.y > 0.5 ? groundInfo.avgNormal : this._localUp;
      const alignAxis = up.clone().cross(targetNormal);
      const strength = this.config.autoLevelStrength * 1800;
      appliedTorqueX += alignAxis.dot(right) * strength;
      appliedTorqueZ += alignAxis.dot(forward) * strength;
    }

    // Aerodynamic rotational damping
    const dampFactor = this.config.angularDamping;
    appliedTorqueX -= this.angularVelocity.x * this.config.inertiaPitch * dampFactor;
    appliedTorqueY -= this.angularVelocity.y * this.config.inertiaYaw * dampFactor;
    appliedTorqueZ -= this.angularVelocity.z * this.config.inertiaRoll * dampFactor;

    // Euler Equations with Gyroscopic cross-coupling
    const Ix = this.config.inertiaPitch;
    const Iy = this.config.inertiaYaw;
    const Iz = this.config.inertiaRoll;

    const wx = this.angularVelocity.x;
    const wy = this.angularVelocity.y;
    const wz = this.angularVelocity.z;

    let gyroX = 0;
    let gyroY = 0;
    let gyroZ = 0;
    if (this.config.enableGyroscopicPrecession) {
      gyroX = (Iy - Iz) * wy * wz;
      gyroY = (Iz - Ix) * wz * wx;
      gyroZ = (Ix - Iy) * wx * wy;
    }

    this.angularVelocity.x += ((appliedTorqueX + gyroX) / Ix) * dt;
    this.angularVelocity.y += ((appliedTorqueY + gyroY) / Iy) * dt;
    this.angularVelocity.z += ((appliedTorqueZ + gyroZ) / Iz) * dt;
    this.angularVelocity.clampLength(0, 18);

    // Quaternion rotation
    const rotSpeed = this.angularVelocity.length();
    if (rotSpeed > 0.0001) {
      this._rotAxis.copy(this.angularVelocity).normalize();
      const halfAngle = (rotSpeed * dt) * 0.5;
      const sinHalf = Math.sin(halfAngle);
      this._deltaQuat.set(
        this._rotAxis.x * sinHalf,
        this._rotAxis.y * sinHalf,
        this._rotAxis.z * sinHalf,
        Math.cos(halfAngle)
      );
      this.quaternion.multiply(this._deltaQuat);
      this.quaternion.normalize();
    }

    // Accumulate trick angles
    this.accumulatedPitch += (this.angularVelocity.x * dt * 180) / Math.PI;
    this.accumulatedYaw += (this.angularVelocity.y * dt * 180) / Math.PI;
    this.accumulatedRoll += (this.angularVelocity.z * dt * 180) / Math.PI;

    // Safety ground floor
    if (this.groundProvider) {
      const g = this.groundProvider(this.position.x, this.position.z);
      if (this.position.y < g.height + 0.5) {
        this.position.y = g.height + 0.5;
        this.handleTouchdown(g.normal, false);
      }
    }
  }

  /**
   * Tumbling & Bouncing Physics with Settling Evaluation
   * Allows the car to bounce, flip, and roll across the ground, and only crash when settled!
   */
  private updateTumblingPhysics(
    dt: number,
    input: VehicleInput,
    groundInfo: { wheelContactCount: number; roofContactsCount: number; avgHeight: number; avgNormal: THREE.Vector3 }
  ) {
    this.tumbleTimer += dt;
    const { up, forward, right } = this.getWorldDirections();

    // Gravity & friction
    this.velocity.addScaledVector(this._gravity, dt);
    this.velocity.multiplyScalar(Math.pow(0.96, dt * 60));
    this.angularVelocity.multiplyScalar(Math.pow(0.95, dt * 60));

    // Player can still use controls to help right the vehicle!
    if (input.throttle !== 0) {
      this.velocity.addScaledVector(forward, input.throttle * 20 * dt);
    }
    if (input.airRoll !== 0) {
      this.angularVelocity.z += input.airRoll * 12 * dt;
    }
    if (input.airPitch !== 0) {
      this.angularVelocity.x += input.airPitch * 12 * dt;
    }

    // Integrate tumbling rotation
    const rotSpeed = this.angularVelocity.length();
    if (rotSpeed > 0.001) {
      this._rotAxis.copy(this.angularVelocity).normalize();
      this._deltaQuat.setFromAxisAngle(this._rotAxis, rotSpeed * dt);
      this.quaternion.multiply(this._deltaQuat);
      this.quaternion.normalize();
    }

    // Ground collision response
    if (this.groundProvider) {
      const g = this.groundProvider(this.position.x, this.position.z);
      const groundY = g.height;

      // Contact with wheels or roof
      if (this.position.y < groundY + 1.1) {
        this.position.y = groundY + 1.1;

        // Bounce off ground
        if (this.velocity.y < -1.0) {
          this.velocity.y = -this.velocity.y * this.config.bounciness;
          soundManager.playLanding('rough');
        }

        // Rolling torque along ground friction
        this.angularVelocity.x += (this.velocity.z / 3.0) * dt * 5;
        this.angularVelocity.z -= (this.velocity.x / 3.0) * dt * 5;
      }
    }

    // CHECK ORIENTATION & SETTLING:
    const dotUp = up.dot(groundInfo.avgNormal.y > 0.5 ? groundInfo.avgNormal : this._localUp);
    const speed = this.velocity.length();
    const angSpeed = this.angularVelocity.length();

    // If car landed back on its wheels (dotUp > 0.75 and wheels on ground):
    if (dotUp > 0.72 && groundInfo.wheelContactCount >= 2) {
      this.isTumbling = false;
      this.settleTimer = 0;
      soundManager.playLanding('great');
      if (this.onRecovery) {
        this.onRecovery();
      }
      return;
    }

    // If vehicle has virtually stopped moving (stationary):
    if (speed < 1.8 && angSpeed < 0.6) {
      this.settleTimer += dt;
      // ONLY trigger crash when settled at rest for > 0.9s and upside down or stuck on side
      if (this.settleTimer >= 0.9 && dotUp < 0.35) {
        this.triggerCrash();
      }
    } else {
      this.settleTimer = 0;
    }
  }

  /**
   * Normal Ground Physics: Acceleration, Steering, Big Wheel Suspension
   */
  private updateGroundPhysics(
    dt: number,
    input: VehicleInput,
    groundInfo: { contactCount: number; avgNormal: THREE.Vector3; avgHeight: number; surface: string }
  ) {
    const { forward, right } = this.getWorldDirections();

    // 1. Steering
    const targetSteer = -input.steer * this.config.maxSteerAngle;
    this.steerAngle = THREE.MathUtils.damp(this.steerAngle, targetSteer, this.config.steerSpeed, dt);

    // 2. Throttle & Acceleration
    let engineAccel = input.throttle * this.config.enginePower;
    if (this.isNitroActive) {
      engineAccel += 40;
    }

    const currentSpeed = this.getSpeedKmh();
    if (currentSpeed > this.config.maxSpeedKmh && engineAccel > 0) {
      engineAccel = 0;
    }

    this.velocity.addScaledVector(forward, engineAccel * dt);

    // 3. Friction & Braking
    if (input.throttle === 0 && !input.handbrake) {
      this.velocity.multiplyScalar(Math.pow(0.98, dt * 60));
    }

    if (input.handbrake) {
      this.velocity.multiplyScalar(Math.pow(0.92, dt * 60));
    } else if (
      (input.throttle < 0 && this.getForwardSpeedKmh() > 5) ||
      (input.throttle > 0 && this.getForwardSpeedKmh() < -5)
    ) {
      this.velocity.multiplyScalar(Math.pow(0.85, dt * 60));
    }

    // 4. Lateral grip
    const lateralSpeed = this.velocity.dot(right);
    const gripFactor = input.handbrake ? 0.85 : 0.08;
    this.velocity.addScaledVector(right, -lateralSpeed * (1 - gripFactor));

    // 5. Yaw rotation from steering
    const turnRate = (this.getForwardSpeedKmh() / 14) * Math.sin(this.steerAngle) * (input.handbrake ? 1.8 : 1.0);
    this.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(this._localUp, turnRate * dt));

    // 6. Terrain normal slope alignment
    if (groundInfo.contactCount > 0) {
      const currentUp = this._localUp.clone().applyQuaternion(this.quaternion);
      const alignQuat = new THREE.Quaternion().setFromUnitVectors(currentUp, groundInfo.avgNormal);
      this.quaternion.slerp(alignQuat.multiply(this.quaternion), dt * 15);
      this.quaternion.normalize();

      const targetY = groundInfo.avgHeight + this.config.wheelRadius + 0.45;
      this.position.y = THREE.MathUtils.damp(this.position.y, targetY, 25, dt);
      this.velocity.y = (targetY - this.position.y) * 3;
    }

    this.angularVelocity.set(0, 0, 0);
  }

  public triggerCrash() {
    this.isCrashed = true;
    this.crashTimer = 0;
    this.isTumbling = false;
    soundManager.playLanding('crash');
    if (this.onCrash) {
      this.onCrash();
    }
  }

  public recoverFromCrash() {
    this.isCrashed = false;
    this.isTumbling = false;
    this.crashTimer = 0;
    this.settleTimer = 0;
    this.angularVelocity.set(0, 0, 0);

    const currentEuler = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ');
    this.quaternion.setFromAxisAngle(this._localUp, currentEuler.y);
    this.position.y += 2.0;
    this.velocity.set(0, 0, 0);
  }
}
