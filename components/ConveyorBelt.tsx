'use client';

import React from 'react';

interface ConveyorBeltProps {
  clockSpeed: number;
  powerHeat: number;
  isDead: boolean;
}

export default function ConveyorBelt({ clockSpeed, powerHeat, isDead }: ConveyorBeltProps) {
  // Speed is inversely proportional to animation duration.
  // At 1.0 GHz -> 1.5s per cycle; at 5.0 GHz -> 0.3s per cycle.
  const animationDurationSeconds = Math.max(0.15, 1.5 / Math.max(1.0, clockSpeed));

  // Determine power heat bar color and visual pulse
  const getHeatBarStyle = () => {
    if (powerHeat < 50) {
      return {
        barClass: 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]',
        textClass: 'text-emerald-400',
        label: 'NOMINAL DISSIPATION',
      };
    }
    if (powerHeat <= 80) {
      return {
        barClass: 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]',
        textClass: 'text-amber-400',
        label: 'ELEVATED THERMAL LOAD',
      };
    }
    return {
      barClass: 'bg-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.8)]',
      textClass: 'text-red-400 font-bold animate-pulse',
      label: 'CRITICAL OVERHEATING (P ∝ f³)',
    };
  };

  const heatStyle = getHeatBarStyle();

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl overflow-hidden flex flex-col gap-6 relative">
      {/* Thermal & Dynamic Power Dissipation Header */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs tracking-wider font-mono">
          <span className="text-slate-400 flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                powerHeat > 80 ? 'bg-red-500 animate-ping' : powerHeat > 50 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
            />
            THERMAL POWER DISSIPATION (P = C · V² · f)
          </span>
          <span className={heatStyle.textClass}>
            {heatStyle.label} — {powerHeat.toFixed(1)}%
          </span>
        </div>

        {/* Heat Progress Bar */}
        <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${heatStyle.barClass}`}
            style={{ width: `${Math.min(100, Math.max(2, powerHeat))}%` }}
          />
        </div>
      </div>

      {/* Industrial Conveyor Visual Assembly */}
      <div className="relative w-full h-48 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-end overflow-hidden shadow-inner">
        {/* Steam / Heat Haze Overlay when > 80% */}
        {powerHeat > 80 && !isDead && (
          <div className="absolute inset-0 bg-red-500/10 pointer-events-none z-10 animate-pulse flex items-center justify-center">
            <span className="text-red-400/30 text-4xl font-black tracking-widest uppercase select-none">
              THERMAL THROTTLING
            </span>
          </div>
        )}

        {/* Moving Cakes Layer */}
        <div className="absolute top-8 left-0 right-0 h-16 overflow-hidden pointer-events-none z-10">
          <div
            className="flex items-center gap-20 w-[200%] absolute left-0"
            style={{
              animationName: 'conveyorScroll',
              animationDuration: `${animationDurationSeconds}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationPlayState: isDead ? 'paused' : 'running',
            }}
          >
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-3xl filter drop-shadow-md select-none">
                  {i % 3 === 0 ? '🎂' : i % 3 === 1 ? '🧁' : '🍰'}
                </span>
                <span className="text-[10px] font-mono text-slate-500 mt-1">PKG#{100 + i}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conveyor Belt Surface (Uses seamless texture with inline CSS pattern fallback) */}
        <div
          className="w-full h-14 border-t-2 border-slate-700 relative z-0"
          style={{
            backgroundImage: `url('/conveyor.png'), repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 24px, #334155 24px, #334155 48px)`,
            backgroundSize: '48px 100%',
            animationName: 'conveyorScroll',
            animationDuration: `${animationDurationSeconds}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationPlayState: isDead ? 'paused' : 'running',
          }}
        />

        {/* Conveyor Mechanical Rollers */}
        <div className="h-6 w-full bg-slate-900 border-t border-slate-800 flex justify-between items-center px-4">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-slate-700 border border-slate-600 relative flex items-center justify-center"
              style={{
                animationName: 'spinRoller',
                animationDuration: `${animationDurationSeconds}s`,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                animationPlayState: isDead ? 'paused' : 'running',
              }}
            >
              <div className="w-1 h-1 bg-slate-900 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Embedded Dynamic CSS Keyframes */}
      <style jsx>{`
        @keyframes conveyorScroll {
          0% {
            transform: translateX(0);
            background-position: 0 0;
          }
          100% {
            transform: translateX(-48px);
            background-position: -48px 0;
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

