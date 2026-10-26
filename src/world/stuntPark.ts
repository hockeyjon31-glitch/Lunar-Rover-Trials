import * as THREE from 'three';

export interface RingTarget {
  id: string;
  position: THREE.Vector3;
  radius: number;
  points: number;
  isCollected: boolean;
  mesh?: THREE.Group;
}

export class StuntPark {
  public scene: THREE.Group = new THREE.Group();
  public rings: RingTarget[] = [];
  public onRingCollect?: (points: number, ring: RingTarget) => void;

  // Reusable normal vector
  private _tempNormal = new THREE.Vector3(0, 1, 0);

  constructor() {
    this.buildPark();
  }

  /**
   * Procedural textures
   */
  private createTarmacTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 512, 512);

    // Fine asphalt noise
    for (let i = 0; i < 25000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const gray = Math.floor(20 + Math.random() * 30);
      ctx.fillStyle = `rgb(${gray},${gray + 3},${gray + 7})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Grid lane markings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(40, 40);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createRampGrateTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 512);

    // Bold racing chevrons pointing up the ramp
    ctx.fillStyle = '#f59e0b';
    for (let y = 0; y < 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(256, y);
      ctx.lineTo(512, y + 80);
      ctx.lineTo(512, y + 110);
      ctx.lineTo(256, y + 30);
      ctx.lineTo(0, y + 110);
      ctx.lineTo(0, y + 80);
      ctx.closePath();
      ctx.fill();
    }

    // Metal grid texture lines
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    for (let x = 0; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 6);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createLandingTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#022c22';
    ctx.fillRect(0, 0, 512, 512);

    // High visibility neon green landing grid & crosshairs
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 496, 496);

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 2;
    for (let i = 64; i < 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    // Target crosshairs in center
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(256, 256, 100, 0, Math.PI * 2);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 6);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Build complete stunt arena
   */
  private buildPark() {
    const tarmacTex = this.createTarmacTexture();
    const rampTex = this.createRampGrateTexture();
    const landingTex = this.createLandingTexture();

    // 1. Vast Ground Arena Floor
    const groundGeo = new THREE.PlaneGeometry(600, 700);
    const groundMat = new THREE.MeshStandardMaterial({
      map: tarmacTex,
      roughness: 0.85,
      metalness: 0.15,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // 2. High-Speed Acceleration Runway (Z: -120 to 0, Width: 28m)
    const runwayGeo = new THREE.PlaneGeometry(28, 120);
    const runwayMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.6,
    });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(0, 0.03, -60);
    runway.receiveShadow = true;
    this.scene.add(runway);

    // Glowing Neon Center Runway Strips
    const centerStripGeo = new THREE.PlaneGeometry(1.2, 120);
    const centerStripMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.0,
      roughness: 0.2,
    });
    const centerStrip = new THREE.Mesh(centerStripGeo, centerStripMat);
    centerStrip.rotation.x = -Math.PI / 2;
    centerStrip.position.set(0, 0.04, -60);
    this.scene.add(centerStrip);

    // Runway Distance Signposts & Neon Edge Rails (Z: -100 to 0)
    const edgeRailMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0284c7,
      emissiveIntensity: 1.5,
    });
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 120), edgeRailMat);
    railL.position.set(-14, 0.3, -60);
    this.scene.add(railL);

    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 120), edgeRailMat);
    railR.position.set(14, 0.3, -60);
    this.scene.add(railR);

    // 3. MEGA LAUNCH KICKER RAMP (Z: 0 to 50, Width: 28m, Height: 0 to 13.5m)
    // Direct parametric BufferGeometry: 100% vertex-accurate to the mathematical function!
    const rampWidth = 28;
    const rampLength = 50;
    const rampStepsZ = 30;
    const rampMat = new THREE.MeshStandardMaterial({
      map: rampTex,
      roughness: 0.4,
      metalness: 0.7,
      bumpScale: 0.08,
      side: THREE.DoubleSide,
    });

    const megaRamp = this.createCurvedRampMesh(rampWidth, rampLength, rampStepsZ, rampMat);
    megaRamp.position.set(0, 0, 0);
    megaRamp.castShadow = true;
    megaRamp.receiveShadow = true;
    this.scene.add(megaRamp);

    // Neon Edge Trim on Launch Lip at z = 50, y = 13.5
    const lipGeo = new THREE.BoxGeometry(rampWidth + 0.8, 0.8, 1.2);
    const lipMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 3.0,
      roughness: 0.1,
      metalness: 0.9,
    });
    const lip = new THREE.Mesh(lipGeo, lipMat);
    lip.position.set(0, 13.5, 50);
    this.scene.add(lip);

    // Launch Pillars / Trusses under the ramp lip
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.4 });
    [-12, -4, 4, 12].forEach((x) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 13.5, 8), trussMat);
      pillar.position.set(x, 6.75, 49.5);
      pillar.castShadow = true;
      this.scene.add(pillar);
    });

    // 4. TARGET LANDING SLOPE (Z: 105 to 180, Width: 36m, Height: 11.5m down to 0)
    const landingMesh = this.createLandingSlopeMesh(36, 105, 180, 11.5, new THREE.MeshStandardMaterial({
      map: landingTex,
      roughness: 0.4,
      metalness: 0.5,
      side: THREE.DoubleSide,
    }));
    landingMesh.castShadow = true;
    landingMesh.receiveShadow = true;
    this.scene.add(landingMesh);

    // Neon Landing Zone Guide Lights along landing slope
    const landingGuideMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 2.5,
    });
    for (let lz = 105; lz <= 180; lz += 15) {
      const t = (lz - 105) / 75;
      const ly = 11.5 * (1 - t) + 0.3;
      const markerL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 2.0), landingGuideMat);
      markerL.position.set(-18.5, ly, lz);
      this.scene.add(markerL);

      const markerR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 2.0), landingGuideMat);
      markerR.position.set(18.5, ly, lz);
      this.scene.add(markerR);
    }

    // Rollout runway from Z: 180 to 320
    const rolloutGeo = new THREE.PlaneGeometry(36, 140);
    const rollout = new THREE.Mesh(rolloutGeo, runwayMat);
    rollout.rotation.x = -Math.PI / 2;
    rollout.position.set(0, 0.03, 250);
    rollout.receiveShadow = true;
    this.scene.add(rollout);

    // 5. VERTICAL QUARTER-PIPE VERT ARENA (X: -70 to -45, Z: 0 to 90)
    const qpMesh = this.createQuarterPipeMesh();
    qpMesh.position.set(-60, 0, 10);
    qpMesh.castShadow = true;
    qpMesh.receiveShadow = true;
    this.scene.add(qpMesh);

    // 6. DOUBLE DIRT JUMP MOUNDS (X: 45 to 75, Z: -20 to 60)
    const moundMesh = this.createDirtMoundMesh();
    moundMesh.position.set(60, 0, 15);
    moundMesh.castShadow = true;
    moundMesh.receiveShadow = true;
    this.scene.add(moundMesh);

    // 7. FLOATING AIRTIME TARGET RINGS (Hovering in the jump arc from z = 50 to 105)
    this.createTargetRing('ring_1', new THREE.Vector3(0, 18.0, 68), 5.5, 1000);
    this.createTargetRing('ring_2', new THREE.Vector3(0, 22.0, 85), 6.5, 2500);
    this.createTargetRing('ring_3', new THREE.Vector3(0, 15.5, 102), 5.5, 1500);
    this.createTargetRing('ring_vert', new THREE.Vector3(-55, 14.0, 45), 5.0, 1500);

    // 8. ARENA BOUNDARY PERIMETERS (Safely positioned far outside the driving and landing zone)
    this.createArenaPerimeter();
  }

  /**
   * Procedural Curved Launch Ramp Mesh with top surface and side walls
   */
  private createCurvedRampMesh(width: number, length: number, segmentsZ: number, material: THREE.Material): THREE.Mesh {
    const halfW = width / 2;
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    // Top surface vertices
    for (let i = 0; i <= segmentsZ; i++) {
      const t = i / segmentsZ;
      const z = t * length;
      const y = 13.5 * (1.5 * t * t - 0.5 * t * t * t);

      // Left vertex
      vertices.push(-halfW, y, z);
      uvs.push(0, t * 4);

      // Right vertex
      vertices.push(halfW, y, z);
      uvs.push(1, t * 4);
    }

    // Top surface quads
    for (let i = 0; i < segmentsZ; i++) {
      const row1 = i * 2;
      const row2 = (i + 1) * 2;
      indices.push(row1, row1 + 1, row2);
      indices.push(row1 + 1, row2 + 1, row2);
    }

    // Left and right side vertical walls
    const baseIndex = vertices.length / 3;
    for (let i = 0; i <= segmentsZ; i++) {
      const t = i / segmentsZ;
      const z = t * length;
      const y = 13.5 * (1.5 * t * t - 0.5 * t * t * t);

      // Left top & bottom
      vertices.push(-halfW, y, z);
      uvs.push(t * 3, y / 13.5);
      vertices.push(-halfW, 0, z);
      uvs.push(t * 3, 0);

      // Right top & bottom
      vertices.push(halfW, y, z);
      uvs.push(t * 3, y / 13.5);
      vertices.push(halfW, 0, z);
      uvs.push(t * 3, 0);
    }

    for (let i = 0; i < segmentsZ; i++) {
      // Left wall quads
      const lt1 = baseIndex + i * 4;
      const lb1 = lt1 + 1;
      const lt2 = lt1 + 4;
      const lb2 = lt1 + 5;
      indices.push(lt1, lt2, lb1);
      indices.push(lt2, lb2, lb1);

      // Right wall quads
      const rt1 = baseIndex + i * 4 + 2;
      const rb1 = rt1 + 1;
      const rt2 = rt1 + 4;
      const rb2 = rt1 + 5;
      indices.push(rt1, rb1, rt2);
      indices.push(rt2, rb1, rb2);
    }

    // Front vertical drop under lip at z = length
    const lipBase = vertices.length / 3;
    vertices.push(-halfW, 13.5, length); uvs.push(0, 1);
    vertices.push(halfW, 13.5, length); uvs.push(1, 1);
    vertices.push(-halfW, 0, length); uvs.push(0, 0);
    vertices.push(halfW, 0, length); uvs.push(1, 0);
    indices.push(lipBase, lipBase + 1, lipBase + 2);
    indices.push(lipBase + 1, lipBase + 3, lipBase + 2);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return new THREE.Mesh(geo, material);
  }

  /**
   * Procedural Landing Slope Mesh
   */
  private createLandingSlopeMesh(
    width: number,
    startZ: number,
    endZ: number,
    peakY: number,
    material: THREE.Material
  ): THREE.Mesh {
    const halfW = width / 2;
    const length = endZ - startZ;
    const segments = 25;
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    // Surface
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const z = startZ + t * length;
      const y = peakY * Math.pow(1 - t, 1.2);

      vertices.push(-halfW, y, z);
      uvs.push(0, t * 3);
      vertices.push(halfW, y, z);
      uvs.push(1, t * 3);
    }

    for (let i = 0; i < segments; i++) {
      const r1 = i * 2;
      const r2 = (i + 1) * 2;
      indices.push(r1, r1 + 1, r2);
      indices.push(r1 + 1, r2 + 1, r2);
    }

    // Side walls
    const base = vertices.length / 3;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const z = startZ + t * length;
      const y = peakY * Math.pow(1 - t, 1.2);

      vertices.push(-halfW, y, z); uvs.push(t, y / peakY);
      vertices.push(-halfW, 0, z); uvs.push(t, 0);
      vertices.push(halfW, y, z); uvs.push(t, y / peakY);
      vertices.push(halfW, 0, z); uvs.push(t, 0);
    }

    for (let i = 0; i < segments; i++) {
      const l1 = base + i * 4;
      const l2 = l1 + 4;
      indices.push(l1, l2, l1 + 1);
      indices.push(l2, l2 + 1, l1 + 1);

      const r1 = base + i * 4 + 2;
      const r2 = r1 + 4;
      indices.push(r1, r1 + 1, r2);
      indices.push(r2, r1 + 1, r2 + 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return new THREE.Mesh(geo, material);
  }

  private createQuarterPipeMesh(): THREE.Mesh {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    for (let s = 0; s <= 15; s++) {
      const t = s / 15;
      const x = t * 18;
      const y = Math.pow(t, 2.2) * 10;
      shape.lineTo(x, y);
    }
    shape.lineTo(18, 0);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: 70, bevelEnabled: false });
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.6,
      roughness: 0.4,
    });
    return new THREE.Mesh(geo, mat);
  }

  private createDirtMoundMesh(): THREE.Mesh {
    const shape = new THREE.Shape();
    shape.moveTo(-15, 0);
    shape.quadraticCurveTo(0, 5.5, 15, 0);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: 40, bevelEnabled: false });
    const mat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.85,
      metalness: 0.1,
    });
    return new THREE.Mesh(geo, mat);
  }

  private createTargetRing(id: string, pos: THREE.Vector3, radius: number, points: number) {
    const ringGroup = new THREE.Group();
    ringGroup.position.copy(pos);

    // Torus geometry
    const ringGeo = new THREE.TorusGeometry(radius, 0.45, 16, 36);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.9,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringGroup.add(ringMesh);

    // Inner translucent energy disk
    const diskGeo = new THREE.CircleGeometry(radius * 0.92, 24);
    const diskMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const diskMesh = new THREE.Mesh(diskGeo, diskMat);
    ringGroup.add(diskMesh);

    this.scene.add(ringGroup);
    this.rings.push({
      id,
      position: pos,
      radius,
      points,
      isCollected: false,
      mesh: ringGroup,
    });
  }

  private createArenaPerimeter() {
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.5,
    });
    const neonRailMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.5,
      roughness: 0.3,
    });

    const createWall = (x: number, z: number, w: number, l: number) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 3.0, l), barrierMat);
      wall.position.set(x, 1.5, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, l), neonRailMat);
      rail.position.set(x, 3.2, z);
      this.scene.add(rail);
    };

    // North / South / East / West boundary barriers placed far away (Z: 380, -180, X: ±150)
    createWall(0, 380, 300, 4);
    createWall(0, -180, 300, 4);
    createWall(150, 100, 4, 560);
    createWall(-150, 100, 4, 560);
  }

  /**
   * Terrain & Ramp Height + Surface Normal Query
   * Computes exact mathematical surface elevation and slope for any (x, z)
   */
  public getTerrainHeight(x: number, z: number): {
    height: number;
    normal: THREE.Vector3;
    surfaceType: 'tarmac' | 'ramp' | 'grass' | 'dirt' | 'landing_zone';
  } {
    let height = 0;
    const normal = this._tempNormal.set(0, 1, 0);
    let surfaceType: 'tarmac' | 'ramp' | 'grass' | 'dirt' | 'landing_zone' = 'tarmac';

    // 1. MEGA LAUNCH KICKER RAMP (Z: 0 to 50, |X| <= 14)
    if (z >= 0 && z <= 50 && Math.abs(x) <= 14) {
      const t = z / 50;
      // Hermite smooth step: y(t) = 13.5 * (1.5 * t^2 - 0.5 * t^3)
      height = 13.5 * (1.5 * t * t - 0.5 * t * t * t);
      surfaceType = 'ramp';

      // dy/dz = (13.5 / 50) * (3 * t - 1.5 * t^2)
      const slope = (13.5 / 50) * (3 * t - 1.5 * t * t);
      normal.set(0, 1, -slope).normalize();
      return { height, normal, surfaceType };
    }

    // 2. TARGET LANDING SLOPE (Z: 105 to 180, |X| <= 18)
    if (z >= 105 && z <= 180 && Math.abs(x) <= 18) {
      const t = (z - 105) / 75;
      height = 11.5 * Math.pow(1 - t, 1.2);
      surfaceType = 'landing_zone';

      const slope = (-11.5 * 1.2 * Math.pow(Math.max(1 - t, 0.01), 0.2)) / 75;
      normal.set(0, 1, -slope).normalize();
      return { height, normal, surfaceType };
    }

    // 3. QUARTER-PIPE VERT (X: -60 to -42, Z: 10 to 80)
    if (x >= -60 && x <= -42 && z >= 10 && z <= 80) {
      const t = (x - (-60)) / 18;
      height = Math.pow(t, 2.2) * 10;
      surfaceType = 'ramp';
      const slope = (2.2 * Math.pow(Math.max(t, 0.01), 1.2) * 10) / 18;
      normal.set(-slope, 1, 0).normalize();
      return { height, normal, surfaceType };
    }

    // 4. DIRT MOUND (X: 45 to 75, Z: -5 to 35)
    if (x >= 45 && x <= 75 && z >= -5 && z <= 35) {
      const dx = (x - 60) / 15;
      if (Math.abs(dx) <= 1) {
        height = (1 - dx * dx) * 5.5;
        surfaceType = 'dirt';
        const slope = (-2 * dx * 5.5) / 15;
        normal.set(-slope, 1, 0).normalize();
        return { height, normal, surfaceType };
      }
    }

    // Flat tarmac floor everywhere else (height = 0)
    return { height, normal, surfaceType };
  }

  public checkRingCollisions(vehiclePos: THREE.Vector3): number {
    let collectedPoints = 0;
    for (const ring of this.rings) {
      if (ring.isCollected) continue;
      const dist = vehiclePos.distanceTo(ring.position);
      if (dist <= ring.radius + 1.2) {
        ring.isCollected = true;
        collectedPoints += ring.points;
        if (ring.mesh) {
          ring.mesh.scale.set(1.4, 1.4, 1.4);
          (ring.mesh.children[0] as THREE.Mesh).material = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            wireframe: true,
          });
        }
        if (this.onRingCollect) {
          this.onRingCollect(ring.points, ring);
        }
      }
    }
    return collectedPoints;
  }

  public resetRings() {
    for (const ring of this.rings) {
      ring.isCollected = false;
      if (ring.mesh) {
        ring.mesh.scale.set(1, 1, 1);
        (ring.mesh.children[0] as THREE.Mesh).material = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xf59e0b,
          emissiveIntensity: 2.2,
          roughness: 0.2,
          metalness: 0.9,
        });
      }
    }
  }

  public updateAnimation(time: number) {
    for (const ring of this.rings) {
      if (ring.mesh && !ring.isCollected) {
        ring.mesh.rotation.z = Math.sin(time * 2 + ring.position.z) * 0.15;
      }
    }
  }
}
