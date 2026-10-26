import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import confetti from 'canvas-confetti';

import {
  VehiclePhysics,
  VehiclePhysicsConfig,
  DEFAULT_CONFIG,
  VehicleInput,
  LandingResult,
} from './physics/airtimePhysics';
import { StuntDetector, StuntState } from './game/stuntDetector';
import { StuntPark } from './world/stuntPark';
import { VehicleVisualModel, COLOR_PRESETS } from './vehicle/vehicleModel';
import { ParticleSystem } from './effects/particleSystem';
import { soundManager } from './audio/soundEffects';
import { ControlDock } from './ui/ControlDock';
import { GameHUD } from './ui/GameHUD';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  // Core Engine References (kept in ref to prevent re-renders in render loop)
  const physicsRef = useRef<VehiclePhysics | null>(null);
  const stuntDetectorRef = useRef<StuntDetector>(new StuntDetector());
  const stuntParkRef = useRef<StuntPark | null>(null);
  const vehicleModelRef = useRef<VehicleVisualModel | null>(null);
  const particlesRef = useRef<ParticleSystem | null>(null);

  // Settings & Configuration state
  const [physicsConfig, setPhysicsConfig] = useState<VehiclePhysicsConfig>({ ...DEFAULT_CONFIG });
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [timeScale, setTimeScale] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [airRollMode, setAirRollMode] = useState<'keys_qe' | 'keys_ad'>('keys_qe');
  const [cameraMode, setCameraMode] = useState<'chase' | 'orbit' | 'hood' | 'cinematic'>('chase');

  // Live HUD telemetry state (throttled updates to React state)
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [nitroFuel, setNitroFuel] = useState<number>(100);
  const [isAirborne, setIsAirborne] = useState<boolean>(false);
  const [isCrashed, setIsCrashed] = useState<boolean>(false);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [stuntState, setStuntState] = useState<StuntState>({
    currentTricks: [],
    rawScore: 0,
    comboMultiplier: 1.0,
    airtimeSeconds: 0,
    apexHeightMeters: 0,
    totalPendingScore: 0,
    lastCompletedTrick: null,
    lastTrickTime: 0,
  });
  const [landingResult, setLandingResult] = useState<LandingResult | null>(null);
  const [attitude, setAttitude] = useState<{ pitchDeg: number; rollDeg: number }>({ pitchDeg: 0, rollDeg: 0 });
  const [telemetry, setTelemetry] = useState({
    wx: 0,
    wy: 0,
    wz: 0,
    pitchDeg: 0,
    rollDeg: 0,
    yawDeg: 0,
    angularMomentum: 0,
  });

  // Active keyboard state
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const virtualInputs = useRef<{ [key: string]: boolean }>({});
  const [activeKeysState, setActiveKeysState] = useState<{ [key: string]: boolean }>({});

  // Sync physics config changes
  useEffect(() => {
    if (physicsRef.current) {
      physicsRef.current.config = { ...physicsConfig };
    }
  }, [physicsConfig]);

  // Sync color changes
  useEffect(() => {
    if (vehicleModelRef.current) {
      vehicleModelRef.current.setColors(COLOR_PRESETS[selectedColorIndex].colors);
    }
  }, [selectedColorIndex]);

  // Handle Mute toggle
  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
  }, [isMuted]);

  // Respawn vehicle
  const handleResetVehicle = useCallback(() => {
    if (physicsRef.current) {
      physicsRef.current.reset(0, 0.7, -90, 0);
      stuntDetectorRef.current.resetAirborneStunts();
      setIsCrashed(false);
      setLandingResult(null);
    }
  }, []);

  // Instant Launch onto Mega Ramp
  const handleLaunchJump = useCallback(() => {
    if (physicsRef.current) {
      // Spawn at high speed leading onto the ramp
      physicsRef.current.reset(0, 1.0, -15, 0);
      physicsRef.current.velocity.set(0, 0, 48); // ~172 km/h
      physicsRef.current.nitroFuel = 100;
      stuntDetectorRef.current.resetAirborneStunts();
      setIsCrashed(false);
      setLandingResult(null);
    }
  }, []);

  // Virtual inputs handler for mobile / on-screen buttons
  const handleVirtualInput = useCallback((inputKey: string, active: boolean) => {
    virtualInputs.current[inputKey] = active;
    setActiveKeysState((prev) => (active ? { ...prev, [inputKey]: true } : { ...prev, [inputKey]: false }));
    soundManager.userGesture();
  }, []);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL per directives
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Scene & Studio Lighting
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    scene.fog = new THREE.FogExp2(0x090d16, 0.0035);

    // Studio Environment Map via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3-Point Lighting Rig
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    sunLight.position.set(60, 100, 40);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 300;
    sunLight.shadow.camera.left = -120;
    sunLight.shadow.camera.right = 120;
    sunLight.shadow.camera.top = 120;
    sunLight.shadow.camera.bottom = -120;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const fillLight = new THREE.DirectionalLight(0x818cf8, 0.6);
    fillLight.position.set(-60, 40, -40);
    scene.add(fillLight);

    // 3. World, Stunt Park & Ramps
    const stuntPark = new StuntPark();
    scene.add(stuntPark.scene);
    stuntParkRef.current = stuntPark;

    // 4. Vehicle Visual Model
    const vehicleVisual = new VehicleVisualModel(selectedColorIndex);
    scene.add(vehicleVisual.group);
    vehicleModelRef.current = vehicleVisual;

    // 5. Particle System
    const particleSys = new ParticleSystem();
    scene.add(particleSys.group);
    particlesRef.current = particleSys;

    // 6. Physics Instance
    const physics = new VehiclePhysics((x, z) => stuntPark.getTerrainHeight(x, z));
    physics.config = { ...physicsConfig };
    physicsRef.current = physics;

    // 7. Stunt Detector & High Score setup
    const stuntDetector = stuntDetectorRef.current;
    setHighScore(stuntDetector.highScore);

    // Physics Event Callbacks
    physics.onTakeOff = () => {
      stuntDetector.resetAirborneStunts();
      setLandingResult(null);
    };

    physics.onLand = (result) => {
      // Finalize stunts in detector
      stuntDetector.finalizeLanding(
        result.scoreMultiplier,
        result.bonusPoints,
        result.grade
      );

      setLandingResult(result);
      setTotalScore(stuntDetector.totalScore);
      setHighScore(stuntDetector.highScore);

      // Trigger Confetti & Particles on Perfect Landing!
      if (result.grade === 'perfect') {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.65 },
          colors: ['#06b6d4', '#38bdf8', '#f59e0b', '#10b981'],
        });
        particleSys.emitLandingShockwave(physics.position, true);
      } else if (result.grade === 'great' || result.grade === 'rough') {
        particleSys.emitLandingShockwave(physics.position, false);
      } else if (result.grade === 'tumble') {
        particleSys.emitSparks(physics.position, 30);
      }
    };

    physics.onRecovery = () => {
      stuntDetector.finalizeLanding(1.5, 1500, 'recovery');
      setLandingResult({
        grade: 'recovery',
        alignmentAngleDeg: 0,
        scoreMultiplier: 1.5,
        bonusPoints: 1500,
        message: 'EPIC RECOVERY STUNT!',
        speedBoostKmh: 20,
      });
      setTotalScore(stuntDetector.totalScore);
      setHighScore(stuntDetector.highScore);
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#f59e0b', '#10b981'],
      });
    };

    physics.onCrash = () => {
      setIsCrashed(true);
      particleSys.emitSparks(physics.position, 40);
    };

    stuntPark.onRingCollect = (points) => {
      stuntDetector.totalScore += points;
      setTotalScore(stuntDetector.totalScore);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#fbbf24', '#ffffff'],
      });
    };

    // 8. Camera Setup
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.2,
      1200
    );
    camera.position.set(0, 4.2, -100);

    // Camera follow state
    const currentCamPos = new THREE.Vector3(0, 4.2, -100);
    const currentCamTarget = new THREE.Vector3(0, 1.2, -90);
    const camHeading = new THREE.Vector3(0, 0, 1);

    // Keyboard Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      setActiveKeysState((prev) => ({ ...prev, [e.code]: true }));

      // Quick hotkeys
      if (e.code === 'KeyR') {
        handleResetVehicle();
      } else if (e.code === 'KeyC') {
        setCameraMode((prev) => {
          if (prev === 'chase') return 'cinematic';
          if (prev === 'cinematic') return 'hood';
          if (prev === 'hood') return 'orbit';
          return 'chase';
        });
      }
      soundManager.userGesture();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
      setActiveKeysState((prev) => {
        const next = { ...prev };
        delete next[e.code];
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // 9. Animation Loop
    let frameId = 0;
    let lastTime = performance.now();
    let hudUpdateCounter = 0;

    const tick = () => {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05) * timeScale;

      // Collect user input
      const kp = keysPressed.current;
      const vi = virtualInputs.current;

      const isThrottlingForward = kp['KeyW'] || kp['ArrowUp'] || vi['KeyW'];
      const isThrottlingReverse = kp['KeyS'] || kp['ArrowDown'] || vi['KeyS'];
      const isSteeringLeft = kp['KeyA'] || kp['ArrowLeft'] || vi['KeyA'];
      const isSteeringRight = kp['KeyD'] || kp['ArrowRight'] || vi['KeyD'];
      const isAirRollLeft = kp['KeyQ'] || vi['KeyQ'];
      const isAirRollRight = kp['KeyE'] || vi['KeyE'];
      const isHandbrake = kp['Space'] || vi['Space'];
      const isNitro = kp['ShiftLeft'] || kp['ShiftRight'] || vi['ShiftLeft'];

      // Resolve Vehicle Inputs
      const vehicleInput: VehicleInput = {
        throttle: isThrottlingForward ? 1 : isThrottlingReverse ? -1 : 0,
        steer: isSteeringLeft ? -1 : isSteeringRight ? 1 : 0,
        handbrake: Boolean(isHandbrake),
        nitro: Boolean(isNitro),

        // Air Controls: Pitch (W/S or Up/Down)
        // Air Controls: Pitch (W/S or Up/Down)
        // W / Up: Frontflip (Pitch Down: +1)
        // S / Down: Backflip (Pitch Up: -1)
        airPitch: isThrottlingForward ? 1 : isThrottlingReverse ? -1 : 0,

        // Air Controls: Roll (Q/E or A/D in arcade roll mode)
        airRoll: isAirRollLeft
          ? 1
          : isAirRollRight
          ? -1
          : airRollMode === 'keys_ad'
          ? isSteeringLeft
            ? 1
            : isSteeringRight
            ? -1
            : 0
          : 0,

        // Air Controls: Yaw Flatspin (A/D or Left/Right)
        airYaw: isSteeringLeft ? -1 : isSteeringRight ? 1 : 0,

        airBrake: Boolean(isHandbrake),
        autoLevel: Boolean(physics.config.autoLevelAssist),
      };

      // Step Physics Simulation
      physics.update(dt, vehicleInput);

      // Check Target Rings Collision
      stuntPark.checkRingCollisions(physics.position);
      stuntPark.updateAnimation(now * 0.001);

      // Nitro & Tire Particles
      if (physics.isNitroActive) {
        particleSys.emitNitroTrail(physics.position);
      }
      particleSys.update(dt);

      // Synchronize 3D Vehicle Visual Model
      vehicleVisual.update(
        physics.position,
        physics.quaternion,
        physics.steerAngle,
        physics.wheelRotations,
        physics.isNitroActive,
        physics.isAirborne
      );

      // Stunt Detector Updates
      if (physics.isAirborne) {
        const state = stuntDetector.evaluateAirborneTricks(
          physics.accumulatedPitch,
          physics.accumulatedRoll,
          physics.accumulatedYaw,
          physics.airborneTimer,
          physics.apexAltitude
        );
        setStuntState(state);
      }

      // Dynamic Camera Controller
      const { forward, up } = physics.getWorldDirections();
      const targetPos = physics.position;

      if (cameraMode === 'chase') {
        // High-speed chase cam locked to world horizontal horizon (zero flip/roll disorientation!)
        const camDistance = 9.0 + (physics.getSpeedKmh() / 180) * 2.5;
        const camHeight = 3.8 + (physics.isAirborne ? 1.0 : 0);

        // Compute stable horizontal heading vector (independent of vehicle pitch & roll)
        const horizVel = new THREE.Vector3(physics.velocity.x, 0, physics.velocity.z);
        const horizForward = new THREE.Vector3(forward.x, 0, forward.z);

        const targetHeading = new THREE.Vector3(0, 0, 1);
        if (physics.isAirborne) {
          // While airborne, lock camera strictly to flight trajectory direction
          if (horizVel.length() > 2.0) {
            targetHeading.copy(horizVel).normalize();
          } else if (horizForward.lengthSq() > 0.01) {
            targetHeading.copy(horizForward).normalize();
          }
        } else {
          // On ground, track vehicle forward heading
          if (horizForward.lengthSq() > 0.01) {
            targetHeading.copy(horizForward).normalize();
          }
        }

        // Smoothly interpolate horizontal camera heading
        camHeading.lerp(targetHeading, dt * (physics.isAirborne ? 3.5 : 7.0));
        if (camHeading.lengthSq() > 0.001) {
          camHeading.normalize();
        } else {
          camHeading.set(0, 0, 1);
        }

        // Place camera strictly behind horizontal heading, perfectly level with world horizon
        const desiredCamPos = targetPos
          .clone()
          .addScaledVector(camHeading, -camDistance)
          .add(new THREE.Vector3(0, camHeight, 0));

        currentCamPos.lerp(desiredCamPos, dt * (physics.isAirborne ? 6.0 : 8.5));
        currentCamTarget.lerp(targetPos.clone().add(new THREE.Vector3(0, 1.0, 0)), dt * 9.0);

        camera.position.copy(currentCamPos);
        camera.up.set(0, 1, 0); // Always lock world vertical up
        camera.lookAt(currentCamTarget);

        // Dynamic Speed FOV
        const targetFov = 60 + Math.min(physics.getSpeedKmh() / 15, 16);
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 4, dt);
        camera.updateProjectionMatrix();
      } else if (cameraMode === 'hood') {
        // Hood / Bumper perspective
        const hoodOffset = targetPos.clone().addScaledVector(forward, 1.6).add(new THREE.Vector3(0, 0.9, 0));
        camera.position.copy(hoodOffset);
        camera.lookAt(hoodOffset.clone().addScaledVector(forward, 20));
      } else if (cameraMode === 'cinematic') {
        // Low angle dramatic tracking camera
        const cinePos = targetPos
          .clone()
          .add(new THREE.Vector3(Math.sin(now * 0.001) * 12, 2.5, Math.cos(now * 0.001) * 12));
        currentCamPos.lerp(cinePos, dt * 4);
        camera.position.copy(currentCamPos);
        camera.lookAt(targetPos);
      } else {
        // Orbit overview
        const orbitOffset = new THREE.Vector3(0, 22, -35);
        camera.position.copy(targetPos.clone().add(orbitOffset));
        camera.lookAt(targetPos);
      }

      // Throttled HUD update (every 4 frames)
      hudUpdateCounter++;
      if (hudUpdateCounter % 4 === 0) {
        setSpeedKmh(physics.getSpeedKmh());
        setNitroFuel(physics.nitroFuel);
        setIsAirborne(physics.isAirborne);
        setIsCrashed(physics.isCrashed);

        // Attitude euler angles
        const euler = new THREE.Euler().setFromQuaternion(physics.quaternion, 'YXZ');
        const pitchDeg = THREE.MathUtils.radToDeg(euler.x);
        const rollDeg = THREE.MathUtils.radToDeg(euler.z);
        setAttitude({ pitchDeg, rollDeg });

        // Telemetry
        const Ix = physics.config.inertiaPitch;
        const Iy = physics.config.inertiaYaw;
        const Iz = physics.config.inertiaRoll;
        const angMom = Math.sqrt(
          Math.pow(physics.angularVelocity.x * Ix, 2) +
          Math.pow(physics.angularVelocity.y * Iy, 2) +
          Math.pow(physics.angularVelocity.z * Iz, 2)
        );

        setTelemetry({
          wx: physics.angularVelocity.x,
          wy: physics.angularVelocity.y,
          wz: physics.angularVelocity.z,
          pitchDeg: physics.accumulatedPitch,
          rollDeg: physics.accumulatedRoll,
          yawDeg: physics.accumulatedYaw,
          angularMomentum: angMom,
        });
      }

      // Render
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        // Schedule software pacing
        frameId = window.setTimeout(tick, 45);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [timeScale, airRollMode, cameraMode, selectedColorIndex, handleResetVehicle]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* Cinematic Game HUD Overlay */}
      <GameHUD
        speedKmh={speedKmh}
        nitroFuel={nitroFuel}
        isAirborne={isAirborne}
        isCrashed={isCrashed}
        stuntState={stuntState}
        landingResult={landingResult}
        totalScore={totalScore}
        highScore={highScore}
        attitude={attitude}
        activeKeys={activeKeysState}
        onVirtualInput={handleVirtualInput}
        onResetVehicle={handleResetVehicle}
      />

      {/* Unified Collapsible Bottom Control Dock */}
      <ControlDock
        config={physicsConfig}
        onUpdateConfig={setPhysicsConfig}
        selectedColorIndex={selectedColorIndex}
        onSelectColorIndex={setSelectedColorIndex}
        timeScale={timeScale}
        onChangeTimeScale={setTimeScale}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onResetVehicle={handleResetVehicle}
        onLaunchJump={handleLaunchJump}
        airRollMode={airRollMode}
        onToggleAirRollMode={setAirRollMode}
        cameraMode={cameraMode}
        onChangeCameraMode={setCameraMode}
        telemetry={telemetry}
      />
    </div>
  );
}
