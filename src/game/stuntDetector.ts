import { soundManager } from '../audio/soundEffects';

export interface StuntItem {
  id: string;
  name: string;
  points: number;
  type: 'pitch' | 'roll' | 'yaw' | 'hybrid' | 'airtime';
}

export interface StuntState {
  currentTricks: StuntItem[];
  rawScore: number;
  comboMultiplier: number;
  airtimeSeconds: number;
  apexHeightMeters: number;
  totalPendingScore: number;
  lastCompletedTrick: string | null;
  lastTrickTime: number;
}

export class StuntDetector {
  private lastPitchCycles = 0;
  private lastRollCycles = 0;
  private lastYawHalfCycles = 0;

  public activeTricks: StuntItem[] = [];
  public comboMultiplier = 1.0;
  public totalScore = 0;
  public highScore = 0;
  public bestComboScore = 0;
  public trickHistory: { name: string; score: number; grade: string; timestamp: number }[] = [];

  // Temporary UI notification state
  public lastTrickName: string | null = null;
  public lastTrickNotificationTime = 0;

  constructor() {
    this.loadHighScore();
  }

  private loadHighScore() {
    try {
      const saved = localStorage.getItem('apex_torque_high_score');
      if (saved) {
        this.highScore = parseInt(saved, 10) || 0;
      }
    } catch {
      // LocalStorage unavailable
    }
  }

  private saveHighScore() {
    try {
      localStorage.setItem('apex_torque_high_score', this.highScore.toString());
    } catch {
      // ignore
    }
  }

  public resetAirborneStunts() {
    this.activeTricks = [];
    this.comboMultiplier = 1.0;
    this.lastPitchCycles = 0;
    this.lastRollCycles = 0;
    this.lastYawHalfCycles = 0;
    this.lastTrickName = null;
  }

  /**
   * Evaluates rotation accumulated during flight and awards tricks
   */
  public evaluateAirborneTricks(
    accumulatedPitchDeg: number,
    accumulatedRollDeg: number,
    accumulatedYawDeg: number,
    airtimeSeconds: number,
    apexAltitude: number
  ): StuntState {
    const pitchAbs = Math.abs(accumulatedPitchDeg);
    const rollAbs = Math.abs(accumulatedRollDeg);
    const yawAbs = Math.abs(accumulatedYawDeg);

    // 1. Pitch flips (threshold every 330 degrees to be forgiving and feel great)
    const pitchSign = Math.sign(accumulatedPitchDeg);
    const currentPitchCycles = Math.floor((pitchAbs + 30) / 360);

    if (currentPitchCycles > this.lastPitchCycles) {
      const isBackflip = pitchSign > 0;
      const cycleDiff = currentPitchCycles - this.lastPitchCycles;

      for (let i = 0; i < cycleDiff; i++) {
        const count = this.lastPitchCycles + i + 1;
        let trickName = '';
        let pts = 600;

        if (count === 1) {
          trickName = isBackflip ? 'BACKFLIP' : 'FRONTFLIP';
          pts = 600;
        } else if (count === 2) {
          trickName = isBackflip ? 'DOUBLE BACKFLIP' : 'DOUBLE FRONTFLIP';
          pts = 1400;
        } else if (count === 3) {
          trickName = isBackflip ? 'TRIPLE BACKFLIP' : 'TRIPLE FRONTFLIP';
          pts = 2600;
        } else {
          trickName = `${count}x ${isBackflip ? 'BACKFLIP' : 'FRONTFLIP'}!`;
          pts = 2000 + count * 1000;
        }

        this.addTrick({
          id: `pitch_${count}_${Date.now()}`,
          name: trickName,
          points: pts,
          type: 'pitch',
        });
      }
      this.lastPitchCycles = currentPitchCycles;
    }

    // 2. Roll Flips (Barrel rolls every 330 degrees)
    const currentRollCycles = Math.floor((rollAbs + 30) / 360);
    if (currentRollCycles > this.lastRollCycles) {
      const cycleDiff = currentRollCycles - this.lastRollCycles;
      for (let i = 0; i < cycleDiff; i++) {
        const count = this.lastRollCycles + i + 1;
        let name = '';
        let pts = 550;
        if (count === 1) {
          name = 'BARREL ROLL';
          pts = 550;
        } else if (count === 2) {
          name = 'DOUBLE BARREL ROLL';
          pts = 1300;
        } else {
          name = `${count}x BARREL ROLL!`;
          pts = 1800 + count * 800;
        }

        this.addTrick({
          id: `roll_${count}_${Date.now()}`,
          name,
          points: pts,
          type: 'roll',
        });
      }
      this.lastRollCycles = currentRollCycles;
    }

    // 3. Flat spins (Yaw every 180 degrees)
    const currentYawHalfCycles = Math.floor((yawAbs + 25) / 180);
    if (currentYawHalfCycles > this.lastYawHalfCycles) {
      const cycleDiff = currentYawHalfCycles - this.lastYawHalfCycles;
      for (let i = 0; i < cycleDiff; i++) {
        const count = this.lastYawHalfCycles + i + 1;
        const degrees = count * 180;
        const name = `FLATSPIN ${degrees}°`;
        const pts = 250 + count * 250;

        this.addTrick({
          id: `yaw_${degrees}_${Date.now()}`,
          name,
          points: pts,
          type: 'yaw',
        });

        // Check for compound Rodeo or Corkscrew
        if (this.lastPitchCycles >= 1 && degrees >= 360 && !this.activeTricks.some((t) => t.name.includes('RODEO'))) {
          this.addTrick({
            id: `hybrid_rodeo_${Date.now()}`,
            name: `RODEO ${degrees}°!`,
            points: 1500,
            type: 'hybrid',
          });
        }
        if (this.lastRollCycles >= 1 && degrees >= 360 && !this.activeTricks.some((t) => t.name.includes('CORKSCREW'))) {
          this.addTrick({
            id: `hybrid_cork_${Date.now()}`,
            name: `CORKSCREW ${degrees}°!`,
            points: 1800,
            type: 'hybrid',
          });
        }
      }
      this.lastYawHalfCycles = currentYawHalfCycles;
    }

    // 4. Airtime milestone awards
    if (airtimeSeconds >= 2.0 && !this.activeTricks.some((t) => t.id === 'airtime_2s')) {
      this.addTrick({
        id: 'airtime_2s',
        name: 'BIG AIR (2.0s)',
        points: 400,
        type: 'airtime',
      });
    }
    if (airtimeSeconds >= 3.5 && !this.activeTricks.some((t) => t.id === 'airtime_3.5s')) {
      this.addTrick({
        id: 'airtime_3.5s',
        name: 'MASSIVE AIR (3.5s+)',
        points: 1000,
        type: 'airtime',
      });
    }

    // Calculate sum and totals
    const rawScore = this.activeTricks.reduce((acc, t) => acc + t.points, 0);
    const totalPendingScore = Math.round(rawScore * this.comboMultiplier);

    return {
      currentTricks: [...this.activeTricks],
      rawScore,
      comboMultiplier: this.comboMultiplier,
      airtimeSeconds,
      apexHeightMeters: Math.max(0, apexAltitude - 1.2),
      totalPendingScore,
      lastCompletedTrick: this.lastTrickName,
      lastTrickTime: this.lastTrickNotificationTime,
    };
  }

