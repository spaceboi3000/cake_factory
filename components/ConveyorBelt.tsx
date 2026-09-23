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

        {/* Heat Progress Bar - Glossy Purble Place style */}
        <div className="w-full h-6 bg-slate-200/80 rounded-full overflow-hidden p-1 border-2 border-slate-300 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${heatStyle.barClass}`}
            style={{ width: `${Math.min(100, Math.max(2, powerHeat))}%` }}
          />
        </div>
      </div>

      {/* Purble Place Bakery Visual Stage */}
      <div className="relative w-full h-80 bg-gradient-to-b from-[#fce7f3] via-[#ffedd5] to-[#fed7aa] rounded-2xl border-4 border-[#c084fc] flex flex-col justify-between overflow-hidden shadow-inner">

        {/* Overhead Purble Place Whimsical Dispenser Machines */}
        <div className="w-full pt-2 px-6 flex justify-around items-start z-10 pointer-events-none select-none">
          {/* Machine 1: Cake Batter Churner */}
          <div className="flex flex-col items-center">
            <div className="w-1.5 h-6 bg-gradient-to-b from-slate-400 to-slate-600"></div>
            <div className="w-14 h-12 bg-gradient-to-b from-purple-400 to-indigo-500 rounded-full border-2 border-white shadow-md flex items-center justify-center">
              <span className="text-xl">🌀</span>
            </div>
            <div className="w-3 h-4 bg-gradient-to-b from-slate-300 to-slate-500 rounded-b-md"></div>
          </div>

          {/* Machine 2: Swirl Candy Piping Nozzle */}
          <div className="flex flex-col items-center">
            <div className="w-2 h-7 bg-repeating-linear-gradient-45 from-red-400 to-white" style={{ background: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 4px, #ffffff 4px, #ffffff 8px)' }}></div>
            <div className="w-16 h-10 bg-gradient-to-r from-pink-300 via-white to-pink-300 rounded-b-2xl border-2 border-pink-400 shadow-md flex items-center justify-center">
              <span className="text-xs font-black tracking-wider text-pink-500 font-mono">ICING</span>
            </div>
            <div className="w-2.5 h-3 bg-pink-400 rounded-b-full"></div>
          </div>

          {/* Machine 3: Sprinkle Dispenser Globe */}
          <div className="flex flex-col items-center">
            <div className="w-1.5 h-6 bg-gradient-to-b from-slate-400 to-slate-600"></div>
            <div className="w-14 h-12 bg-cyan-200/90 rounded-full border-2 border-white shadow-md flex items-center justify-center overflow-hidden">
              <div className="flex gap-1 flex-wrap justify-center p-1">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              </div>
            </div>
            <div className="w-3 h-4 bg-gradient-to-b from-slate-300 to-slate-500 rounded-b-md"></div>
          </div>
        </div>

        {/* Thermal Throttling Warning Overlay (Exact Name Kept) */}
        {powerHeat > 80 && !isDead && (
          <div className="absolute inset-0 bg-rose-500/20 backdrop-blur-[1px] pointer-events-none z-30 animate-pulse flex items-center justify-center">
            <div className="bg-rose-600/90 text-white border-2 border-white px-6 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3">
              <span className="text-2xl animate-spin">⚠️</span>
              <span className="text-xl md:text-2xl font-black tracking-widest font-mono uppercase">
                THERMAL THROTTLING
              </span>
            </div>
          </div>
        )}

        {/* Conveyor Assembly & Moving Cakes */}
        <div className="w-full flex flex-col justify-end relative z-20">

          {/* Moving Purble Place Cakes Layer: Exact 96px Repeat */}
          <div className="relative h-24 overflow-hidden pointer-events-none w-full">
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
              {[...Array(24)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-24 flex flex-col items-center justify-end pb-0.5">
                  {/* Purble Place 3-Layer Cake */}
                  <div className="flex flex-col items-center filter drop-shadow-md select-none transform transition-transform hover:scale-105">
                    {/* Top Tier: Golden Lemon with Smiley Topper */}
                    <div className="w-11 h-4 bg-gradient-to-b from-yellow-300 to-amber-400 rounded-t-md border-b-2 border-amber-500 flex items-center justify-center text-[11px] shadow-sm">
                      {i % 2 === 0 ? '😊' : '🍓'}
                    </div>
                    {/* White Cream Trim */}
                    <div className="w-12 h-1 bg-white rounded-full -my-0.5 shadow-sm"></div>
                    {/* Middle Tier: Rich Chocolate Sponge */}
                    <div className="w-13 h-4 bg-gradient-to-b from-[#6b4226] to-[#452410] border-b-2 border-[#2c1305] shadow-sm"></div>
                    {/* White Cream Trim */}
                    <div className="w-14 h-1 bg-white rounded-full -my-0.5 shadow-sm"></div>
                    {/* Bottom Tier: Vibrant Strawberry Sponge */}
                    <div className="w-15 h-5 bg-gradient-to-b from-pink-400 to-rose-500 rounded-b-md border-b-2 border-rose-600 shadow-md"></div>
                  </div>

                  {/* Scalloped Paper Napkin / Doily */}
                  <div className="w-16 h-1.5 bg-white/95 rounded-full border border-slate-200 shadow-sm mt-0.5"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Purble Place Conveyor Track (Stainless Steel with rubber belt) */}
          <div
            className="w-full h-14 border-y-2 border-slate-500 relative z-10"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, #475569 0px, #475569 48px, #64748b 48px, #64748b 96px)`,
              backgroundSize: '96px 100%',
              animationName: 'beltScroll',
              animationDuration: `${animationDurationSeconds}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationPlayState: isDead ? 'paused' : 'running',
            }}
          />

          {/* Mechanical Rollers */}
          <div className="h-7 w-full bg-gradient-to-b from-slate-300 to-slate-400 border-b border-slate-400 flex justify-between items-center px-4">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-3.5 h-3.5 rounded-full bg-slate-600 border border-slate-700 relative flex items-center justify-center shadow-sm"
                style={{
                  animationName: 'spinRoller',
                  animationDuration: `${animationDurationSeconds}s`,
                  animationTimingFunction: 'linear',
                  animationIterationCount: 'infinite',
                  animationPlayState: isDead ? 'paused' : 'running',
                }}
              >
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
            ))}
          </div>

          {/* Purble Place Retro Black & White Checkered Kitchen Floor */}
          <div
            className="w-full h-8 border-t-2 border-slate-600"
            style={{
              backgroundImage: `repeating-conic-gradient(#1e293b 0% 25%, #f8fafc 0% 50%)`,
              backgroundSize: '32px 32px',
            }}
          />
        </div>
      </div>

      {/* Embedded Dynamic CSS Keyframes: 96px seamless loops */}
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
