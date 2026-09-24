'use client';

import React, { useRef, useEffect } from 'react';

interface ConveyorBeltProps {
  clockSpeed: number;
  powerHeat: number;
  isDead: boolean;
  onSetSpeed?: (speed: number) => void;
  vliwEnabled?: boolean;
  onToggleVliw?: (enabled: boolean) => void;
}

export default function ConveyorBelt({
  clockSpeed,
  powerHeat,
  isDead,
  onSetSpeed,
  vliwEnabled = false,
  onToggleVliw,
}: ConveyorBeltProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const beltRef = useRef<HTMLDivElement>(null);
  const rollersContainerRef = useRef<HTMLDivElement>(null);

  const track2Ref = useRef<HTMLDivElement>(null);
  const belt2Ref = useRef<HTMLDivElement>(null);
  const rollersContainer2Ref = useRef<HTMLDivElement>(null);

  const clockSpeedRef = useRef(clockSpeed);
  clockSpeedRef.current = clockSpeed;
  const isDeadRef = useRef(isDead);
  isDeadRef.current = isDead;

  useEffect(() => {
    const trackEl = trackRef.current;
    const beltEl = beltRef.current;
    const rollersContainer = rollersContainerRef.current;
    if (!trackEl || !beltEl || !rollersContainer) return;

    const rollers = rollersContainer.querySelectorAll<HTMLDivElement>('.roller');
    const cakeEmojis = ['🎂', '🧁', '🍰'];
    const CAKE_SPACING = 110;
    const NUM_CAKES = 14;
    let nextPkgNumber = 100;

    trackEl.innerHTML = '';
    const cakesList: Array<{
      el: HTMLDivElement;
      emojiEl: HTMLSpanElement;
      badgeEl: HTMLSpanElement;
      gridX: number;
      pkg: number;
    }> = [];

    for (let i = 0; i < NUM_CAKES; i++) {
      const cakeEl = document.createElement('div');
      cakeEl.className = 'w-24 flex flex-col items-center justify-end pb-1.5 absolute bottom-0 select-none';
      const pkg = nextPkgNumber++;
      const emoji = cakeEmojis[i % 3];
      cakeEl.innerHTML = `
        <span class="cakeEmoji text-4xl md:text-5xl filter drop-shadow-lg select-none transform transition-transform hover:scale-110">
          ${emoji}
        </span>
        <span class="cakeBadge text-[10px] font-mono text-slate-600 font-bold mt-1 bg-white/85 px-2 py-0.5 rounded-full shadow-sm border border-slate-200">
          PKG#${pkg}
        </span>
      `;
      const gridX = i * CAKE_SPACING;
      cakeEl.style.transform = `translate3d(${gridX}px, 80%, 0)`;
      trackEl.appendChild(cakeEl);
      cakesList.push({
        el: cakeEl,
        emojiEl: cakeEl.querySelector('.cakeEmoji')!,
        badgeEl: cakeEl.querySelector('.cakeBadge')!,
        gridX: gridX,
        pkg: pkg,
      });
    }

    // Initialize second lane if VLIW is active
    let nextPkgNumber2 = 200;
    const cakesList2: Array<{
      el: HTMLDivElement;
      emojiEl: HTMLSpanElement;
      badgeEl: HTMLSpanElement;
      gridX: number;
      pkg: number;
    }> = [];

    let rollers2: NodeListOf<HTMLDivElement> | null = null;
    const track2El = track2Ref.current;
    const belt2El = belt2Ref.current;
    const rollersContainer2 = rollersContainer2Ref.current;

    if (vliwEnabled && track2El && belt2El && rollersContainer2) {
      rollers2 = rollersContainer2.querySelectorAll<HTMLDivElement>('.roller2');
      track2El.innerHTML = '';
      for (let i = 0; i < NUM_CAKES; i++) {
        const cakeEl = document.createElement('div');
        cakeEl.className = 'w-24 flex flex-col items-center justify-end pb-1.5 absolute bottom-0 select-none';
        const pkg = nextPkgNumber2++;
        const emoji = cakeEmojis[(i + 1) % 3];
        cakeEl.innerHTML = `
          <span class="cakeEmoji text-4xl md:text-5xl filter drop-shadow-lg select-none transform transition-transform hover:scale-110">
            ${emoji}
          </span>
          <span class="cakeBadge text-[10px] font-mono text-purple-700 font-bold mt-1 bg-purple-50 px-2 py-0.5 rounded-full shadow-sm border border-purple-200">
            PKG#${pkg}
          </span>
        `;
        const gridX = i * CAKE_SPACING;
        cakeEl.style.transform = `translate3d(${gridX}px, 80%, 0)`;
        track2El.appendChild(cakeEl);
        cakesList2.push({
          el: cakeEl,
          emojiEl: cakeEl.querySelector('.cakeEmoji')!,
          badgeEl: cakeEl.querySelector('.cakeBadge')!,
          gridX: gridX,
          pkg: pkg,
        });
      }
    }

    let lastAnimTime = performance.now();
    let stepPhase = 0;
    let baseTreadOffset = 0;
    let baseRollerDeg = 0;
    const MOVE_FRACTION = 0.35;
    let animId: number;

    function easeInOutCubic(t: number): number {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function render(now: number) {
      const dt = Math.min(0.1, (now - lastAnimTime) / 1000);
      lastAnimTime = now;

      if (!isDeadRef.current) {
        const speed = Math.max(1.0, Math.min(5.0, clockSpeedRef.current));
        stepPhase += dt * speed;

        while (stepPhase >= 1.0) {
          stepPhase -= 1.0;

          // Lane 1 Advance
          for (let i = 0; i < cakesList.length; i++) {
            cakesList[i].gridX -= CAKE_SPACING;
          }
          for (let i = 0; i < cakesList.length; i++) {
            const c = cakesList[i];
            if (c.gridX < -100) {
              let maxGridX = -100;
              for (let j = 0; j < cakesList.length; j++) {
                if (cakesList[j].gridX > maxGridX) maxGridX = cakesList[j].gridX;
              }
              c.gridX = maxGridX + CAKE_SPACING;
              c.pkg = nextPkgNumber++;
              c.emojiEl.textContent = cakeEmojis[c.pkg % 3];
              c.badgeEl.textContent = `PKG#${c.pkg}`;
            }
          }

          // Lane 2 Advance (if VLIW enabled)
          if (vliwEnabled && cakesList2.length > 0) {
            for (let i = 0; i < cakesList2.length; i++) {
              cakesList2[i].gridX -= CAKE_SPACING;
            }
            for (let i = 0; i < cakesList2.length; i++) {
              const c = cakesList2[i];
              if (c.gridX < -100) {
                let maxGridX = -100;
                for (let j = 0; j < cakesList2.length; j++) {
                  if (cakesList2[j].gridX > maxGridX) maxGridX = cakesList2[j].gridX;
                }
                c.gridX = maxGridX + CAKE_SPACING;
                c.pkg = nextPkgNumber2++;
                c.emojiEl.textContent = cakeEmojis[(c.pkg + 1) % 3];
                c.badgeEl.textContent = `PKG#${c.pkg}`;
              }
            }
          }

          baseTreadOffset = (baseTreadOffset + CAKE_SPACING) % 96;
          baseRollerDeg = (baseRollerDeg + (CAKE_SPACING * 360 / 96)) % 360;
        }

        let currentStepOffset = 0;
        let currentEased = 0;
        if (stepPhase < MOVE_FRACTION) {
          const moveProgress = stepPhase / MOVE_FRACTION;
          currentEased = easeInOutCubic(moveProgress);
          currentStepOffset = currentEased * CAKE_SPACING;
        } else {
          currentEased = 1.0;
          currentStepOffset = CAKE_SPACING;
        }

        // Position Lane 1 cakes
        for (let i = 0; i < cakesList.length; i++) {
          const c = cakesList[i];
          const renderX = c.gridX - currentStepOffset;
          c.el.style.transform = `translate3d(${renderX}px, 80%, 0)`;
        }

        // Position Lane 1 belt tread
        const currentTread = (baseTreadOffset + currentStepOffset) % 96;
        beltEl!.style.backgroundPosition = `-${currentTread}px 0`;

        // Rotate Lane 1 rollers
        const currentRollerDeg = (baseRollerDeg + (CAKE_SPACING * 360 / 96) * currentEased) % 360;
        rollers.forEach((r) => {
          r.style.transform = `rotate(${currentRollerDeg}deg)`;
        });

        // Lane 2 updates (if VLIW enabled)
        if (vliwEnabled && cakesList2.length > 0 && belt2El) {
          for (let i = 0; i < cakesList2.length; i++) {
            const c = cakesList2[i];
            const renderX = c.gridX - currentStepOffset;
            c.el.style.transform = `translate3d(${renderX}px, 80%, 0)`;
          }
          belt2El.style.backgroundPosition = `-${currentTread}px 0`;
          if (rollers2) {
            rollers2.forEach((r) => {
              r.style.transform = `rotate(${currentRollerDeg}deg)`;
            });
          }
        }
      }

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [vliwEnabled]);

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

      {/* Bakery Stage: Top dispensers, Conveyor Belt Lane 1, and Replicated Lane 2 if VLIW active */}
      <div
        className={`relative w-full ${vliwEnabled ? 'min-h-[740px]' : 'h-[520px]'} rounded-2xl border-4 border-[#c084fc] flex flex-col justify-between overflow-hidden shadow-inner bg-cover bg-center transition-all duration-300`}
        style={{ backgroundImage: `url('/sprites/purble_background.png')` }}
      >
        {/* Top Zone: Overhead Dispensers (Touching Top), VLIW Toggle & Frequency Badge */}
        <div className="w-full px-8 flex justify-between items-start z-10 select-none">
          {/* Left area: empty space showing the authentic TV monitor painted on the wall */}
          <div className="w-36" />

          {/* Overhead Dispensers Rack (Touching Top Border) */}
          <div className="flex gap-8 items-start -mt-4">
            <div className="flex flex-col items-center hover:scale-105 transition-transform">
              <img
                src="/sprites/dispenser_batter.png"
                alt="Batter Dispenser"
                className="w-32 h-40 object-contain object-top filter drop-shadow-xl"
              />
            </div>

            <div className="flex flex-col items-center hover:scale-105 transition-transform">
              <img
                src="/sprites/dispenser_icing.png"
                alt="Icing Dispenser"
                className="w-32 h-40 object-contain object-top filter drop-shadow-xl"
              />
            </div>

            <div className="flex flex-col items-center hover:scale-105 transition-transform">
              <img
                src="/sprites/dispenser_sprinkles.png"
                alt="Sprinkle Dispenser"
                className="w-32 h-40 object-contain object-top filter drop-shadow-xl"
              />
            </div>
          </div>

          {/* Right Top Area: VLIW Architecture Toggle & Frequency Pill */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onToggleVliw?.(!vliwEnabled)}
              className={`mt-4 px-4 py-2 rounded-2xl border-2 font-mono font-bold text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
                vliwEnabled
                  ? 'bg-purple-600 text-white border-purple-400 shadow-purple-500/30'
                  : 'bg-white/85 text-purple-900 border-purple-300 hover:bg-purple-100'
              }`}
            >
              <span className="text-base">{vliwEnabled ? '⚡' : '⚙️'}</span>
              <span>VLIW 2nd LANE: {vliwEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <div className="mt-4 bg-white/85 backdrop-blur-sm border-2 border-purple-300 rounded-2xl px-4 py-2 flex flex-col items-center shadow-lg">
              <span className="text-[10px] font-mono font-bold text-purple-800">FREQUENCY</span>
              <span className="text-xl font-black font-mono text-purple-900">{clockSpeed.toFixed(2)} GHz</span>
            </div>
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

        {/* Conveyor Belt Assemblies Container */}
        <div className="w-full flex flex-col justify-end relative z-20">

          {/* Conveyor Belt Assembly (Lane 1) */}
          <div className="w-full flex flex-col justify-end relative z-20">
            {/* Original Moving Cakes */}
            <div className="relative h-28 pointer-events-none w-full z-20">
              <div ref={trackRef} className="w-full h-full relative z-20" />
            </div>

            {/* Conveyor Belt Surface (Dark Rubber Tread with 96px Repeat) */}
            <div
              ref={beltRef}
              className="w-full h-16 border-y-2 border-slate-700 relative z-10"
              style={{
                backgroundImage: `repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 48px, #334155 48px, #334155 96px)`,
                backgroundSize: '96px 100%',
              }}
            />

            {/* Conveyor Mechanical Cylinders / Rollers */}
            <div ref={rollersContainerRef} className="h-8 w-full bg-slate-800 border-t-2 border-slate-700 flex justify-between items-center px-6">
              {[...Array(14)].map((_, i) => (
                <div
                  key={i}
                  className="roller w-5 h-5 rounded-full bg-gradient-to-tr from-slate-400 via-slate-100 to-slate-400 border border-slate-600 relative flex items-center justify-center shadow-md"
                >
                  <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Replicated Second Lane Below (Lane 2 - VLIW Dual Issue) */}
          {vliwEnabled && (
            <div className="w-full flex flex-col justify-end relative z-20 border-t-4 border-purple-400/40 mt-2">
              <div className="relative h-28 pointer-events-none w-full z-20">
                <div ref={track2Ref} className="w-full h-full relative z-20" />
              </div>

              <div
                ref={belt2Ref}
                className="w-full h-16 border-y-2 border-slate-700 relative z-10"
                style={{
                  backgroundImage: `repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 48px, #334155 48px, #334155 96px)`,
                  backgroundSize: '96px 100%',
                }}
              />

              <div ref={rollersContainer2Ref} className="h-8 w-full bg-slate-800 border-t-2 border-slate-700 flex justify-between items-center px-6">
                {[...Array(14)].map((_, i) => (
                  <div
                    key={i}
                    className="roller2 w-5 h-5 rounded-full bg-gradient-to-tr from-slate-400 via-slate-100 to-slate-400 border border-slate-600 relative flex items-center justify-center shadow-md"
                  >
                    <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
