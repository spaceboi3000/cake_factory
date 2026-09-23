'use client';

import React, { useRef, useEffect, useState } from 'react';

interface PipeliningConveyorProps {
  clockSpeed: number;
  onSetSpeed?: (speed: number) => void;
}

export default function PipeliningConveyor({
  clockSpeed,
  onSetSpeed,
}: PipeliningConveyorProps) {
  const [pipeliningEnabled, setPipeliningEnabled] = useState<boolean>(false);
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [cakesCompleted, setCakesCompleted] = useState<number>(0);
  const [singleMachineStage, setSingleMachineStage] = useState<number>(0); // 0=Bake, 1=Frost, 2=Box

  const trackRef = useRef<HTMLDivElement>(null);
  const beltRef = useRef<HTMLDivElement>(null);
  const rollersContainerRef = useRef<HTMLDivElement>(null);

  const clockSpeedRef = useRef(clockSpeed);
  clockSpeedRef.current = clockSpeed;
  const pipeliningRef = useRef(pipeliningEnabled);
  pipeliningRef.current = pipeliningEnabled;

  useEffect(() => {
    const trackEl = trackRef.current;
    const beltEl = beltRef.current;
    const rollersContainer = rollersContainerRef.current;
    if (!trackEl || !beltEl || !rollersContainer) return;

    const rollers = rollersContainer.querySelectorAll<HTMLDivElement>('.roller');
    const CAKE_SPACING = 160; // Exact distance between machine centers
    const NUM_CAKES = 12;
    let nextPkgNumber = 100;

    // Track cakes state
    trackEl.innerHTML = '';
    const cakesList: Array<{
      el: HTMLDivElement;
      emojiEl: HTMLSpanElement;
      badgeEl: HTMLSpanElement;
      gridX: number;
      pkg: number;
      stage: number; // 0=Batter, 1=Baked, 2=Frosted, 3=Boxed
    }> = [];

    // Create 12 cakes along the track
    for (let i = 0; i < NUM_CAKES; i++) {
      const cakeEl = document.createElement('div');
      cakeEl.className = 'w-28 flex flex-col items-center justify-end pb-1 absolute bottom-0 select-none';
      const pkg = nextPkgNumber++;
      cakeEl.innerHTML = `
        <span class="cakeEmoji text-4xl md:text-5xl filter drop-shadow-lg select-none transform transition-transform hover:scale-110">
          🥣
        </span>
        <span class="cakeBadge text-[10px] font-mono text-slate-600 font-bold mt-1 bg-white/90 px-2 py-0.5 rounded-full shadow-sm border border-slate-200">
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
        stage: 0,
      });
    }

    let lastAnimTime = performance.now();
    let stepPhase = 0; // 0.0 to 1.0 within a clock cycle
    let baseTreadOffset = 0;
    let baseRollerDeg = 0;
    const MOVE_FRACTION = 0.35;
    let nonPipelinedCycleCounter = 0;
    let totalCycles = 0;
    let totalProduced = 0;
    let animId: number;

    function easeInOutCubic(t: number): number {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function getStageEmoji(stage: number): string {
      switch (stage) {
        case 1:
          return '🍰'; // Baked sponge
        case 2:
          return '🧁'; // Frosted cake
        case 3:
          return '🎁'; // Boxed cake
        default:
          return '🥣'; // Raw batter
      }
    }

    function render(now: number) {
      const dt = Math.min(0.1, (now - lastAnimTime) / 1000);
      lastAnimTime = now;

      const speed = Math.max(1.0, Math.min(5.0, clockSpeedRef.current));
      stepPhase += dt * speed;

      // When a clock cycle completes:
      while (stepPhase >= 1.0) {
        stepPhase -= 1.0;
        totalCycles++;
        setCycleCount(totalCycles);

        if (pipeliningRef.current) {
          // ===================================================================
          // PIPELINED EXECUTION: Line steps every single cycle!
          // ===================================================================
          for (let i = 0; i < cakesList.length; i++) {
            cakesList[i].gridX -= CAKE_SPACING;
          }

          // Update stages based on station positions
          // Machine 1 is at ~x=480, Machine 2 is at ~x=320, Machine 3 is at ~x=160
          for (let i = 0; i < cakesList.length; i++) {
            const c = cakesList[i];
            if (c.gridX <= 480 && c.gridX > 320) {
              c.stage = 1; // Baked
            } else if (c.gridX <= 320 && c.gridX > 160) {
              c.stage = 2; // Frosted
            } else if (c.gridX <= 160) {
              c.stage = 3; // Boxed
            }
            c.emojiEl.textContent = getStageEmoji(c.stage);
          }

          // Offscreen recycling on the left
          for (let i = 0; i < cakesList.length; i++) {
            const c = cakesList[i];
            if (c.gridX < -100) {
              let maxGridX = -100;
              for (let j = 0; j < cakesList.length; j++) {
                if (cakesList[j].gridX > maxGridX) maxGridX = cakesList[j].gridX;
              }
              c.gridX = maxGridX + CAKE_SPACING;
              c.pkg = nextPkgNumber++;
              c.stage = 0; // Fresh raw batter
              c.emojiEl.textContent = getStageEmoji(0);
              c.badgeEl.textContent = `PKG#${c.pkg}`;

              totalProduced++;
              setCakesCompleted(totalProduced);
            }
          }

          baseTreadOffset = (baseTreadOffset + CAKE_SPACING) % 96;
          baseRollerDeg = (baseRollerDeg + (CAKE_SPACING * 360 / 96)) % 360;
        } else {
          // ===================================================================
          // NON-PIPELINED EXECUTION: 1 Machine takes 3 cycles per cake
          // ===================================================================
          nonPipelinedCycleCounter = (nonPipelinedCycleCounter + 1) % 3;
          setSingleMachineStage(nonPipelinedCycleCounter);

          // Find the cake under the central machine (gridX closest to 320px)
          const targetCake = cakesList.find((c) => Math.abs(c.gridX - 320) < 40);
          if (targetCake) {
            targetCake.stage = nonPipelinedCycleCounter === 0 ? 3 : nonPipelinedCycleCounter;
            targetCake.emojiEl.textContent = getStageEmoji(targetCake.stage);
          }

          // Line ONLY moves when the 3-cycle sequence completes (cycle 0)
          if (nonPipelinedCycleCounter === 0) {
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
                c.stage = 0;
                c.emojiEl.textContent = getStageEmoji(0);
                c.badgeEl.textContent = `PKG#${c.pkg}`;

                totalProduced++;
                setCakesCompleted(totalProduced);
              }
            }

            baseTreadOffset = (baseTreadOffset + CAKE_SPACING) % 96;
            baseRollerDeg = (baseRollerDeg + (CAKE_SPACING * 360 / 96)) % 360;
          }
        }
      }

      // Stepped motion rendering
      const isMovingCycle = pipeliningRef.current || nonPipelinedCycleCounter === 0;
      let currentStepOffset = 0;
      let currentEased = 0;

      if (isMovingCycle) {
        if (stepPhase < MOVE_FRACTION) {
          const moveProgress = stepPhase / MOVE_FRACTION;
          currentEased = easeInOutCubic(moveProgress);
          currentStepOffset = currentEased * CAKE_SPACING;
        } else {
          currentEased = 1.0;
          currentStepOffset = CAKE_SPACING;
        }
      }

      // Render cake positions
      for (let i = 0; i < cakesList.length; i++) {
        const c = cakesList[i];
        const renderX = c.gridX - currentStepOffset;
        c.el.style.transform = `translate3d(${renderX}px, 80%, 0)`;
      }

      // Render belt tread
      const currentTread = (baseTreadOffset + currentStepOffset) % 96;
      beltEl.style.backgroundPosition = `-${currentTread}px 0`;

      // Render rollers
      const currentRollerDeg = (baseRollerDeg + (CAKE_SPACING * 360 / 96) * currentEased) % 360;
      rollers.forEach((r) => {
        r.style.transform = `rotate(${currentRollerDeg}deg)`;
      });

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [pipeliningEnabled]);

  // Color theme for the single machine during its 3 stages
  const getSingleMachineTheme = () => {
    switch (singleMachineStage) {
      case 0: // Bake Stage
        return {
          label: 'STAGE 1: BAKE (🔥 OVEN)',
          badgeClass: 'bg-amber-500 text-amber-950 border-amber-300 shadow-amber-500/50',
          glowClass: 'border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.7)] ring-4 ring-amber-400/40',
          emoji: '🔥',
          desc: 'Heating cake batter into sponge...',
        };
      case 1: // Frost Stage
        return {
          label: 'STAGE 2: FROST (🧁 ICING)',
          badgeClass: 'bg-pink-500 text-white border-pink-300 shadow-pink-500/50',
          glowClass: 'border-pink-400 shadow-[0_0_35px_rgba(244,63,94,0.7)] ring-4 ring-pink-400/40',
          emoji: '🧁',
          desc: 'Applying strawberry vanilla frosting...',
        };
      case 2: // Box Stage
        return {
          label: 'STAGE 3: BOX (📦 PACKAGING)',
          badgeClass: 'bg-purple-600 text-white border-purple-300 shadow-purple-500/50',
          glowClass: 'border-purple-400 shadow-[0_0_35px_rgba(168,85,247,0.7)] ring-4 ring-purple-400/40',
          emoji: '📦',
          desc: 'Boxing cake and sealing packaging...',
        };
      default:
        return {
          label: 'IDLE',
          badgeClass: 'bg-slate-500 text-white',
          glowClass: '',
          emoji: '⚙️',
          desc: '',
        };
    }
  };

  const machineTheme = getSingleMachineTheme();

  return (
    <div className="w-full bg-[#fdf2f8] border-4 border-[#e9d5ff] rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col gap-6 relative">
      {/* Pipelining Instrumentation & Metrics Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-sm border-2 border-purple-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setPipeliningEnabled(!pipeliningEnabled);
              setCycleCount(0);
              setCakesCompleted(0);
            }}
            className={`px-5 py-2.5 rounded-2xl border-2 font-mono font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer ${
              pipeliningEnabled
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/30'
                : 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/30'
            }`}
          >
            <span className="text-base">{pipeliningEnabled ? '⚡' : '🔄'}</span>
            <span>
              PIPELINING: {pipeliningEnabled ? 'ON (3 MACHINES, 1 CAKE/CYCLE)' : 'OFF (1 MACHINE, 3 CYCLES/CAKE)'}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Cycle Counter */}
          <div className="bg-purple-100/80 border border-purple-300 px-3.5 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 text-purple-900 font-bold">
            <span>CYCLE:</span>
            <span className="text-purple-700 font-black text-sm">#{cycleCount}</span>
          </div>

          {/* Throughput Metric */}
          <div className="bg-pink-100/80 border border-pink-300 px-3.5 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 text-pink-900 font-bold">
            <span>TOTAL PRODUCED:</span>
            <span className="text-pink-700 font-black text-sm">{cakesCompleted} units</span>
          </div>

          {/* Efficiency Metric */}
          <div className="bg-emerald-100/80 border border-emerald-300 px-3.5 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 text-emerald-900 font-bold">
            <span>CPI:</span>
            <span className="text-emerald-700 font-black text-sm">
              {pipeliningEnabled ? '1.00 (Peak)' : '3.00 (Unpipelined)'}
            </span>
          </div>

          {/* Clock Frequency Pill */}
          <div className="bg-white border-2 border-purple-300 px-3.5 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 text-purple-900 font-bold shadow-sm">
            <span>FREQ:</span>
            <span className="text-purple-700 font-black">{clockSpeed.toFixed(2)} GHz</span>
          </div>
        </div>
      </div>

      {/* Bakery Stage: Shows either 1 Single Color-Shifting Machine or 3 Pipelined Machines */}
      <div
        className="relative w-full h-[520px] rounded-2xl border-4 border-[#c084fc] flex flex-col justify-between overflow-hidden shadow-inner bg-cover bg-center transition-all duration-300"
        style={{ backgroundImage: `url('/sprites/purble_background.png')` }}
      >
        {/* Top Zone: Overhead Machines Placement */}
        <div className="w-full px-8 flex justify-between items-start z-10 select-none">
          <div className="w-32" />

          {/* Machine Assembly */}
          {pipeliningEnabled ? (
            /* PIPELINED MODE: 3 Dedicated Machines in Series */
            <div className="flex gap-12 items-start -mt-4">
              {/* Machine 1: Bake (Stage 1) */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-mono font-black text-amber-900 bg-amber-200/90 border border-amber-400 px-2 py-0.5 rounded-lg mb-1 shadow-sm">
                  STAGE 1: BAKE
                </span>
                <img
                  src="/sprites/dispenser_batter.png"
                  alt="Bake Machine"
                  className="w-32 h-40 object-contain object-top filter drop-shadow-xl"
                />
              </div>

              {/* Machine 2: Frost (Stage 2) */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-mono font-black text-pink-900 bg-pink-200/90 border border-pink-400 px-2 py-0.5 rounded-lg mb-1 shadow-sm">
                  STAGE 2: FROST
                </span>
                <img
                  src="/sprites/dispenser_icing.png"
                  alt="Frosting Machine"
                  className="w-32 h-40 object-contain object-top filter drop-shadow-xl"
                />
              </div>

              {/* Machine 3: Box (Stage 3) */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-mono font-black text-purple-900 bg-purple-200/90 border border-purple-400 px-2 py-0.5 rounded-lg mb-1 shadow-sm">
                  STAGE 3: BOX
                </span>
                <img
                  src="/sprites/dispenser_sprinkles.png"
                  alt="Packaging Machine"
                  className="w-32 h-40 object-contain object-top filter drop-shadow-xl"
                />
              </div>
            </div>
          ) : (
            /* NON-PIPELINED MODE: 1 Single Machine that Changes Colors Every Step */
            <div className="flex flex-col items-center -mt-4">
              <span
                className={`text-[11px] font-mono font-black px-3 py-1 rounded-xl mb-1 border-2 shadow-lg transition-all duration-300 animate-pulse ${machineTheme.badgeClass}`}
              >
                {machineTheme.label}
              </span>
              <div
                className={`rounded-3xl p-1 transition-all duration-500 flex flex-col items-center ${machineTheme.glowClass}`}
              >
                <img
                  src="/sprites/dispenser_batter.png"
                  alt="Universal Cake Maker"
                  className="w-36 h-40 object-contain object-top filter drop-shadow-2xl"
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-purple-950 bg-white/90 px-2.5 py-0.5 rounded-full mt-1 border border-purple-300 shadow-sm">
                {machineTheme.desc}
              </span>
            </div>
          )}

          <div className="w-32" />
        </div>

        {/* Conveyor Belt Assembly (Exact bottom of the stage) */}
        <div className="w-full flex flex-col justify-end relative z-20">
          {/* Moving Cakes Track */}
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
          <div
            ref={rollersContainerRef}
            className="h-8 w-full bg-slate-800 border-t-2 border-slate-700 flex justify-between items-center px-6"
          >
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
      </div>
    </div>
  );
}
