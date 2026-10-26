import * as THREE from 'three';

export interface VehicleColors {
  body: number;
  cockpit: number;
  trim: number;
  rims: number;
  neon: number;
}

export const COLOR_PRESETS: { name: string; colors: VehicleColors }[] = [
  {
    name: 'Cyber Cyan',
    colors: {
      body: 0x06b6d4,
      cockpit: 0x0f172a,
      trim: 0x1e293b,
      rims: 0xe2e8f0,
      neon: 0x00f2fe,
    },
  },
  {
    name: 'Apex Orange',
    colors: {
      body: 0xf97316,
      cockpit: 0x18181b,
      trim: 0x27272a,
      rims: 0xd4d4d8,
      neon: 0xff6b00,
    },
  },
  {
    name: 'Acid Lime',
    colors: {
      body: 0x84cc16,
      cockpit: 0x0f172a,
      trim: 0x1e293b,
      rims: 0x18181b,
      neon: 0xa3e635,
    },
  },
  {
    name: 'Midnight Plum',
    colors: {
      body: 0xa855f7,
      cockpit: 0x1e1b4b,
      trim: 0x312e81,
      rims: 0xf1f5f9,
      neon: 0xc084fc,
    },
  },
  {
    name: 'Stealth Black',
    colors: {
      body: 0x18181b,
      cockpit: 0x09090b,
      trim: 0x27272a,
      rims: 0xe11d48,
      neon: 0xf43f5e,
    },
  },
];

export class VehicleVisualModel {
  public group: THREE.Group = new THREE.Group();

  // Parts for dynamic animation
  public frontLeftPivot: THREE.Group = new THREE.Group();
  public frontRightPivot: THREE.Group = new THREE.Group();
  public wheelMeshes: THREE.Group[] = [];
  public spinGroups: THREE.Group[] = [];
  public nitroFlames: THREE.Mesh[] = [];
  public bodyMesh: THREE.Mesh | null = null;
  public spoilerMesh: THREE.Mesh | null = null;
  public shadowMesh: THREE.Mesh | null = null;

  private bodyMat!: THREE.MeshStandardMaterial;
  private neonMat!: THREE.MeshStandardMaterial;
  private flameMat!: THREE.MeshBasicMaterial;

  constructor(presetIndex: number = 0) {
    this.buildModel(COLOR_PRESETS[presetIndex].colors);
  }

  public setColors(colors: VehicleColors) {
    if (this.bodyMat) {
      this.bodyMat.color.setHex(colors.body);
    }
    if (this.neonMat) {
      this.neonMat.color.setHex(colors.neon);
      this.neonMat.emissive.setHex(colors.neon);
    }
  }