  private addTrick(trick: StuntItem) {
    this.activeTricks.push(trick);
    this.comboMultiplier = Number((this.comboMultiplier + 0.5).toFixed(1));
    this.lastTrickName = trick.name;
    this.lastTrickNotificationTime = Date.now();
    soundManager.playTrickComplete(this.comboMultiplier);
  }

  /**
   * Finalizes landing: bank points or wipeout
   */
  public finalizeLanding(
    landingMultiplier: number,
    bonusPoints: number,
    grade: 'perfect' | 'great' | 'rough' | 'tumble' | 'crash' | 'recovery'
  ): { pointsBanked: number; summary: string } {
    if (grade === 'tumble') {
      return {
        pointsBanked: 0,
        summary: 'TUMBLING & BOUNCING! TRY TO RECOVER!',
      };
    }

    if (grade === 'crash') {
      const lostScore = this.activeTricks.reduce((acc, t) => acc + t.points, 0);
      this.resetAirborneStunts();
      return {
        pointsBanked: 0,
        summary: lostScore > 0 ? `WIPEOUT! Lost ${lostScore} trick pts` : 'CRASHED!',
      };
    }

    const trickSum = this.activeTricks.reduce((acc, t) => acc + t.points, 0);
    const comboScore = trickSum * this.comboMultiplier;
    const finalPoints = Math.round((comboScore + bonusPoints) * landingMultiplier);

    if (finalPoints > 0) {
      this.totalScore += finalPoints;
      if (this.totalScore > this.highScore) {
        this.highScore = this.totalScore;
        this.saveHighScore();
      }
      if (finalPoints > this.bestComboScore) {
        this.bestComboScore = finalPoints;
      }

      const mainTrickName = this.activeTricks.length > 0 ? this.activeTricks[this.activeTricks.length - 1].name : 'AIR TIME';
      this.trickHistory.unshift({
        name: `${mainTrickName} (${grade.toUpperCase()})`,
        score: finalPoints,
        grade,
        timestamp: Date.now(),
      });
      if (this.trickHistory.length > 10) {
        this.trickHistory.pop();
      }
    }

    this.resetAirborneStunts();
    return {
      pointsBanked: finalPoints,
      summary: `+${finalPoints.toLocaleString()} PTS!`,
    };
  }
}
