import React, { useState } from 'react';
import { VehiclePhysicsConfig } from '../physics/airtimePhysics';
import { COLOR_PRESETS } from '../vehicle/vehicleModel';
import {
  Sliders,
  Car,
  Zap,
  Gauge,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Compass,
  Rocket
} from 'lucide-react';

interface ControlDockProps {
  config: VehiclePhysicsConfig;
  onUpdateConfig: (newConfig: VehiclePhysicsConfig) => void;
  selectedColorIndex: number;
  onSelectColorIndex: (index: number) => void;
  timeScale: number;
  onChangeTimeScale: (scale: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onResetVehicle: () => void;
  onLaunchJump: () => void;
  airRollMode: 'keys_qe' | 'keys_ad';
  onToggleAirRollMode: (mode: 'keys_qe' | 'keys_ad') => void;
  cameraMode: 'chase' | 'orbit' | 'hood' | 'cinematic';
  onChangeCameraMode: (mode: 'chase' | 'orbit' | 'hood' | 'cinematic') => void;
  telemetry: {
    wx: number;
    wy: number;
    wz: number;
    pitchDeg: number;
    rollDeg: number;
    yawDeg: number;
    angularMomentum: number;
  };
}

export const ControlDock: React.FC<ControlDockProps> = ({
  config,
  onUpdateConfig,
  selectedColorIndex,
  onSelectColorIndex,
  timeScale,
  onChangeTimeScale,
  isMuted,
  onToggleMute,
  onResetVehicle,
  onLaunchJump,
  airRollMode,
  onToggleAirRollMode,
  cameraMode,
  onChangeCameraMode,
  telemetry,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'physics' | 'vehicle' | 'controls' | 'telemetry'>('physics');

  const handleSliderChange = (key: keyof VehiclePhysicsConfig, value: number) => {
    onUpdateConfig({
      ...config,
      [key]: value,
    });
  };

  const applyPreset = (presetName: 'arcade' | 'realistic' | 'hyper_spinner' | 'heavy_truck') => {
    if (presetName === 'arcade') {
      onUpdateConfig({
        ...config,
        pitchTorque: 16500,
        rollTorque: 14500,
        yawTorque: 13500,
        angularDamping: 0.6,
        airBrakePower: 7.5,
        inertiaPitch: 1000,
        inertiaYaw: 1200,
        inertiaRoll: 500,
        enableGyroscopicPrecession: false,
        autoLevelAssist: false,
      });
    } else if (presetName === 'realistic') {
      onUpdateConfig({
        ...config,
        pitchTorque: 13500,
        rollTorque: 11500,
        yawTorque: 10500,
        angularDamping: 0.75,
        airBrakePower: 6.5,
        inertiaPitch: 1200,
        inertiaYaw: 1400,
        inertiaRoll: 650,
        enableGyroscopicPrecession: true,
        autoLevelAssist: false,
      });
    } else if (presetName === 'hyper_spinner') {
      onUpdateConfig({
        ...config,
        pitchTorque: 21000,
        rollTorque: 19000,
        yawTorque: 18000,
        angularDamping: 0.35,
        airBrakePower: 8.5,
        inertiaPitch: 800,
        inertiaYaw: 900,
        inertiaRoll: 400,
        enableGyroscopicPrecession: true,
        autoLevelAssist: false,
      });
    } else if (presetName === 'heavy_truck') {
      onUpdateConfig({
        ...config,
        pitchTorque: 10500,
        rollTorque: 9000,
        yawTorque: 8000,
        angularDamping: 0.9,
        airBrakePower: 5.5,
        inertiaPitch: 1800,
        inertiaYaw: 2200,
        inertiaRoll: 1000,
        enableGyroscopicPrecession: true,
        autoLevelAssist: false,
      });
    }
  };

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-3 transition-transform duration-300 ease-out ${
        isCollapsed ? 'translate-y-[calc(100%-2.25rem)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse / Expand Toggle Button */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-4 py-1 rounded-t-lg bg-slate-900/90 border-t border-x border-slate-700/60 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer shadow-lg backdrop-blur-md"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Show Physics & Stunt Dock (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Hide Dock (Cinema Mode)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Glassmorphic Dock Container */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl text-slate-200">
        {/* Navigation Tabs & Quick Action Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('physics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'physics'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Airtime Torque Lab
            </button>

            <button
              onClick={() => setActiveTab('vehicle')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'vehicle'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              Vehicle & Look
            </button>

            <button
              onClick={() => setActiveTab('controls')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'controls'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Camera & Inputs
            </button>

            <button
              onClick={() => setActiveTab('telemetry')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'telemetry'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              Gyro Telemetry
            </button>
          </div>

          {/* Quick Play Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onLaunchJump}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-600/30 transition-all cursor-pointer"
              title="Instant Mega Ramp Launch"
            >
              <Rocket className="w-3.5 h-3.5" />
              MEGA LAUNCH
            </button>

            <button
              onClick={onResetVehicle}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition-colors cursor-pointer"
              title="Reset Position (R)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset (R)
            </button>

            <button
              onClick={onToggleMute}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="pt-3">
          {/* TAB 1: AIRTIME PHYSICS & TORQUE LAB */}
          {activeTab === 'physics' && (
            <div className="space-y-3">
              {/* Preset Selector */}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="text-slate-400 font-medium">Physics Profiles:</span>
                <button
                  onClick={() => applyPreset('arcade')}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium border border-slate-700"
                >
                  ⚡ Agile Arcade
                </button>
                <button
                  onClick={() => applyPreset('realistic')}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-medium border border-slate-700"
                >
                  ⚖️ Balanced Physics
                </button>
                <button
                  onClick={() => applyPreset('hyper_spinner')}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium border border-slate-700"
                >
                  🌪️ High-Rev Spinner
                </button>
                <button
                  onClick={() => applyPreset('heavy_truck')}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-medium border border-slate-700"
                >
                  🚜 Heavy Trophy Truck
                </button>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Pitch Torque */}
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 font-semibold">Pitch Torque (Flips)</span>
                    <span className="font-mono text-cyan-400 font-bold">{config.pitchTorque} N·m</span>
                  </div>
                  <input
                    type="range"
                    min="2000"
                    max="10000"
                    step="200"
                    value={config.pitchTorque}
                    onChange={(e) => handleSliderChange('pitchTorque', Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">Controls front/backflip rotation power (W/S)</div>
                </div>

                {/* Roll Torque */}
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 font-semibold">Roll Torque (Barrel)</span>
                    <span className="font-mono text-cyan-400 font-bold">{config.rollTorque} N·m</span>
                  </div>
                  <input
                    type="range"
                    min="1500"
                    max="9000"
                    step="200"
                    value={config.rollTorque}
                    onChange={(e) => handleSliderChange('rollTorque', Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">Controls barrel roll agility (Q/E or Roll mode)</div>
                </div>

                {/* Yaw Torque */}
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 font-semibold">Yaw Torque (Spins)</span>
                    <span className="font-mono text-cyan-400 font-bold">{config.yawTorque} N·m</span>
                  </div>
                  <input
                    type="range"
                    min="1500"
                    max="8000"
                    step="200"
                    value={config.yawTorque}
                    onChange={(e) => handleSliderChange('yawTorque', Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">Controls flatspin rotation speed (A/D)</div>
                </div>

                {/* Air Damping / Air Brake */}
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 font-semibold">Air Stabilizer Brake</span>
                    <span className="font-mono text-cyan-400 font-bold">{config.airBrakePower}x</span>
                  </div>
                  <input
                    type="range"
                    min="2.0"
                    max="10.0"
                    step="0.5"
                    value={config.airBrakePower}
                    onChange={(e) => handleSliderChange('airBrakePower', Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">Hold Space mid-air to halt rotation & line up landing</div>
                </div>
              </div>

              {/* Toggles row */}
              <div className="flex items-center gap-4 text-xs pt-1 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.enableGyroscopicPrecession}
                    onChange={(e) =>
                      onUpdateConfig({ ...config, enableGyroscopicPrecession: e.target.checked })
                    }
                    className="accent-cyan-500 rounded cursor-pointer"
                  />
                  <span className="text-slate-300">Euler Gyroscopic Cross-Coupling (Realistic multi-axis precession)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.autoLevelAssist}
                    onChange={(e) =>
                      onUpdateConfig({ ...config, autoLevelAssist: e.target.checked })
                    }
                    className="accent-cyan-500 rounded cursor-pointer"
                  />
                  <span className="text-slate-300">Auto-Level Assist (Assists landing angle alignment)</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: VEHICLE & LOOK */}
          {activeTab === 'vehicle' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 font-medium">Select Vehicle Livery & Accent:</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {COLOR_PRESETS.map((preset, idx) => (
                  <button
                    key={preset.name}
                    onClick={() => onSelectColorIndex(idx)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      selectedColorIndex === idx
                        ? 'bg-slate-800 border-cyan-400 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-white/20 shrink-0 shadow-sm"
                      style={{ backgroundColor: `#${preset.colors.body.toString(16).padStart(6, '0')}` }}
                    />
                    <div className="font-semibold text-slate-200">{preset.name}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 font-semibold">Engine Acceleration</span>
                    <span className="font-mono text-amber-400 font-bold">{config.enginePower} kN</span>
                  </div>
                  <input
                    type="range"
                    min="25"
                    max="65"
                    step="2"
                    value={config.enginePower}
                    onChange={(e) => handleSliderChange('enginePower', Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 font-semibold">Ramp Pop Boost</span>
                    <span className="font-mono text-amber-400 font-bold">+{config.rampPopBoost} m/s</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="8.0"
                    step="0.5"
                    value={config.rampPopBoost}
                    onChange={(e) => handleSliderChange('rampPopBoost', Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTROLS & CAMERA */}
          {activeTab === 'controls' && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Camera Mode */}
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="text-slate-300 font-semibold">Camera Mode</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['chase', 'orbit', 'hood', 'cinematic'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => onChangeCameraMode(mode)}
                        className={`px-2 py-1.5 rounded-lg font-medium text-[11px] capitalize cursor-pointer transition-colors ${
                          cameraMode === mode
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Air Roll Mapping */}
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="text-slate-300 font-semibold">Mid-Air Roll Mapping</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => onToggleAirRollMode('keys_qe')}
                      className={`px-2 py-1.5 rounded-lg font-medium text-[11px] cursor-pointer transition-colors ${
                        airRollMode === 'keys_qe'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Q/E Keys (Pro 3-Axis)
                    </button>
                    <button
                      onClick={() => onToggleAirRollMode('keys_ad')}
                      className={`px-2 py-1.5 rounded-lg font-medium text-[11px] cursor-pointer transition-colors ${
                        airRollMode === 'keys_ad'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      A/D Keys (Arcade Roll)
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Pro mode gives full independent control of pitch, roll, and flat spin!
                  </div>
                </div>

                {/* Slow-Mo Time Scale */}
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="text-slate-300 font-semibold">Time Scale (Slow-Mo)</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: 'Normal (1x)', val: 1.0 },
                      { label: 'Half (0.5x)', val: 0.5 },
                      { label: 'Slomo (0.25x)', val: 0.25 },
                    ].map((item) => (
                      <button
                        key={item.val}
                        onClick={() => onChangeTimeScale(item.val)}
                        className={`px-1.5 py-1.5 rounded-lg font-medium text-[10px] cursor-pointer transition-colors ${
                          timeScale === item.val
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-500">Slow down time mid-air to pull off precision combos!</div>
                </div>
              </div>

              {/* Controls Cheatsheet */}
              <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
                <div><span className="font-mono text-cyan-400 font-bold">W / S</span>: Pitch Flips (Backflip/Frontflip)</div>
                <div><span className="font-mono text-cyan-400 font-bold">A / D</span>: Yaw Flatspins (or Roll)</div>
                <div><span className="font-mono text-cyan-400 font-bold">Q / E</span>: Barrel Rolls</div>
                <div><span className="font-mono text-cyan-400 font-bold">SPACE</span>: Air Brake / Stabilizer (Freeze Spin)</div>
                <div><span className="font-mono text-cyan-400 font-bold">SHIFT</span>: Nitro Boost / Auto-Level</div>
                <div><span className="font-mono text-cyan-400 font-bold">R</span>: Quick Respawn</div>
              </div>
            </div>
          )}

          {/* TAB 4: GYRO TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">PITCH ROTATION</div>
                <div className="text-base font-mono font-bold text-cyan-300">
                  {Math.round(telemetry.pitchDeg)}°
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  ωx: {telemetry.wx.toFixed(2)} rad/s
                </div>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">ROLL ROTATION</div>
                <div className="text-base font-mono font-bold text-amber-300">
                  {Math.round(telemetry.rollDeg)}°
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  ωz: {telemetry.wz.toFixed(2)} rad/s
                </div>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">YAW FLATSPIN</div>
                <div className="text-base font-mono font-bold text-emerald-300">
                  {Math.round(telemetry.yawDeg)}°
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  ωy: {telemetry.wy.toFixed(2)} rad/s
                </div>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">ANGULAR MOMENTUM |L|</div>
                <div className="text-base font-mono font-bold text-indigo-300">
                  {Math.round(telemetry.angularMomentum)} <span className="text-[10px] text-slate-400">N·m·s</span>
                </div>
                <div className="text-[10px] text-slate-500">Rigid Body Inertia Tensor</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