  private buildModel(colors: VehicleColors) {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.wheelMeshes = [];
    this.spinGroups = [];
    this.nitroFlames = [];

    // --- MATERIALS ---
    this.bodyMat = new THREE.MeshStandardMaterial({
      color: colors.body,
      metalness: 0.85,
      roughness: 0.22,
    });

    const chassisDarkMat = new THREE.MeshStandardMaterial({
      color: colors.trim,
      metalness: 0.45,
      roughness: 0.6,
    });

    const rollCageMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.85,
      roughness: 0.3,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.2,
      roughness: 0.05,
      transmission: 0.7,
      transparent: true,
      opacity: 0.85,
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: colors.rims,
      metalness: 0.95,
      roughness: 0.15,
    });

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x171717,
      metalness: 0.05,
      roughness: 0.9,
    });

    const springMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.8,
      roughness: 0.2,
    });

    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x93c5fd,
      emissiveIntensity: 3.0,
      roughness: 0.1,
    });

    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0xff0033,
      emissive: 0xff0033,
      emissiveIntensity: 2.5,
      roughness: 0.2,
    });

    this.neonMat = new THREE.MeshStandardMaterial({
      color: colors.neon,
      emissive: colors.neon,
      emissiveIntensity: 2.0,
      roughness: 0.3,
    });

    this.flameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });

    // --- 1. CHASSIS BODY (HIGH-CLEARANCE BAJA / MONSTER STUNT TRUCK) ---
    const bodyGroup = new THREE.Group();

    // Main central tub
    const tubGeo = new THREE.BoxGeometry(1.8, 0.55, 3.8);
    const tub = new THREE.Mesh(tubGeo, this.bodyMat);
    tub.position.set(0, 0.55, 0.05);
    tub.castShadow = true;
    tub.receiveShadow = true;
    bodyGroup.add(tub);
    this.bodyMesh = tub;

    // Sculpted Nose Hood
    const noseGeo = new THREE.BoxGeometry(1.6, 0.35, 1.4);
    const nose = new THREE.Mesh(noseGeo, this.bodyMat);
    nose.position.set(0, 0.5, 1.7);
    nose.rotation.x = 0.18;
    nose.castShadow = true;
    bodyGroup.add(nose);

    // Front Rugged Bull-Bar / Skid Plate
    const bullBarGeo = new THREE.BoxGeometry(2.1, 0.45, 0.35);
    const bullBar = new THREE.Mesh(bullBarGeo, rollCageMat);
    bullBar.position.set(0, 0.45, 2.3);
    bullBar.castShadow = true;
    bodyGroup.add(bullBar);

    // Front Skid Plate Underbody
    const skidGeo = new THREE.BoxGeometry(1.5, 0.1, 1.2);
    const skid = new THREE.Mesh(skidGeo, chassisDarkMat);
    skid.position.set(0, 0.22, 1.8);
    skid.rotation.x = -0.25;
    bodyGroup.add(skid);

    // --- 2. CABIN & FULL TUBULAR EXOSKELETON ROLL CAGE ---
    const cockpitGeo = new THREE.BoxGeometry(1.3, 0.55, 1.7);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 0.95, -0.15);
    cockpit.castShadow = true;
    bodyGroup.add(cockpit);

    // Tubular Steel Roll Cage Arches (protects cabin during flips and bounces)
    const createRollBar = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
      const v1 = new THREE.Vector3(x1, y1, z1);
      const v2 = new THREE.Vector3(x2, y2, z2);
      const dist = v1.distanceTo(v2);
      const cylGeo = new THREE.CylinderGeometry(0.045, 0.045, dist, 8);
      const bar = new THREE.Mesh(cylGeo, rollCageMat);
      bar.position.copy(v1).add(v2).multiplyScalar(0.5);
      bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v2.clone().sub(v1).normalize());
      bar.castShadow = true;
      bodyGroup.add(bar);
    };

    // Roof A-Pillars & B-Pillars
    createRollBar(-0.7, 0.7, 0.9, -0.7, 1.28, 0.5);
    createRollBar(0.7, 0.7, 0.9, 0.7, 1.28, 0.5);
    createRollBar(-0.7, 1.28, 0.5, 0.7, 1.28, 0.5);

    createRollBar(-0.7, 0.7, -1.2, -0.7, 1.28, -0.9);
    createRollBar(0.7, 0.7, -1.2, 0.7, 1.28, -0.9);
    createRollBar(-0.7, 1.28, -0.9, 0.7, 1.28, -0.9);

    createRollBar(-0.7, 1.28, 0.5, -0.7, 1.28, -0.9);
    createRollBar(0.7, 1.28, 0.5, 0.7, 1.28, -0.9);

    // Rear Baja Wing / Spoiler
    const wingGeo = new THREE.BoxGeometry(2.3, 0.1, 0.5);
    const wing = new THREE.Mesh(wingGeo, this.bodyMat);
    wing.position.set(0, 1.2, -1.8);
    wing.rotation.x = -0.1;
    wing.castShadow = true;
    bodyGroup.add(wing);
    this.spoilerMesh = wing;

    // Wing Endplates
    const endplateL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.6), this.neonMat);
    endplateL.position.set(-1.15, 1.2, -1.8);
    const endplateR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.6), this.neonMat);
    endplateR.position.set(1.15, 1.2, -1.8);
    bodyGroup.add(endplateL);
    bodyGroup.add(endplateR);

    // Dual Rear Exhaust Pipes
    const exhaustL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 16), rimMat);
    exhaustL.rotation.x = Math.PI / 2;
    exhaustL.position.set(-0.45, 0.45, -2.0);
    const exhaustR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 16), rimMat);
    exhaustR.rotation.x = Math.PI / 2;
    exhaustR.position.set(0.45, 0.45, -2.0);
    bodyGroup.add(exhaustL);
    bodyGroup.add(exhaustR);

    // Nitro Jet Flame Cones
    const flameL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.9, 12), this.flameMat);
    flameL.rotation.x = -Math.PI / 2;
    flameL.position.set(-0.45, 0.45, -2.55);
    flameL.scale.set(0.001, 0.001, 0.001);
    bodyGroup.add(flameL);
    this.nitroFlames.push(flameL);

    const flameR = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.9, 12), this.flameMat);
    flameR.rotation.x = -Math.PI / 2;
    flameR.position.set(0.45, 0.45, -2.55);
    flameR.scale.set(0.001, 0.001, 0.001);
    bodyGroup.add(flameR);
    this.nitroFlames.push(flameR);

    // Headlights & Taillights
    const headL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), headlightMat);
    headL.position.set(-0.65, 0.58, 2.38);
    const headR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), headlightMat);
    headR.position.set(0.65, 0.58, 2.38);
    bodyGroup.add(headL);
    bodyGroup.add(headR);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.08), taillightMat);
    tail.position.set(0, 0.65, -1.96);
    bodyGroup.add(tail);

    // Underglow Neon
    const neonL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 2.8), this.neonMat);
    neonL.position.set(-0.95, 0.28, 0);
    const neonR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 2.8), this.neonMat);
    neonR.position.set(0.95, 0.28, 0);
    bodyGroup.add(neonL);
    bodyGroup.add(neonR);

    // Ground Contact Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(3.2, 5.0);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.set(0, -0.4, 0);
    bodyGroup.add(this.shadowMesh);

    this.group.add(bodyGroup);

    // --- 3. 4 BIG MONSTER STUNT WHEELS WITH CORRECT X-AXIS FORWARD ROLLING ---
    const buildBigWheel = () => {
      const wheelGroup = new THREE.Group();
      const spinGroup = new THREE.Group();

      // Big Chunky Rubber Tire: Radius 0.62m, Width 0.44m (Permanent cylinder geometry along X axle)
      const tireGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.44, 28);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      spinGroup.add(tire);

      // Rugged Knobby Tread Blocks on tire circumference
      for (let t = 0; t < 14; t++) {
        const treadGeo = new THREE.BoxGeometry(0.42, 0.06, 0.12);
        const tread = new THREE.Mesh(treadGeo, tireMat);
        const angle = (t * Math.PI * 2) / 14;
        tread.position.set(0, Math.sin(angle) * 0.62, Math.cos(angle) * 0.62);
        tread.rotation.x = -angle;
        spinGroup.add(tread);
      }

      // Heavy Duty Beadlock Alloy Rim: Radius 0.38m (Cylinder along X axle)
      const rimGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.46, 20);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      spinGroup.add(rim);

      // Rugged Rim Beadlock Ring with bolts
      const beadlockGeo = new THREE.TorusGeometry(0.36, 0.03, 8, 20);
      const beadlock = new THREE.Mesh(beadlockGeo, this.neonMat);
      beadlock.rotation.y = Math.PI / 2;
      beadlock.position.x = 0.22;
      spinGroup.add(beadlock);

      // 6-Spoke Star Rim
      for (let s = 0; s < 6; s++) {
        const spokeGeo = new THREE.BoxGeometry(0.06, 0.56, 0.06);
        const spoke = new THREE.Mesh(spokeGeo, rimMat);
        spoke.rotation.x = (s * Math.PI * 2) / 6;
        spoke.position.x = 0.21;
        spinGroup.add(spoke);
      }

      wheelGroup.add(spinGroup);

      // Stationary Components (Brake Caliper & Coilover Shock)
      const caliperGeo = new THREE.BoxGeometry(0.1, 0.24, 0.16);
      const caliperMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
      const caliper = new THREE.Mesh(caliperGeo, caliperMat);
      caliper.position.set(0.08, 0.24, 0);
      wheelGroup.add(caliper);

      const shockGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
      const shock = new THREE.Mesh(shockGeo, springMat);
      shock.position.set(-0.2, 0.3, 0);
      shock.rotation.z = 0.2;
      wheelGroup.add(shock);

      return { wheelGroup, spinGroup };
    };

    // Front Left Pivot (X: -1.25, Z: 1.45)
    this.frontLeftPivot = new THREE.Group();
    this.frontLeftPivot.position.set(-1.25, 0.35, 1.45);
    const fl = buildBigWheel();
    this.frontLeftPivot.add(fl.wheelGroup);
    this.group.add(this.frontLeftPivot);
    this.wheelMeshes.push(fl.wheelGroup);
    this.spinGroups.push(fl.spinGroup);

    // Front Right Pivot (X: 1.25, Z: 1.45)
    this.frontRightPivot = new THREE.Group();
    this.frontRightPivot.position.set(1.25, 0.35, 1.45);
    const fr = buildBigWheel();
    fr.wheelGroup.rotation.y = Math.PI; // Face outward
    this.frontRightPivot.add(fr.wheelGroup);
    this.group.add(this.frontRightPivot);
    this.wheelMeshes.push(fr.wheelGroup);
    this.spinGroups.push(fr.spinGroup);

    // Rear Left Wheel (X: -1.25, Z: -1.35)
    const rl = buildBigWheel();
    rl.wheelGroup.position.set(-1.25, 0.35, -1.35);
    this.group.add(rl.wheelGroup);
    this.wheelMeshes.push(rl.wheelGroup);
    this.spinGroups.push(rl.spinGroup);

    // Rear Right Wheel (X: 1.25, Z: -1.35)
    const rr = buildBigWheel();
    rr.wheelGroup.rotation.y = Math.PI;
    rr.wheelGroup.position.set(1.25, 0.35, -1.35);
    this.group.add(rr.wheelGroup);
    this.wheelMeshes.push(rr.wheelGroup);
    this.spinGroups.push(rr.spinGroup);
  }

  public update(
    position: THREE.Vector3,
    quaternion: THREE.Quaternion,
    steerAngle: number,
    wheelRotations: number[],
    isNitro: boolean,
    isAirborne: boolean
  ) {
    this.group.position.copy(position);
    this.group.quaternion.copy(quaternion);

    // Front wheels steering turn (around Y)
    this.frontLeftPivot.rotation.y = steerAngle;
    this.frontRightPivot.rotation.y = steerAngle;

    // TRUE FORWARD ROLLING: Rotate spinGroups around their local X-axis (the wheel axle!)
    for (let i = 0; i < 4; i++) {
      if (this.spinGroups[i]) {
        // Left side wheels (0, 2): positive rotation.x rolls forward.
        // Right side wheels (1, 3): mirrored by rotation.y = Math.PI, so negative rotation.x rolls forward.
        const sign = (i === 1 || i === 3) ? -1 : 1;
        this.spinGroups[i].rotation.x = wheelRotations[i] * sign;
      }
    }

    // Nitro flames
    const targetScale = isNitro ? 1.0 + Math.random() * 0.4 : 0.001;
    for (const flame of this.nitroFlames) {
      flame.scale.set(targetScale, targetScale * 1.5, targetScale);
    }

    if (this.shadowMesh) {
      this.shadowMesh.visible = !isAirborne;
    }
  }
}
