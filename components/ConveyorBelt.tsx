'use client';

import React from 'react';

interface ConveyorBeltProps {
  clockSpeed: number;
  powerHeat: number;
  isDead: boolean;
  onSetSpeed?: (speed: number) => void;
}

export default function ConveyorBelt({ clockSpeed, powerHeat, isDead, onSetSpeed }: ConveyorBeltProps) {
  // Speed is inversely proportional to animation duration.
  // At 1.0 GHz -> 1.5s per cycle; at 5.0 GHz -> 0.3s per cycle.
  const animationDurationSeconds = Math.max(0.15, 1.5 / Math.max(1.0, clockSpeed));

  // Determine power heat bar color and visual pulse (preserving exact gauge names & labels)
  const getHeatBarStyle = () => {
    if (powerHeat < 50) {
      return {
        barClass: 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]',
        textClass: 'text-emerald-700 font-bold',
        dotClass: 'bg-emerald-500',
        label: 'NOMINAL DISSIPATION',
      };
    }
    if (powerHeat <= 80) {
      return {
        barClass: 'bg-gradient-to-r from-amber-400 to-orange-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]',
        textClass: 'text-amber-700 font-bold',
        dotClass: 'bg-amber-400',
        label: 'ELEVATED THERMAL LOAD',
      };
    }
    return {
      barClass: 'bg-gradient-to-r from-rose-500 to-red-600 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.8)]',
      textClass: 'text-rose-600 font-black animate-pulse',
      dotClass: 'bg-rose-500 animate-ping',
      label: 'CRITICAL OVERHEATING (P ∝ f³)',
    };
  };

  const heatStyle = getHeatBarStyle();

  return (
    <div className="w-full bg-[#fdf2f8] border-4 border-[#e9d5ff] rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col gap-6 relative">
      {/* Thermal & Dynamic Power Dissipation Header (Exact Gauge Names Kept) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between items-center text-xs tracking-wider font-mono">
          <span className="text-slate-600 font-bold flex items-center gap-2">
            <span className={`inline-block w-3 h-3 rounded-full ${heatStyle.dotClass}`} />
            THERMAL POWER DISSIPATION (P = C · V² · f)
          </span>
          <span className={heatStyle.textClass}>
            {heatStyle.label} — {powerHeat.toFixed(1)}%
          </span>
        </div>

        {/* Heat Progress Bar */}
        <div className="w-full h-7 bg-slate-200/80 rounded-full overflow-hidden p-1 border-2 border-slate-300 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${heatStyle.barClass}`}
            style={{ width: `${Math.min(100, Math.max(2, powerHeat))}%` }}
          />
        </div>
      </div>

      {/* Massive Purble Place Bakery Stage (680px Height with Authentic In-Game Background) */}
      <div
        className="relative w-full h-[680px] rounded-2xl border-4 border-[#c084fc] flex flex-col justify-between overflow-hidden shadow-inner bg-cover bg-center"
        style={{ backgroundImage: `url('/sprites/purble_background.png')` }}
      >
        {/* Top Zone: Authentic Order Screen & Overhead Dispensers */}
        <div className="w-full pt-4 px-8 flex justify-between items-start z-10 select-none">
          {/* Order Screen (TV Monitor) */}
          <div className="flex flex-col items-center">
            <img
              src="/sprites/order_tv.png"
              alt="Order TV Screen"
              className="w-36 h-28 object-contain filter drop-shadow-lg"
            />
          </div>

          {/* Overhead Dispensers Rack */}
          <div className="flex gap-8 items-start">
            {/* Batter Dispenser */}
            <div className="flex flex-col items-center hover:scale-105 transition-transform">
              <img
                src="/sprites/dispenser_batter.png"
                alt="Batter Dispenser"
                className="w-32 h-40 object-contain filter drop-shadow-xl"
              />
            </div>

            {/* Icing Dispenser */}
            <div className="flex flex-col items-center hover:scale-105 transition-transform">
              <img
                src="/sprites/dispenser_icing.png"
                alt="Icing Dispenser"
                className="w-32 h-40 object-contain filter drop-shadow-xl"
              />
            </div>

            {/* Sprinkle Dispenser */}
            <div className="flex flex-col items-center hover:scale-105 transition-transform">
              <img
                src="/sprites/dispenser_sprinkles.png"
                alt="Sprinkle Dispenser"
                className="w-32 h-40 object-contain filter drop-shadow-xl"
              />
            </div>
          </div>

          {/* Current Speed Badge */}
          <div className="bg-white/85 backdrop-blur-sm border-2 border-purple-300 rounded-2xl px-4 py-2 flex flex-col items-center shadow-lg">
            <span className="text-[10px] font-mono font-bold text-purple-800">FREQUENCY</span>
            <span className="text-xl font-black font-mono text-purple-900">{clockSpeed.toFixed(2)} GHz</span>
          </div>
        </div>

        {/* Thermal Throttling Warning Overlay (Exact Name Kept) */}
        {powerHeat > 80 && !isDead && (
          <div className="absolute inset-0 bg-rose-500/25 backdrop-blur-[1px] pointer-events-none z-30 animate-pulse flex items-center justify-center">
            <div className="bg-rose-600/95 text-white border-2 border-white px-8 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
              <span className="text-3xl animate-spin">⚠️</span>
              <span className="text-2xl font-black tracking-widest font-mono uppercase">
                THERMAL THROTTLING
              </span>
            </div>
          </div>
        )}

        {/* Middle & Lower Stage: Conveyor Track & Console */}
        <div className="w-full flex flex-col justify-end relative z-20">

          {/* Moving Cakes Layer: 128px Repeat Period */}
          <div className="relative h-44 overflow-hidden pointer-events-none w-full">
            <div
              className="flex items-end w-[300%] absolute left-0 bottom-1"
              style={{
                animationName: 'cakeScroll',
                animationDuration: `${animationDurationSeconds}s`,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                animationPlayState: isDead ? 'paused' : 'running',
              }}
            >
              {[...Array(20)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-32 flex flex-col items-center justify-end pb-0.5">
                  {/* Layered Purble Place Cake Built with Authentic Sprites */}
                  <div className="flex flex-col items-center filter drop-shadow-lg select-none transform transition-transform">
                    {/* Topper: Authentic Smiley or Cherry */}
                    <img
                      src={i % 2 === 0 ? '/sprites/cake_topper_smiley.png' : '/sprites/cake_topper_strawberry.png'}
                      alt="Cake Topper"
                      className="w-10 h-10 object-contain -mb-1.5 z-10 filter drop-shadow-sm"
                    />
                    {/* Top Layer */}
                    <img
                      src="/sprites/cake_top_layer.png"
                      alt="Top Layer"
                      className="w-22 h-9 object-contain -mb-1"
                    />
                    {/* Cream Layer */}
                    <img
                      src="/sprites/cake_cream.png"
                      alt="Cream Layer"
                      className="w-24 h-5 object-contain -mb-1"
                    />
                    {/* Middle Layer */}
                    <img
                      src="/sprites/cake_middle_layer.png"
                      alt="Middle Layer"
                      className="w-26 h-9 object-contain -mb-1"
                    />
                    {/* Cream Layer */}
                    <img
                      src="/sprites/cake_cream.png"
                      alt="Cream Layer"
                      className="w-26 h-5 object-contain -mb-1"
                    />
                    {/* Bottom Layer */}
                    <img
                      src="/sprites/cake_bottom_layer.png"
                      alt="Bottom Layer"
                      className="w-28 h-10 object-contain"
                    />
                  </div>

                  {/* Scalloped Cake Doily / Plate */}
                  <img
                    src="/sprites/cake_plate.png"
                    alt="Cake Plate"
                    className="w-28 h-8 object-contain mt-0.5 filter drop-shadow-sm"
                  />
                </div>
              ))}
            </div>

            {/* Authentic Trash Chute on Right Edge */}
            <div className="absolute right-4 bottom-0 z-30 pointer-events-auto flex flex-col items-center">
              <img
                src="/sprites/trash_can.png"
                alt="Trash Chute"
                className="w-24 h-40 object-contain filter drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Conveyor Belt Surface (Repeating Authentic 128px Tread) */}
          <div
            className="w-full h-16 border-y-2 border-slate-600 relative z-10"
            style={{
              backgroundImage: `url('/sprites/conveyor_belt.png'), repeating-linear-gradient(90deg, #475569 0px, #475569 64px, #64748b 64px, #64748b 128px)`,
              backgroundSize: '128px 100%',
              animationName: 'beltScroll',
              animationDuration: `${animationDurationSeconds}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationPlayState: isDead ? 'paused' : 'running',
            }}
          />

          {/* Mechanical Rollers */}
          <div className="h-8 w-full bg-gradient-to-b from-slate-300 to-slate-400 border-b border-slate-400 flex justify-between items-center px-4">
            {[...Array(12)].map((_, i) => (
              <img
                key={i}
                src="/sprites/conveyor_roller.png"
                alt="Roller"
                className="w-6 h-6 object-contain shadow-sm"
                style={{
                  animationName: 'spinRoller',
                  animationDuration: `${animationDurationSeconds}s`,
                  animationTimingFunction: 'linear',
                  animationIterationCount: 'infinite',
                  animationPlayState: isDead ? 'paused' : 'running',
                }}
              />
            ))}
          </div>

          {/* Purble Place Authentic Control Console Lower Area */}
          <div className="w-full bg-[#f5f3ff]/95 border-t-4 border-[#c084fc] p-3 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Authentic Console Panel Graphic */}
            <div className="flex items-center gap-2">
              <img
                src="/sprites/console_panel.png"
                alt="Console Panel"
                className="max-h-24 max-w-full object-contain filter drop-shadow-md rounded-xl"
              />
            </div>

            {/* Authentic 3D Push Buttons (Green 1.0 GHz & Purple 5.0 GHz) */}
            <div className="flex items-center gap-5 bg-white/80 p-2.5 rounded-2xl border-2 border-purple-200 shadow-md">
              <button
                type="button"
                onClick={() => onSetSpeed && onSetSpeed(1.0)}
                className="flex flex-col items-center hover:scale-105 active:scale-95 transition-transform"
                title="Click for 1.0 GHz Baseline"
              >
                <img
                  src="/sprites/button_green.png"
                  alt="Green Button"
                  className="w-16 h-16 object-contain filter drop-shadow-md"
                />
                <span className="text-[10px] font-mono font-bold text-emerald-700 mt-1">1.0 GHz</span>
              </button>

              <button
                type="button"
                onClick={() => onSetSpeed && onSetSpeed(5.0)}
                className="flex flex-col items-center hover:scale-105 active:scale-95 transition-transform"
                title="Click for 5.0 GHz Turbo"
              >
                <img
                  src="/sprites/button_purple.png"
                  alt="Purple Button"
                  className="w-16 h-16 object-contain filter drop-shadow-md"
                />
                <span className="text-[10px] font-mono font-bold text-purple-700 mt-1">5.0 GHz</span>
              </button>
            </div>
          </div>

          {/* Purble Place Retro Black & White Checkered Kitchen Floor */}
          <div
            className="w-full h-10 border-t-2 border-slate-600"
            style={{
              backgroundImage: `repeating-conic-gradient(#1e293b 0% 25%, #f8fafc 0% 50%)`,
              backgroundSize: '36px 36px',
            }}
          />
        </div>
      </div>

      {/* Embedded Dynamic CSS Keyframes: Exact 128px seamless loops */}
      <style jsx>{`
        @keyframes cakeScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-128px);
          }
        }
        @keyframes beltScroll {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: -128px 0;
          }
        }
        @keyframes spinRoller {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
