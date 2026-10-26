/**
 * Procedural Web Audio API sound synthesizer for vehicle stunt simulator.
 * Generates realistic engine roar, air whoosh, tire screeches, trick stingers, and landing impacts.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private airWhooshNode: AudioBufferSourceNode | null = null;
  private airWhooshGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private isInitialized: boolean = false;

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupContinuousSounds();
      this.isInitialized = true;
    } catch {
      // AudioContext unavailable or blocked
    }
  }

  private setupContinuousSounds() {
    if (!this.ctx || !this.masterGain) return;

    // 1. Procedural Engine Sound (dual sawtooth + low-pass filter)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineSubOsc = this.ctx.createOscillator();
    this.engineSubOsc.type = 'triangle';
    this.engineSubOsc.frequency.setValueAtTime(22.5, this.ctx.currentTime);

    this.engineOsc.connect(filter);
    this.engineSubOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc.start();
    this.engineSubOsc.start();

    // 2. Air Whoosh / Wind (procedural white noise through bandpass)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(600, this.ctx.currentTime);
    windFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.airWhooshGain = this.ctx.createGain();
    this.airWhooshGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    noiseSource.connect(windFilter);
    windFilter.connect(this.airWhooshGain);
    this.airWhooshGain.connect(this.masterGain);
    noiseSource.start();
  }

  public userGesture() {
    if (!this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public updateEngine(speedKmh: number, throttle: number, isAirborne: boolean, angularVelocityMagnitude: number) {
    if (!this.ctx || !this.engineOsc || !this.engineSubOsc || !this.engineGain || !this.airWhooshGain) return;
    if (this.isMuted) return;

    const basePitch = isAirborne ? 65 : 40;
    const speedPitch = Math.min(speedKmh * 1.8, 220);
    const throttleBoost = throttle > 0 ? 30 : 0;
    const targetFreq = basePitch + speedPitch + throttleBoost;

    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
    this.engineSubOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.05);

    const baseGain = isAirborne ? 0.04 : 0.06 + Math.min(speedKmh / 200, 0.06);
    this.engineGain.gain.setTargetAtTime(baseGain, now, 0.05);

    // Air whoosh based on speed & tumbling speed mid-air
    if (isAirborne) {
      const airIntensity = Math.min((speedKmh / 160) * 0.2 + (angularVelocityMagnitude / 8) * 0.35, 0.45);
      this.airWhooshGain.gain.setTargetAtTime(airIntensity, now, 0.08);
    } else {
      const groundWind = Math.min(speedKmh / 250, 0.08);
      this.airWhooshGain.gain.setTargetAtTime(groundWind, now, 0.15);
    }
  }

  public playRampPop() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.userGesture();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playTrickComplete(multiplier: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.userGesture();
    const now = this.ctx.currentTime;

    // Ascending celebratory 2-tone stinger
    const rootFreq = Math.min(440 * (1 + (multiplier - 1) * 0.2), 880);
    [0, 0.08].forEach((delay, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(rootFreq * (idx === 0 ? 1 : 1.25), now + delay);

      gain.gain.setValueAtTime(0.2, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + delay);
      osc.stop(now + delay + 0.22);
    });
  }

  public playLanding(type: 'perfect' | 'great' | 'rough' | 'crash') {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.userGesture();
    const now = this.ctx.currentTime;

    if (type === 'crash') {
      // Harsh noise crunch
      const noiseLength = 0.5;
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * noiseLength, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      source.start(now);
      source.stop(now + 0.5);
      return;
    }

    // Suspension thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.2);

    const volume = type === 'perfect' ? 0.35 : type === 'great' ? 0.3 : 0.25;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);

    // If perfect landing, play triumphant harmonic bell
    if (type === 'perfect') {
      [587.33, 880, 1174.66].forEach((f, idx) => {
        const bell = this.ctx!.createOscillator();
        const bellGain = this.ctx!.createGain();
        bell.type = 'sine';
        bell.frequency.setValueAtTime(f, now + 0.03 * idx);
        bellGain.gain.setValueAtTime(0.18, now + 0.03 * idx);
        bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        bell.connect(bellGain);
        bellGain.connect(this.masterGain!);
        bell.start(now + 0.03 * idx);
        bell.stop(now + 0.65);
      });
    }
  }

  public playNitro() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.userGesture();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.7, this.ctx.currentTime);
    }
  }

  public getMuted() {
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
