import React, { useState } from 'react';
import { StuntState } from '../game/stuntDetector';
import { LandingResult } from '../physics/airtimePhysics';
import {
  Flame,
  Trophy,
  Award,
  AlertTriangle,
  CheckCircle,
  Compass,
  Zap,
  HelpCircle,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface GameHUDProps {
  speedKmh: number;
  nitroFuel: number;
  isAirborne: boolean;
  isCrashed: boolean;
  stuntState: StuntState;
  landingResult: LandingResult | null;
  totalScore: number;
  highScore: number;
  attitude: {
    pitchDeg: number;
    rollDeg: number;
  };
  activeKeys: { [key: string]: boolean };
  onVirtualInput: (inputKey: string, active: boolean) => void;
  onResetVehicle: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  speedKmh,
  nitroFuel,
  isAirborne,
  isCrashed,
  stuntState,
  landingResult,
  totalScore,
  highScore,
  attitude,
  activeKeys,
  onVirtualInput,
  onResetVehicle,
}) => {
  const [showControlsGuide, setShowControlsGuide] = useState(false);

  const isKeyActive = (key: string) => Boolean(activeKeys[key]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-col justify-between p-4 z-20">
      {/* --- TOP BAR: SCORE, RECORD, & LOGO --- */}
      <div className="flex items-start justify-between w-full max-w-6xl mx-auto gap-3">
        {/* Brand Badge & Controls Toggle */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-900/90 border border-cyan-500/30 px-3.5 py-1.5 rounded-xl shadow-lg backdrop-blur-md">
            <div className="text-[10px] font-bold tracking-widest text-cyan-400 font-display">
              APEX TORQUE // AIRTIME
            </div>
            <div className="text-xs font-semibold text-slate-300">Physics Stunt Simulator</div>
          </div>

          {/* Toggle Controls Guide Button */}
          <button
            onClick={() => setShowControlsGuide(!showControlsGuide)}
            className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-cyan-400 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer shadow-lg backdrop-blur-md"
            title="Toggle Controls Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{showControlsGuide ? 'Hide Guide' : 'Controls & Keys'}</span>
          </button>
        </div>

        {/* Score & High Score */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-xl shadow-lg backdrop-blur-md text-right">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 flex items-center justify-end gap-1 font-semibold">
              <Trophy className="w-3 h-3 text-amber-400" />
              Best Score
            </div>
            <div className="text-sm font-mono font-bold text-amber-400">
              {highScore.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-cyan-500/40 px-4 py-1.5 rounded-xl shadow-lg backdrop-blur-md text-right">
            <div className="text-[9px] uppercase tracking-wider text-cyan-400 font-bold">
              Total Score
            </div>
            <div className="text-xl font-mono font-extrabold text-white tracking-wide">
              {totalScore.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* --- AIRTIME TRICK DISPLAY (Anchored at TOP-CENTER under header, NEVER blocking car!) --- */}
      {isAirborne && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150 pointer-events-none z-30">
          {/* Air status pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-400/60 text-cyan-300 text-xs font-bold tracking-wider uppercase backdrop-blur-md shadow-lg shadow-cyan-500/20">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            AIRTIME: {stuntState.airtimeSeconds.toFixed(1)}s &bull; ALT: ▲ {stuntState.apexHeightMeters.toFixed(1)}m
          </div>

          {/* Current Combo & Multiplier Banner */}
          <div className="flex items-center gap-3 bg-slate-950/95 border border-cyan-400 px-5 py-1.5 rounded-2xl shadow-2xl backdrop-blur-md">
            <div className="text-2xl font-display font-black text-cyan-300 tracking-wider">
              +{stuntState.totalPendingScore.toLocaleString()} PTS
            </div>
            <div className="px-2 py-0.5 rounded-md bg-cyan-500 text-slate-950 font-black text-xs tracking-wide shadow-md">
              x{stuntState.comboMultiplier.toFixed(1)}
            </div>
          </div>

          {/* Completed Tricks Ticker */}
          <div className="flex flex-wrap justify-center gap-1 max-w-lg">
            {stuntState.currentTricks.map((trick) => (
              <div
                key={trick.id}
                className="px-2 py-0.5 rounded-md bg-slate-900/95 border border-amber-400/60 text-amber-300 text-[11px] font-bold font-display tracking-wide shadow-sm"
              >
                {trick.name} <span className="text-slate-400 font-normal">+{trick.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- LANDING RESULT BANNER (Anchored at TOP-CENTER, never blocking vehicle) --- */}
      {!isAirborne && landingResult && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div
            className={`flex flex-col items-center px-6 py-3 rounded-2xl border-2 backdrop-blur-xl shadow-2xl transition-all transform animate-in zoom-in-95 duration-200 ${
              landingResult.grade === 'perfect' || landingResult.grade === 'recovery'
                ? 'bg-emerald-950/95 border-emerald-400 text-emerald-300 shadow-emerald-500/30'
                : landingResult.grade === 'great'
                ? 'bg-cyan-950/95 border-cyan-400 text-cyan-300 shadow-cyan-500/30'
                : landingResult.grade === 'tumble'
                ? 'bg-purple-950/95 border-purple-400 text-purple-300 shadow-purple-500/30 animate-pulse'
                : landingResult.grade === 'rough'
                ? 'bg-amber-950/95 border-amber-400 text-amber-300 shadow-amber-500/30'
                : 'bg-rose-950/95 border-rose-500 text-rose-300 shadow-rose-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {(landingResult.grade === 'perfect' || landingResult.grade === 'recovery') && <Award className="w-5 h-5 text-emerald-400" />}
              {landingResult.grade === 'great' && <CheckCircle className="w-5 h-5 text-cyan-400" />}
              {landingResult.grade === 'tumble' && <Zap className="w-5 h-5 text-purple-400" />}
              {landingResult.grade === 'rough' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {landingResult.grade === 'crash' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
              <div className="text-lg font-display font-black tracking-widest uppercase">
                {landingResult.message}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-0.5 text-xs font-semibold">
              {landingResult.grade !== 'tumble' && (
                <span>Deviation: {landingResult.alignmentAngleDeg.toFixed(1)}°</span>
              )}
              {landingResult.scoreMultiplier > 0 && (
                <span>Multiplier: x{landingResult.scoreMultiplier.toFixed(1)}</span>
              )}
            </div>

            {landingResult.bonusPoints > 0 && (
              <div className="text-sm font-mono font-bold mt-0.5 text-white">
                +{landingResult.bonusPoints.toLocaleString()} Bonus Points Banked!
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CRASH / WIPEOUT BANNER --- */}
      {isCrashed && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <div className="flex flex-col items-center bg-rose-950/95 border-2 border-rose-500 px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md text-center">
            <div className="text-lg font-display font-black text-rose-300">WIPEOUT! VEHICLE CRASHED</div>
            <div className="text-xs text-rose-200 mt-0.5">Landed inverted or at severe angle.</div>
            <button
              onClick={onResetVehicle}
              className="mt-2.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Respawn Vehicle (R)
            </button>
          </div>
        </div>
      )}

      {/* --- PROMINENT AIRTIME & FLIP CONTROLS GUIDE (Top Left overlay, toggleable) --- */}
      {showControlsGuide && (
        <div className="absolute top-18 left-4 pointer-events-auto bg-slate-950/95 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-xl max-w-xs text-xs text-slate-200 z-30">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-display font-bold text-cyan-400 text-xs tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              FLIP & SPIN CONTROLS
            </span>
            <button
              onClick={() => setShowControlsGuide(false)}
              className="text-slate-500 hover:text-slate-300 text-xs cursor-pointer px-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            {/* Frontflip / Backflip */}
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Frontflip (Pitch Down)</span>
              <div className="flex items-center gap-1 font-mono">
                <span className={`px-1.5 py-0.5 rounded font-bold border transition-colors ${isKeyActive('KeyW') || isKeyActive('ArrowUp') ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-800 border-slate-700 text-cyan-300'}`}>W</span>
                <span className="text-slate-500">/</span>
                <span className={`px-1.5 py-0.5 rounded font-bold border transition-colors ${isKeyActive('ArrowUp') ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-800 border-slate-700 text-cyan-300'}`}>↑</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">Backflip (Pitch Up)</span>
              <div className="flex items-center gap-1 font-mono">
                <span className={`px-1.5 py-0.5 rounded font-bold border transition-colors ${isKeyActive('KeyS') || isKeyActive('ArrowDown') ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-800 border-slate-700 text-cyan-300'}`}>S</span>
                <span className="text-slate-500">/</span>
                <span className={`px-1.5 py-0.5 rounded font-bold border transition-colors ${isKeyActive('ArrowDown') ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-800 border-slate-700 text-cyan-300'}`}>↓</span>
              </div>
            </div>

            {/* Flatspin */}
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Flatspin Left / Right</span>
              <div className="flex items-center gap-1 font-mono">
                <span className={`px-1.5 py-0.5 rounded font-bold border transition-colors ${isKeyActive('KeyA') || isKeyActive('ArrowLeft') ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 border-slate-700 text-amber-300'}`}>A</span>
                <span className={`px-1.5 py-0.5 rounded font-bold border transition-colors ${isKeyActive('KeyD') || isKeyActive('ArrowRight') ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 border-slate-700 text-amber-300'}`}>D</span>
              </div>
            </div>

            {/* Barrel Roll */}
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Barrel Roll (Roll)</span>
              <div className="flex items-center gap-1 font-mono">
                <span className={`px-1.5 py-0.5 rounded font-bold border transition-colors ${isKeyActive('KeyQ') ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 border-slate-700 text-purple-300'}`}>Q</span>
                <span className={`px-1.5 py-0.5 rounded font-bold border transition-colors ${isKeyActive('KeyE') ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 border-slate-700 text-purple-300'}`}>E</span>
              </div>
            </div>

            {/* Air Brake */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-amber-300 font-semibold">Freeze Spin / Level</span>
              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border transition-colors ${isKeyActive('Space') ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 border-slate-700 text-amber-300'}`}>SPACE</span>
            </div>

            {/* Boost */}
            <div className="flex items-center justify-between">
              <span className="text-cyan-300 font-semibold">Nitro Thruster</span>
              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border transition-colors ${isKeyActive('ShiftLeft') || isKeyActive('ShiftRight') ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-800 border-slate-700 text-cyan-300'}`}>SHIFT</span>
            </div>
          </div>
        </div>
      )}

      {/* --- BOTTOM HUD: INSTRUMENT CLUSTER (Bottom Left) & VIRTUAL GAMEPAD (Bottom Right) --- */}
      {/* 100% of the center viewport is completely unobstructed for the 3D car! */}
      <div className="flex items-end justify-between w-full max-w-6xl mx-auto pb-14 pointer-events-auto">
        {/* Left: Combined Instrument Cluster (Speedometer, Nitro, and Compact Attitude Horizon) */}
        <div className="flex items-center gap-2.5">
          {/* Speedometer & Nitro Card */}
          <div className="bg-slate-900/95 border border-slate-800 p-3 rounded-2xl shadow-xl backdrop-blur-md flex flex-col gap-1.5 w-44">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Speed</div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-mono font-black text-cyan-400">
                  {Math.round(speedKmh)}
                </span>
                <span className="text-xs text-slate-400 font-semibold">KM/H</span>
              </div>
            </div>

            {/* Nitro Fuel Bar */}
            <div>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                <span className="flex items-center gap-1 text-cyan-300">
                  <Flame className="w-3 h-3 text-cyan-400" /> Nitro
                </span>
                <span className="font-mono text-cyan-300">{Math.round(nitroFuel)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-75"
                  style={{ width: `${nitroFuel}%` }}
                />
              </div>
            </div>
          </div>

          {/* Compact Gyro Attitude Horizon (Docked cleanly in instrument cluster, NEVER in center!) */}
          <div className="bg-slate-900/95 border border-slate-800 p-2 rounded-2xl shadow-xl backdrop-blur-md flex flex-col items-center">
            <div className="text-[9px] font-bold text-slate-400 tracking-wider mb-1 flex items-center gap-1">
              <Compass className="w-3 h-3 text-cyan-400" />
              ATTITUDE
            </div>
            <div className="relative w-16 h-16 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden">
              <div
                className="absolute w-24 h-24 bg-gradient-to-b from-sky-500/30 via-transparent to-amber-700/40 transition-transform duration-75"
                style={{
                  transform: `rotate(${-attitude.rollDeg}deg) translateY(${Math.sin((attitude.pitchDeg * Math.PI) / 180) * 16}px)`,
                }}
              />
              <div className="absolute w-8 h-0.5 bg-cyan-400 shadow-sm" />
              <div className="absolute h-3 w-0.5 bg-cyan-400 shadow-sm" />
              <div className="absolute w-1.5 h-1.5 rounded-full border border-cyan-400" />
            </div>
            <div className="flex items-center gap-2 text-[9px] font-mono text-slate-300 mt-1">
              <span>P:{Math.round(attitude.pitchDeg)}°</span>
              <span>R:{Math.round(attitude.rollDeg)}°</span>
            </div>
          </div>
        </div>

        {/* Right: Touch / Virtual Gamepad Buttons for Mobile & Mouse */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Virtual Flip Up / Down buttons */}
          <div className="flex flex-col gap-1.5">
            <button
              onPointerDown={() => onVirtualInput('KeyW', true)}
              onPointerUp={() => onVirtualInput('KeyW', false)}
              onPointerLeave={() => onVirtualInput('KeyW', false)}
              className="flex items-center justify-center w-12 h-10 rounded-xl bg-slate-900/90 border border-cyan-500/40 active:bg-cyan-500 active:text-slate-950 text-cyan-300 shadow-lg cursor-pointer"
              title="Frontflip (W)"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              onPointerDown={() => onVirtualInput('KeyS', true)}
              onPointerUp={() => onVirtualInput('KeyS', false)}
              onPointerLeave={() => onVirtualInput('KeyS', false)}
              className="flex items-center justify-center w-12 h-10 rounded-xl bg-slate-900/90 border border-cyan-500/40 active:bg-cyan-500 active:text-slate-950 text-cyan-300 shadow-lg cursor-pointer"
              title="Backflip (S)"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>

          {/* Virtual Flatspin Left / Right */}
          <div className="flex gap-1.5">
            <button
              onPointerDown={() => onVirtualInput('KeyA', true)}
              onPointerUp={() => onVirtualInput('KeyA', false)}
              onPointerLeave={() => onVirtualInput('KeyA', false)}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900/90 border border-amber-500/40 active:bg-amber-500 active:text-slate-950 text-amber-300 shadow-lg cursor-pointer"
              title="Spin Left (A)"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onPointerDown={() => onVirtualInput('KeyD', true)}
              onPointerUp={() => onVirtualInput('KeyD', false)}
              onPointerLeave={() => onVirtualInput('KeyD', false)}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900/90 border border-amber-500/40 active:bg-amber-500 active:text-slate-950 text-amber-300 shadow-lg cursor-pointer"
              title="Spin Right (D)"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Air Brake / Handbrake Button */}
          <button
            onPointerDown={() => onVirtualInput('Space', true)}
            onPointerUp={() => onVirtualInput('Space', false)}
            onPointerLeave={() => onVirtualInput('Space', false)}
            className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/90 border border-amber-500/50 active:bg-amber-500 active:text-slate-950 text-amber-300 shadow-xl backdrop-blur-md cursor-pointer transition-all select-none"
            title="Air Brake / Gyro Stabilizer"
          >
            <Zap className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold">AIR BRAKE</span>
          </button>

          {/* Nitro Boost Button */}
          <button
            onPointerDown={() => onVirtualInput('ShiftLeft', true)}
            onPointerUp={() => onVirtualInput('ShiftLeft', false)}
            onPointerLeave={() => onVirtualInput('ShiftLeft', false)}
            className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/90 border border-cyan-500/50 active:bg-cyan-500 active:text-slate-950 text-cyan-300 shadow-xl backdrop-blur-md cursor-pointer transition-all select-none"
            title="Nitro Boost"
          >
            <Flame className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold">BOOST</span>
          </button>
        </div>
      </div>
    </div>
  );
};
