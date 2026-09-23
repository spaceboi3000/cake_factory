'use client';

import React, { useRef, useEffect, useState } from 'react';

interface PipeliningConveyorProps {
  clockSpeed: number;
  onSetSpeed?: (speed: number) => void;
}

interface CakeItem {
  el: HTMLDivElement;
  badgeEl: HTMLSpanElement;
  cakeLayerEl: HTMLImageElement;
  frostingLayerEl: HTMLDivElement;
  boxLayerEl: HTMLImageElement;
  gridX: number;
  pkg: number;
  stage: number; // 0=plate only, 1=has cake, 2=has frosting, 3=has box
  fallingStage: number; // 0=none, 1=cake falling, 2=frosting falling, 3=box falling
}

export default function PipeliningConveyor({
  clockSpeed,
  onSetSpeed,
}: PipeliningConveyorProps) {
  const [pipeliningEnabled, setPipeliningEnabled] = useState<boolean>(false);
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [cakesCompleted, setCakesCompleted] = useState<number>(0);
  const [singleMachineStage, setSingleMachineStage] = useState<number>(0); // 0=Cake, 1=Frosting, 2=Box

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
    const CAKE_SPACING = 180; // Distance between station centers
    let nextPkgNumber = 101;

    // Track starts completely empty!
    trackEl.innerHTML = '';
    const cakesList: CakeItem[] = [];

    // Factory helper to create an empty plate cake entity
    function createCakeItem(pkg: number, initialStage: number = 0, initialGridX: number = 0): CakeItem {
      const cakeEl = document.createElement('div');
      cakeEl.className = 'w-36 flex flex-col items-center justify-end pb-1 absolute bottom-0 select-none pointer-events-none';
      cakeEl.innerHTML = `
        <span class="cakeBadge text-[9px] font-mono font-black text-purple-900 bg-white/95 px-2.5 py-0.5 rounded-full mb-1 shadow-sm border border-purple-200">
          PKG#${pkg}
        </span>
        <div class="relative w-32 flex flex-col items-center justify-end" style="height: 110px;">
          <!-- Box Layer (Stage 3) -->
          <div class="boxLayer absolute bottom-1 z-30 transition-transform" style="display: none; transform: translateY(0);">
            <img src="/sprites/cake_box.png" alt="Box" class="w-28 h-auto filter drop-shadow-xl" />
          </div>

          <!-- Frosting Layer (Stage 2) -->
          <div class="frostingLayer absolute bottom-6 z-20 flex flex-col items-center transition-transform" style="display: none; transform: translateY(0);">
            <img src="/sprites/cake_topper_strawberry.png" alt="Topper" class="w-6 h-6 -mb-2 relative z-10 filter drop-shadow-sm" />
            <img src="/sprites/cake_cream.png" alt="Frosting" class="w-24 h-auto filter drop-shadow-md" />
          </div>

          <!-- Cake Sponge Layer (Stage 1) -->
          <div class="cakeLayer absolute bottom-2 z-10 transition-transform" style="display: none; transform: translateY(0);">
            <img src="/sprites/cake_bottom_layer.png" alt="Cake Sponge" class="w-26 h-auto filter drop-shadow-md" />
          </div>

          <!-- Plate / Pan Layer (Base) -->
          <div class="plateLayer absolute bottom-0 z-0">
            <img src="/sprites/cake_plate.png" alt="Plate" class="w-28 h-auto filter drop-shadow-sm" />
          </div>
        </div>
      `;
      cakeEl.style.transform = `translate3d(${initialGridX}px, 0, 0)`;
      trackEl.appendChild(cakeEl);

      const item: CakeItem = {
        el: cakeEl,
        badgeEl: cakeEl.querySelector('.cakeBadge')!,
        cakeLayerEl: cakeEl.querySelector('.cakeLayer')!,
        frostingLayerEl: cakeEl.querySelector('.frostingLayer')!,
        boxLayerEl: cakeEl.querySelector('.boxLayer')!,
        gridX: initialGridX,
        pkg: pkg,
        stage: initialStage,
        fallingStage: 0,
      };

      updateCakeVisualState(item);
      return item;
    }

    function updateCakeVisualState(item: CakeItem) {
      item.cakeLayerEl.style.display = item.stage >= 1 ? 'block' : 'none';
      item.frostingLayerEl.style.display = item.stage >= 2 ? 'flex' : 'none';
      item.boxLayerEl.style.display = item.stage >= 3 ? 'block' : 'none';

      if (item.stage === 0) {
        item.badgeEl.textContent = `PKG#${item.pkg} (EMPTY)`;
        item.badgeEl.className = 'cakeBadge text-[9px] font-mono font-bold text-slate-500 bg-white/90 px-2 py-0.5 rounded-full mb-1 border border-slate-300 shadow-sm';
      } else if (item.stage === 1) {
        item.badgeEl.textContent = `PKG#${item.pkg} (CAKE)`;
        item.badgeEl.className = 'cakeBadge text-[9px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full mb-1 border border-amber-300 shadow-sm';
      } else if (item.stage === 2) {
        item.badgeEl.textContent = `PKG#${item.pkg} (FROSTED)`;
        item.badgeEl.className = 'cakeBadge text-[9px] font-mono font-bold text-pink-800 bg-pink-100 px-2 py-0.5 rounded-full mb-1 border border-pink-300 shadow-sm';
      } else if (item.stage >= 3) {
        item.badgeEl.textContent = `PKG#${item.pkg} (BOXED)`;
        item.badgeEl.className = 'cakeBadge text-[9px] font-mono font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full mb-1 border border-purple-300 shadow-sm';
      }
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

    function render(now: number) {
      const dt = Math.min(0.1, (now - lastAnimTime) / 1000);
      lastAnimTime = now;

      const trackWidth = trackEl.clientWidth || 960;
      const center = trackWidth / 2;
      const station1X = center + CAKE_SPACING; // Machine 1 (Cake)
      const station2X = center;                // Machine 2 (Frosting) / Single Machine
      const station3X = center - CAKE_SPACING; // Machine 3 (Box)
      const exitX = center - CAKE_SPACING * 2; // Delivery exit

      const speed = Math.max(1.0, Math.min(5.0, clockSpeedRef.current));
      stepPhase += dt * speed;

      // When a clock cycle completes:
      while (stepPhase >= 1.0) {
        stepPhase -= 1.0;
        totalCycles++;
        setCycleCount(totalCycles);

        if (pipeliningRef.current) {
          // ===================================================================
          // PIPELINED EXECUTION: Steps every single cycle!
          // ===================================================================
          // Advance all cakes currently on belt by CAKE_SPACING to the left
          for (let i = 0; i < cakesList.length; i++) {
            cakesList[i].gridX -= CAKE_SPACING;
          }

          // Check if any cake completed and reached the exit
          for (let i = cakesList.length - 1; i >= 0; i--) {
            const c = cakesList[i];
            if (c.gridX <= exitX) {
              if (c.stage >= 3) {
                totalProduced++;
                setCakesCompleted(totalProduced);
              }
            }
            // Remove when far offscreen
            if (c.gridX < exitX - 100) {
              c.el.remove();
              cakesList.splice(i, 1);
            }
          }

          // Introduce a new empty plate at Station 1 for this cycle
          const newCake = createCakeItem(nextPkgNumber++, 0, station1X);
          cakesList.push(newCake);

          // Trigger falling animations at each active machine station!
          for (let i = 0; i < cakesList.length; i++) {
            const c = cakesList[i];
            // Station 1: Cake drops from Machine 1
            if (Math.abs(c.gridX - station1X) < 20) {
              c.stage = 1;
              c.fallingStage = 1;
              c.cakeLayerEl.style.display = 'block';
              updateCakeVisualState(c);
            }
            // Station 2: Frosting drops from Machine 2
            else if (Math.abs(c.gridX - station2X) < 20 && c.stage >= 1) {
              c.stage = 2;
              c.fallingStage = 2;
              c.frostingLayerEl.style.display = 'flex';
              updateCakeVisualState(c);
            }
            // Station 3: Box drops from Machine 3
            else if (Math.abs(c.gridX - station3X) < 20 && c.stage >= 2) {
              c.stage = 3;
              c.fallingStage = 3;
              c.boxLayerEl.style.display = 'block';
              updateCakeVisualState(c);
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

          // Find or create cake at the central machine station (station2X)
          let targetCake = cakesList.find((c) => Math.abs(c.gridX - station2X) < 30);
          if (!targetCake) {
            targetCake = createCakeItem(nextPkgNumber++, 0, station2X);
            cakesList.push(targetCake);
          }

          if (nonPipelinedCycleCounter === 1) {
            // Cycle 1: Cake drops
            targetCake.stage = 1;
            targetCake.fallingStage = 1;
            targetCake.cakeLayerEl.style.display = 'block';
            updateCakeVisualState(targetCake);
          } else if (nonPipelinedCycleCounter === 2) {
            // Cycle 2: Frosting drops
            targetCake.stage = 2;
            targetCake.fallingStage = 2;
            targetCake.frostingLayerEl.style.display = 'flex';
            updateCakeVisualState(targetCake);
          } else if (nonPipelinedCycleCounter === 0) {
            // Cycle 3: Box drops, packaging complete!
            targetCake.stage = 3;
            targetCake.fallingStage = 3;
            targetCake.boxLayerEl.style.display = 'block';
            updateCakeVisualState(targetCake);

            // Step the belt forward to deliver the boxed cake
            for (let i = 0; i < cakesList.length; i++) {
              cakesList[i].gridX -= CAKE_SPACING;
            }

            // Remove cakes offscreen
            for (let i = cakesList.length - 1; i >= 0; i--) {
              const c = cakesList[i];
              if (c.gridX <= exitX && c.stage >= 3) {
                totalProduced++;
                setCakesCompleted(totalProduced);
              }
              if (c.gridX < exitX - 100) {
                c.el.remove();
                cakesList.splice(i, 1);
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

      // =======================================================================
      // FALLING ANIMATIONS (From overhead machines during dwell phase)
      // =======================================================================
      const inDwellPhase = stepPhase >= MOVE_FRACTION && stepPhase < 0.95;
      const dwellNormalized = inDwellPhase ? (stepPhase - MOVE_FRACTION) / (0.95 - MOVE_FRACTION) : 1.0;

      for (let i = 0; i < cakesList.length; i++) {
        const c = cakesList[i];

        // Horizontal position along the conveyor
        const renderX = c.gridX - currentStepOffset;
        c.el.style.transform = `translate3d(${renderX}px, 0, 0)`;

        // Vertical drop animation
        if (c.fallingStage > 0) {
          let targetEl: HTMLElement | null = null;
          if (c.fallingStage === 1) targetEl = c.cakeLayerEl;
          else if (c.fallingStage === 2) targetEl = c.frostingLayerEl;
          else if (c.fallingStage === 3) targetEl = c.boxLayerEl;

          if (targetEl) {
            if (inDwellPhase) {
              if (dwellNormalized < 0.65) {
                // Falling rapidly with gravity acceleration
                const dropProgress = dwellNormalized / 0.65;
                const dropY = -115 * (1 - dropProgress * dropProgress);
                const scale = 0.92 + 0.08 * dropProgress;
                targetEl.style.transform = `translateY(${dropY}px) scale(${scale})`;
              } else {
                // Landed with tactile squash and bounce
                const bounceProgress = (dwellNormalized - 0.65) / 0.35;
                const bounceY = -6 * Math.sin(bounceProgress * Math.PI);
                const scaleX = 1 + 0.06 * Math.sin(bounceProgress * Math.PI);
                const scaleY = 1 - 0.06 * Math.sin(bounceProgress * Math.PI);
                targetEl.style.transform = `translateY(${bounceY}px) scale(${scaleX}, ${scaleY})`;
              }
            } else {
              targetEl.style.transform = 'translateY(0px) scale(1)';
              c.fallingStage = 0;
            }
          }
        }
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
      case 1: // Cake Stage
        return {
          label: 'STAGE 1: CAKE (🔥 BAKE)',
          badgeClass: 'bg-amber-500 text-amber-950 border-amber-300 shadow-amber-500/50',
          glowClass: 'border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.7)] ring-4 ring-amber-400/40',
          desc: 'Dropping sponge cake into pan...',
        };
      case 2: // Frosting Stage
        return {
          label: 'STAGE 2: FROSTING (🧁 ICING)',
          badgeClass: 'bg-pink-500 text-white border-pink-300 shadow-pink-500/50',
          glowClass: 'border-pink-400 shadow-[0_0_35px_rgba(244,63,94,0.7)] ring-4 ring-pink-400/40',
          desc: 'Dispensing strawberry vanilla frosting...',
        };
      case 0: // Box Stage
        return {
          label: 'STAGE 3: BOX (📦 PACKAGING)',
          badgeClass: 'bg-purple-600 text-white border-purple-300 shadow-purple-500/50',
          glowClass: 'border-purple-400 shadow-[0_0_35px_rgba(168,85,247,0.7)] ring-4 ring-purple-400/40',
          desc: 'Packaging finished cake in bakery box...',
        };
      default:
        return {
          label: 'READY',
          badgeClass: 'bg-slate-500 text-white',
          glowClass: '',
          desc: 'Ready for next cake...',
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
      {/* Moved conveyor higher up with h-[460px] stage and elevated conveyor belt pb-12 */}
      <div
        className="relative w-full h-[460px] rounded-2xl border-4 border-[#c084fc] flex flex-col justify-between overflow-hidden shadow-inner bg-cover bg-center transition-all duration-300"
        style={{ backgroundImage: `url('/sprites/purble_background.png')` }}
      >
        {/* Top Zone: Overhead Machines Placement */}
        <div className="w-full px-8 flex justify-between items-start z-10 select-none">
          <div className="w-24" />

          {/* Machine Assembly */}
          {pipeliningEnabled ? (
            /* PIPELINED MODE: 3 Dedicated Machines in Series (Right to Left: Cake -> Frosting -> Box) */
            <div className="flex gap-14 items-start -mt-4">
              {/* Machine 3: Box (Left - Stage 3) */}
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

              {/* Machine 2: Frosting (Center - Stage 2) */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-mono font-black text-pink-900 bg-pink-200/90 border border-pink-400 px-2 py-0.5 rounded-lg mb-1 shadow-sm">
                  STAGE 2: FROSTING
                </span>
                <img
                  src="/sprites/dispenser_icing.png"
                  alt="Frosting Machine"
                  className="w-32 h-40 object-contain object-top filter drop-shadow-xl"
                />
              </div>

              {/* Machine 1: Cake (Right - Stage 1) */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-mono font-black text-amber-900 bg-amber-200/90 border border-amber-400 px-2 py-0.5 rounded-lg mb-1 shadow-sm">
                  STAGE 1: CAKE
                </span>
                <img
                  src="/sprites/dispenser_batter.png"
                  alt="Cake Machine"
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

          <div className="w-24" />
        </div>

        {/* Elevated Conveyor Belt Assembly (Moved Higher Up via pb-12) */}
        <div className="w-full flex flex-col justify-end relative z-20 pb-12">
          {/* Moving Cakes Track */}
          <div className="relative h-28 pointer-events-none w-full z-20">
            <div ref={trackRef} className="w-full h-full relative z-20" />
          </div>

          {/* Conveyor Belt Surface (Dark Rubber Tread with 96px Repeat) */}
          <div
            ref={beltRef}
            className="w-full h-14 border-y-2 border-slate-700 relative z-10 shadow-lg"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 48px, #334155 48px, #334155 96px)`,
              backgroundSize: '96px 100%',
            }}
          />

          {/* Conveyor Mechanical Cylinders / Rollers */}
          <div
            ref={rollersContainerRef}
            className="h-7 w-full bg-slate-800 border-t-2 border-slate-700 flex justify-between items-center px-6 shadow-md"
          >
            {[...Array(14)].map((_, i) => (
              <div
                key={i}
                className="roller w-4 h-4 rounded-full bg-gradient-to-tr from-slate-400 via-slate-100 to-slate-400 border border-slate-600 relative flex items-center justify-center shadow-md"
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
