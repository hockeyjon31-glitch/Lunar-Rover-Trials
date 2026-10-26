import * as THREE from 'three';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  public group: THREE.Group = new THREE.Group();
  private maxParticles = 600;
  private particles: Particle[] = [];

  private geometry!: THREE.BufferGeometry;
  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private pointsMesh!: THREE.Points;

  constructor() {
    this.init();
  }

  private init() {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    // Initial dummy data
    for (let i = 0; i < this.maxParticles; i++) {
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = -100;
      this.positions[i * 3 + 2] = 0;

      this.colors[i * 3] = 1;
      this.colors[i * 3 + 1] = 1;
      this.colors[i * 3 + 2] = 1;

      this.sizes[i] = 0;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Circular soft particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.7)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.pointsMesh = new THREE.Points(this.geometry, material);
    this.group.add(this.pointsMesh);
  }

  public emitSparks(pos: THREE.Vector3, count = 25) {
    const sparkColor = new THREE.Color(0xffb703);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      this.particles.push({
        pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.4, (Math.random() - 0.5) * 0.8)),
        vel: new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 8 + 3, (Math.random() - 0.5) * 12),
        color: sparkColor,
        size: 0.8 + Math.random() * 0.8,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.4,
      });
    }
  }

  public emitLandingShockwave(pos: THREE.Vector3, isPerfect: boolean) {
    const count = isPerfect ? 50 : 25;
    const baseColor = isPerfect ? new THREE.Color(0x38bdf8) : new THREE.Color(0xffffff);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (i / count) * Math.PI * 2;
      const speed = (isPerfect ? 18 : 10) + Math.random() * 4;
      this.particles.push({
        pos: pos.clone().add(new THREE.Vector3(0, 0.1, 0)),
        vel: new THREE.Vector3(Math.cos(angle) * speed, Math.random() * 2 + 0.5, Math.sin(angle) * speed),
        color: baseColor,
        size: isPerfect ? 2.5 : 1.8,
        life: 0,
        maxLife: isPerfect ? 0.8 : 0.5,
      });
    }
  }

  public emitNitroTrail(pos: THREE.Vector3) {
    if (this.particles.length >= this.maxParticles - 4) return;
    const nitroColor = new THREE.Color(0x06b6d4);
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3)),
        vel: new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, -Math.random() * 15 - 5),
        color: nitroColor,
        size: 1.6 + Math.random() * 0.8,
        life: 0,
        maxLife: 0.35,
      });
    }
  }

  public update(dt: number) {
    const gravity = new THREE.Vector3(0, -9.8, 0);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.vel.addScaledVector(gravity, dt);
      p.pos.addScaledVector(p.vel, dt);
    }

    // Update GPU buffers
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute;
    const sizeAttr = this.geometry.attributes.size as THREE.BufferAttribute;

    const count = this.particles.length;
    for (let i = 0; i < this.maxParticles; i++) {
      if (i < count) {
        const p = this.particles[i];
        const lifeT = p.life / p.maxLife;
        const currentSize = p.size * (1 - lifeT);

        this.positions[i * 3] = p.pos.x;
        this.positions[i * 3 + 1] = p.pos.y;
        this.positions[i * 3 + 2] = p.pos.z;

        this.colors[i * 3] = p.color.r;
        this.colors[i * 3 + 1] = p.color.g;
        this.colors[i * 3 + 2] = p.color.b;

        this.sizes[i] = currentSize;
      } else {
        this.positions[i * 3 + 1] = -100;
        this.sizes[i] = 0;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }
}
