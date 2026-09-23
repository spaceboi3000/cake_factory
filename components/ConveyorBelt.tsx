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

      {/* Bakery Stage: Clean top dispensers, conveyor belt, and rotating cylinders (Nothing below) */}
      <div
        className="relative w-full h-[520px] rounded-2xl border-4 border-[#c084fc] flex flex-col justify-between overflow-hidden shadow-inner bg-cover bg-center"
        style={{ backgroundImage: `url('/sprites/purble_background.png')` }}
      >
        {/* Top Zone: Overhead Dispensers & Order Screen */}
        <div className="w-full pt-4 px-8 flex justify-between items-start z-10 select-none">
          {/* Order Screen (TV Monitor) */}
          <div className="flex flex-col items-center">
            <img
              src="/sprites/order_tv.png"
              alt="Order TV"
              className="w-36 h-28 object-contain filter drop-shadow-lg"
            />
          </div>

          {/* Overhead Dispensers */}
          <div className="flex gap-8 items-start">
            <div className="flex flex-col items-center hover:scale-105 transition-transform">
              <img
                src="/sprites/dispenser_batter.png"
                alt="Batter Dispenser"
                className="w-32 h-40 object-contain filter drop-shadow-xl"
              />
            </div>

            <div className="flex flex-col items-center hover:scale-105 transition-transform">
              <img
                src="/sprites/dispenser_icing.png"
                alt="Icing Dispenser"
                className="w-32 h-40 object-contain filter drop-shadow-xl"
              />
            </div>

            <div className="flex flex-col items-center hover:scale-105 transition-transform">
              <img
                src="/sprites/dispenser_sprinkles.png"
                alt="Sprinkle Dispenser"
                className="w-32 h-40 object-contain filter drop-shadow-xl"
              />
            </div>
          </div>

          {/* Current Frequency Pill */}
          <div className="bg-white/85 backdrop-blur-sm border-2 border-purple-300 rounded-2xl px-4 py-2 flex flex-col items-center shadow-lg">
            <span className="text-[10px] font-mono font-bold text-purple-800">FREQUENCY</span>
            <span className="text-xl font-black font-mono text-purple-900">{clockSpeed.toFixed(2)} GHz</span>
          </div>
        </div>

        {/* Thermal Throttling Warning Overlay */}
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

        {/* Conveyor Belt Assembly (Exact bottom of the stage - nothing below) */}
        <div className="w-full flex flex-col justify-end relative z-20">

          {/* Original Moving Cakes: Clean, Non-Layered Cakes from First Version */}
          <div className="relative h-28 overflow-hidden pointer-events-none w-full">
            <div
              className="flex items-end w-[300%] absolute left-0 bottom-0"
              style={{
                animationName: 'cakeScroll',
                animationDuration: `${animationDurationSeconds}s`,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                animationPlayState: isDead ? 'paused' : 'running',
              }}
            >
              {[...Array(24)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-24 flex flex-col items-center justify-end pb-1.5">
                  <span className="text-4xl md:text-5xl filter drop-shadow-lg select-none transform transition-transform hover:scale-110">
                    {i % 3 === 0 ? '🎂' : i % 3 === 1 ? '🧁' : '🍰'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600 font-bold mt-1 bg-white/85 px-2 py-0.5 rounded-full shadow-sm border border-slate-200">
                    PKG#{100 + (i % 12)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Conveyor Belt Surface (Dark Rubber Tread with 96px Repeat) */}
          <div
            className="w-full h-16 border-y-2 border-slate-700 relative z-10"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 48px, #334155 48px, #334155 96px)`,
              backgroundSize: '96px 100%',
              animationName: 'beltScroll',
              animationDuration: `${animationDurationSeconds}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationPlayState: isDead ? 'paused' : 'running',
            }}
          />

          {/* Conveyor Mechanical Cylinders / Rollers (Re-added, rotating directly under the belt) */}
          <div className="h-8 w-full bg-slate-800 border-t-2 border-slate-700 flex justify-between items-center px-6">
            {[...Array(14)].map((_, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full bg-gradient-to-tr from-slate-400 via-slate-100 to-slate-400 border border-slate-600 relative flex items-center justify-center shadow-md"
                style={{
                  animationName: 'spinRoller',
                  animationDuration: `${animationDurationSeconds}s`,
                  animationTimingFunction: 'linear',
                  animationIterationCount: 'infinite',
                  animationPlayState: isDead ? 'paused' : 'running',
                }}
              >
                <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Embedded Dynamic CSS Keyframes: Exact 96px seamless loops */}
      <style jsx>{`
        @keyframes cakeScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-96px);
          }
        }
        @keyframes beltScroll {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: -96px 0;
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
