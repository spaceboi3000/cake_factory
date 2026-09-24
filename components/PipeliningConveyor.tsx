'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  advancePipelineClock,
  createPipelineClock,
  getActivePipelineCakes,
  type ActivePipelineCake,
} from '../lib/pipelineSimulation';

interface PipeliningConveyorProps {
  clockSpeed: number;
  onSetSpeed?: (speed: number) => void;
  hardwareControlled?: boolean;
}

interface CakeEntity {
  el: HTMLDivElement;
  badge: HTMLSpanElement;
  plateImg: HTMLImageElement;
  cakeImg: HTMLImageElement;
  glazedImg: HTMLImageElement;
  boxedImg: HTMLImageElement;
}

function getStationPos(sMid: number, sFrom: number, sTo: number, u: number): number {
  if (u < 0.25) {
    if (sFrom === sMid) return sMid;
    const prog = u / 0.25;
    const w = (1 - Math.cos(Math.PI * prog)) / 2;
    return sFrom + (sMid - sFrom) * w;
  }
  return sMid;
}

function getBeltTravel(mode: 'pipeline' | 'sequential', cycle: number, u: number): number {
  if (mode === 'pipeline') {
    const prog = Math.min(1, u / 0.25);
    const w = (1 - Math.cos(Math.PI * prog)) / 2;
    return (cycle - 1) + w;
  } else {
    const cakeIdx = Math.floor((cycle - 1) / 3);
    const step = ((cycle - 1) % 3) + 1;
    let baseTravel = cakeIdx * 2;
    if (cakeIdx > 0 && step >= 2) {
      baseTravel += 1;
    }
    const isMoving = step === 1 || (cakeIdx > 0 && step === 2);
    if (isMoving) {
      const prog = Math.min(1, u / 0.25);
      const w = (1 - Math.cos(Math.PI * prog)) / 2;
      return baseTravel + w;
    } else {
      if (step === 2 && cakeIdx === 0) return 1;
      if (step === 3) return baseTravel + (cakeIdx > 0 ? 1 : 1);
      return baseTravel;
    }
  }
}


export default function PipeliningConveyor({
  clockSpeed,
  onSetSpeed,
  hardwareControlled = false,
}: PipeliningConveyorProps) {
  const [pipeliningEnabled, setPipeliningEnabled] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [cakesCompleted, setCakesCompleted] = useState(0);
  const [singleMachineStage, setSingleMachineStage] = useState(-1);

  const trackRef = useRef<HTMLDivElement>(null);
  const beltRef = useRef<HTMLDivElement>(null);
  const rollersContainerRef = useRef<HTMLDivElement>(null);
  const m1Ref = useRef<HTMLDivElement>(null);
  const m2Ref = useRef<HTMLDivElement>(null);
  const m3Ref = useRef<HTMLDivElement>(null);
  const clockSpeedRef = useRef(clockSpeed);
  clockSpeedRef.current = clockSpeed;

  useEffect(() => {
    const track = trackRef.current;
    const belt = beltRef.current;
    const rollers = rollersContainerRef.current?.querySelectorAll<HTMLDivElement>('.roller');
    if (!track || !belt || !rollers) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const spacing = 190;
    let clock = createPipelineClock(pipeliningEnabled ? 'pipeline' : 'sequential');
    const entities = new Map<number, CakeEntity>();
    track.replaceChildren();
    setCycleCount(0);
    setCakesCompleted(0);
    setSingleMachineStage(1);
    belt.style.backgroundPosition = '0px 0';
    rollers.forEach(roller => { roller.style.transform = 'rotate(0deg)'; });
    let lastTime = performance.now();
    let animationId: number;

    const STAGE_NAMES = ['PLATE', 'BAKED', 'GLAZED', 'BOXED'];
    const BADGE_STYLES = [
      'text-slate-600 bg-white/95 border-slate-300',
      'text-amber-800 bg-amber-100/95 border-amber-300',
      'text-pink-800 bg-pink-100/95 border-pink-300',
      'text-purple-900 bg-purple-100/95 border-purple-300',
    ];

    function render(now: number) {
      const seconds = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      const previous = clock.simulation;
      clock = advancePipelineClock(clock, seconds, clockSpeedRef.current);
      const simulation = clock.simulation;
      const u = clock.phase;

      if (simulation !== previous) {
        setCycleCount(simulation.cycles);
        setCakesCompleted(simulation.produced);
        const currentStep = (simulation.cycles % 3) + 1;
        setSingleMachineStage(currentStep === 3 ? 0 : currentStep);
      }

      // Active cycle being animated is simulation.cycles + 1
      const activeCycle = simulation.cycles + 1;
      const activeCakes = getActivePipelineCakes(pipeliningEnabled ? 'pipeline' : 'sequential', activeCycle);
      const activeIds = new Set(activeCakes.map(c => c.id));

      for (const [id, entity] of entities) {
        if (!activeIds.has(id)) {
          entity.el.remove();
          entities.delete(id);
        }
      }

      for (const cake of activeCakes) {
        let entity = entities.get(cake.id);
        if (!entity) {
          const el = document.createElement('div');
          el.className = 'w-36 flex flex-col items-center justify-end absolute bottom-0 select-none pointer-events-none transition-none';
          el.style.left = '50%';
          el.style.marginLeft = '-72px';
          el.dataset.cakeId = String(cake.id);

          const badge = document.createElement('span');
          badge.className = 'text-[9px] font-mono font-bold px-2 py-0.5 rounded-full mb-1 border shadow-sm';

          const imgWrap = document.createElement('div');
          imgWrap.className = 'relative w-32 flex flex-col items-center justify-end';
          imgWrap.style.height = '105px';

          const plateImg = document.createElement('img');
          plateImg.className = 'absolute bottom-0 w-32 h-auto object-contain drop-shadow-sm';
          plateImg.src = '/sprites/plate.png';
          plateImg.alt = 'Plate';

          const cakeImg = document.createElement('img');
          cakeImg.className = 'absolute bottom-0 w-32 h-auto object-contain drop-shadow-md';
          cakeImg.src = '/sprites/cake.png';
          cakeImg.alt = 'Baked Cake';

          const glazedImg = document.createElement('img');
          glazedImg.className = 'absolute bottom-0 w-32 h-auto object-contain drop-shadow-lg';
          glazedImg.src = '/sprites/cake_glazed.png';
          glazedImg.alt = 'Glazed Cake';

          const boxedImg = document.createElement('img');
          boxedImg.className = 'absolute bottom-0 w-32 h-auto object-contain drop-shadow-xl';
          boxedImg.src = '/sprites/cake_boxed.png';
          boxedImg.alt = 'Boxed Cake';

          imgWrap.append(plateImg, cakeImg, glazedImg, boxedImg);
          el.append(badge, imgWrap);
          track!.appendChild(el);

          entity = { el, badge, plateImg, cakeImg, glazedImg, boxedImg };
          entities.set(cake.id, entity);
        }

        // Horizontal position based on 3-phase clock cycle
        const stationPos = reducedMotion.matches
          ? cake.sMid
          : getStationPos(cake.sMid, cake.sFrom, cake.sTo, u);
        const x = stationPos * spacing;
        entity.el.style.transform = 'translate3d(' + x + 'px, 0, 0)';

        // 3-Phase vertical layers and pulse animations
        const imgs = [entity.plateImg, entity.cakeImg, entity.glazedImg, entity.boxedImg];

        if (cake.fallingStage === 0 || reducedMotion.matches) {
          imgs.forEach((img, idx) => {
            img.style.display = idx === cake.baseStage ? 'block' : 'none';
            img.style.transform = 'translateY(0px) scale(1)';
          });
          entity.badge.textContent = 'PKG#' + cake.id + ' (' + STAGE_NAMES[cake.baseStage] + ')';
          entity.badge.className = 'text-[9px] font-mono font-bold px-2 py-0.5 rounded-full mb-1 border shadow-sm ' + BADGE_STYLES[cake.baseStage];
        } else if (u < 0.25) {
          // Phase 1: Setup Time - Plate/Cake moves into station under machine
          imgs.forEach((img, idx) => {
            img.style.display = idx === cake.baseStage ? 'block' : 'none';
            img.style.transform = 'translateY(0px) scale(1)';
          });
          entity.badge.textContent = 'PKG#' + cake.id + ' (' + STAGE_NAMES[cake.baseStage] + ')';
          entity.badge.className = 'text-[9px] font-mono font-bold px-2 py-0.5 rounded-full mb-1 border shadow-sm ' + BADGE_STYLES[cake.baseStage];
        } else if (u <= 0.75) {
          // Phase 2: The "Pulse" - Dwells stationary under machine, layer drops from nozzle above
          imgs.forEach((img, idx) => {
            img.style.display = (idx === cake.baseStage || idx === cake.fallingStage) ? 'block' : 'none';
          });
          imgs[cake.baseStage].style.transform = 'translateY(0px) scale(1)';

          const p = (u - 0.25) / 0.50;
          if (p < 0.60) {
            // Rapid fall with gravity acceleration
            const q = p / 0.60;
            const dropY = -100 * (1 - q * q);
            const scale = 0.92 + 0.08 * q;
            imgs[cake.fallingStage].style.transform = 'translateY(' + dropY + 'px) scale(' + scale + ')';
            entity.badge.textContent = 'PKG#' + cake.id + ' (' + STAGE_NAMES[cake.baseStage] + ')';
            entity.badge.className = 'text-[9px] font-mono font-bold px-2 py-0.5 rounded-full mb-1 border shadow-sm ' + BADGE_STYLES[cake.baseStage];
          } else {
            // Landing bounce & tactile squash
            const b = (p - 0.60) / 0.40;
            const bounceY = -5 * Math.sin(b * Math.PI) * (1 - b * 0.5);
            const scaleX = 1 + 0.06 * Math.sin(b * Math.PI) * (1 - b * 0.5);
            const scaleY = 1 - 0.06 * Math.sin(b * Math.PI) * (1 - b * 0.5);
            imgs[cake.fallingStage].style.transform = 'translateY(' + bounceY + 'px) scale(' + scaleX + ', ' + scaleY + ')';
            entity.badge.textContent = 'PKG#' + cake.id + ' (' + STAGE_NAMES[cake.fallingStage] + ')';
            entity.badge.className = 'text-[9px] font-mono font-bold px-2 py-0.5 rounded-full mb-1 border shadow-sm ' + BADGE_STYLES[cake.fallingStage];
          }
        } else {
          // Phase 3: End of Clock - Begins movement towards next machine
          imgs.forEach((img, idx) => {
            img.style.display = idx === cake.fallingStage ? 'block' : 'none';
            img.style.transform = 'translateY(0px) scale(1)';
          });
          entity.badge.textContent = 'PKG#' + cake.id + ' (' + STAGE_NAMES[cake.fallingStage] + ')';
          entity.badge.className = 'text-[9px] font-mono font-bold px-2 py-0.5 rounded-full mb-1 border shadow-sm ' + BADGE_STYLES[cake.fallingStage];
        }
      }

      // Conveyor tread & rollers synchronized to movement phases
      if (!reducedMotion.matches) {
        const travel = getBeltTravel(pipeliningEnabled ? 'pipeline' : 'sequential', activeCycle, u) * spacing;
        belt!.style.backgroundPosition = '-' + (travel % 96) + 'px 0';
        rollers!.forEach(roller => { roller.style.transform = 'rotate(' + (travel * 360 / 96 % 360) + 'deg)'; });
      }

      // Overhead machine pulse glow effects
      const inPulse = u >= 0.25 && u <= 0.75;
      if (pipeliningEnabled) {
        if (m1Ref.current) {
          m1Ref.current.style.filter = (inPulse && activeCakes.some(c => c.sMid === 1 && c.fallingStage === 1))
            ? 'drop-shadow(0 0 16px rgba(245, 158, 11, 0.85))'
            : '';
        }
        if (m2Ref.current) {
          m2Ref.current.style.filter = (inPulse && activeCakes.some(c => c.sMid === 0 && c.fallingStage === 2))
            ? 'drop-shadow(0 0 16px rgba(244, 63, 94, 0.85))'
            : '';
        }
        if (m3Ref.current) {
          m3Ref.current.style.filter = (inPulse && activeCakes.some(c => c.sMid === -1 && c.fallingStage === 3))
            ? 'drop-shadow(0 0 16px rgba(168, 85, 247, 0.85))'
            : '';
        }
      }

      animationId = requestAnimationFrame(render);
    }
    animationId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationId);
      track.replaceChildren();
    };
  }, [pipeliningEnabled]);

  // Color theme for the single machine during its 3 stages
  const getSingleMachineTheme = () => {
    switch (singleMachineStage) {
      case 1: // Cake Stage
        return {
          step: 'STEP 1 / 3',
          stepBadge: 'bg-amber-100 text-amber-900 border-amber-300',
          title: '🔥 STAGE 1: BAKE (SPONGE)',
          titleColor: 'text-amber-700',
          label: 'STAGE 1: BAKE (🔥 CAKE)',
          badgeClass: 'bg-amber-500 text-amber-950 border-amber-300 shadow-amber-500/50',
          glowClass: 'border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.7)] ring-4 ring-amber-400/40',
          desc: 'Baking golden sponge cake onto plate...',
          opText: '1 of 3 (Bake)',
          opColor: 'text-amber-700',
        };
      case 2: // Glaze Stage
        return {
          step: 'STEP 2 / 3',
          stepBadge: 'bg-pink-100 text-pink-900 border-pink-300',
          title: '🧁 STAGE 2: GLAZE (FROSTING)',
          titleColor: 'text-pink-700',
          label: 'STAGE 2: GLAZE (🧁 FROSTING)',
          badgeClass: 'bg-pink-500 text-white border-pink-300 shadow-pink-500/50',
          glowClass: 'border-pink-400 shadow-[0_0_35px_rgba(244,63,94,0.7)] ring-4 ring-pink-400/40',
          desc: 'Applying strawberry glaze, sprinkles & cherry...',
          opText: '2 of 3 (Glaze)',
          opColor: 'text-pink-700',
        };
      case 0: // Box Stage
        return {
          step: 'STEP 3 / 3',
          stepBadge: 'bg-purple-100 text-purple-900 border-purple-300',
          title: '📦 STAGE 3: BOX (PACKAGING)',
          titleColor: 'text-purple-700',
          label: 'STAGE 3: BOX (📦 PACKAGING)',
          badgeClass: 'bg-purple-600 text-white border-purple-300 shadow-purple-500/50',
          glowClass: 'border-purple-400 shadow-[0_0_35px_rgba(168,85,247,0.7)] ring-4 ring-purple-400/40',
          desc: 'Packaging cake in display box before moving out...',
          opText: '3 of 3 (Box Complete)',
          opColor: 'text-purple-700',
        };
      default:
        return {
          step: 'READY',
          stepBadge: 'bg-slate-100 text-slate-700 border-slate-300',
          title: 'READY',
          titleColor: 'text-slate-700',
          label: 'READY',
          badgeClass: 'bg-slate-500 text-white',
          glowClass: '',
          desc: 'Ready for next cake...',
          opText: 'Waiting for plate...',
          opColor: 'text-slate-600',
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
            <span className="text-purple-700 font-black text-sm" data-testid="pipeline-cycles">#{cycleCount}</span>
          </div>

          {/* Throughput Metric */}
          <div className="bg-pink-100/80 border border-pink-300 px-3.5 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 text-pink-900 font-bold">
            <span>TOTAL PRODUCED:</span>
            <span className="text-pink-700 font-black text-sm" data-testid="pipeline-produced">{cakesCompleted} cakes</span>
          </div>

          {/* Efficiency Metric */}
          <div className="bg-emerald-100/80 border border-emerald-300 px-3.5 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 text-emerald-900 font-bold">
            <span>STEADY-STATE CYCLES PER CAKE:</span>
            <span className="text-emerald-700 font-black text-sm">
              {pipeliningEnabled ? '1' : '3'}
            </span>
          </div>

          {/* Clock Frequency Pill */}
          <div className="bg-white border-2 border-purple-300 px-3.5 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 text-purple-900 font-bold shadow-sm">
            <span>DISPLAY SPEED:</span>
            <span className="text-purple-700 font-black">{clockSpeed.toFixed(2)} cycles/sec</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-purple-200 bg-white/90 p-4 text-purple-950">
        <p><strong>First cake: 3 processing cycles in either mode.</strong> Produced means all three stages finished; boxed cakes then travel out for delivery.</p>
        <p className="mt-2">Observed so far: {cycleCount ? (cakesCompleted / cycleCount).toFixed(2) : '0.00'} cakes/cycle. The pipeline must fill before reaching its steady rate.</p>
        <label className="mt-3 flex flex-wrap items-center gap-3 font-bold">
          Display speed {hardwareControlled ? '(Pico controlled)' : '(manual)'}
          <input aria-label="Pipeline display speed" className="h-12 w-56 max-w-full accent-purple-700" type="range" min="1" max="5" step="0.05" value={clockSpeed} disabled={hardwareControlled} onChange={event => onSetSpeed?.(Number(event.target.value))} />
        </label>
        <p className="text-sm">Changing mode starts again with an empty belt and zero counters.</p>
        <p className="mt-2 text-sm md:hidden">Swipe the bakery sideways to see all three stations.</p>
      </div>

      {/* Preserve station spacing on narrow screens, with scrollable delivery. */}
      <div className="overflow-x-auto rounded-2xl" tabIndex={0} aria-label="Pipeline bakery; scroll sideways on small screens">
      <div
        className={`relative w-full ${pipeliningEnabled ? 'min-w-[620px]' : ''} h-[440px] rounded-2xl border-4 border-[#c084fc] overflow-hidden shadow-inner bg-cover bg-center transition-all duration-300`}
        style={{ backgroundImage: `url('/sprites/purble_background.png')` }}
      >
        {/* TOP ZONE: Overhead Machines (Centered using exact station offsets) */}
        {pipeliningEnabled ? (
          /* PIPELINED MODE: 3 Dedicated Machines in Series (Right to Left: Cake -> Frosting -> Box) */
          <div className="w-full absolute top-0 left-0 h-40 pointer-events-none z-10 select-none">
            {/* Machine 3: Box (Left: -190px from center) */}
            <div
              ref={m3Ref}
              className="absolute top-0 flex flex-col items-center pointer-events-auto transition-all duration-200"
              style={{ left: 'calc(50% - 190px)', transform: 'translateX(-50%)', width: '130px' }}
            >
              <span className="text-[10px] font-mono font-black text-purple-900 bg-purple-200/95 border border-purple-400 px-2.5 py-0.5 rounded-lg mb-1 shadow-sm">
                STAGE 3: BOX
              </span>
              <img
                src="/sprites/dispenser_sprinkles.png"
                alt="Packaging Machine"
                className="w-32 h-36 object-contain object-top filter drop-shadow-xl"
              />
            </div>

            {/* Machine 2: Glaze (Center: 0px from center) */}
            <div
              ref={m2Ref}
              className="absolute top-0 flex flex-col items-center pointer-events-auto transition-all duration-200"
              style={{ left: '50%', transform: 'translateX(-50%)', width: '130px' }}
            >
              <span className="text-[10px] font-mono font-black text-pink-900 bg-pink-200/95 border border-pink-400 px-2.5 py-0.5 rounded-lg mb-1 shadow-sm">
                STAGE 2: GLAZE
              </span>
              <img
                src="/sprites/dispenser_icing.png"
                alt="Frosting Machine"
                className="w-32 h-36 object-contain object-top filter drop-shadow-xl"
              />
            </div>

            {/* Machine 1: Cake (Right: +190px from center) */}
            <div
              ref={m1Ref}
              className="absolute top-0 flex flex-col items-center pointer-events-auto transition-all duration-200"
              style={{ left: 'calc(50% + 190px)', transform: 'translateX(-50%)', width: '130px' }}
            >
              <span className="text-[10px] font-mono font-black text-amber-900 bg-amber-200/95 border border-amber-400 px-2.5 py-0.5 rounded-lg mb-1 shadow-sm">
                STAGE 1: BAKE
              </span>
              <img
                src="/sprites/dispenser_batter.png"
                alt="Cake Machine"
                className="w-32 h-36 object-contain object-top filter drop-shadow-xl"
              />
            </div>
          </div>
        ) : (
          /* NON-PIPELINED MODE: 1 Single Machine that Changes Colors Every Step */
          <div className="w-full absolute top-0 left-0 h-40 pointer-events-none z-10 select-none">
            {/* Dedicated Text Box on the Side */}
            <div className="absolute top-3 left-4 md:left-6 pointer-events-auto z-20 w-64 bg-white/95 backdrop-blur-md border-2 border-purple-300 rounded-2xl p-3 shadow-xl flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-purple-100 pb-1.5">
                <span className="text-[10px] font-mono font-black text-purple-900 flex items-center gap-1.5">
                  <span>⚙️</span> SINGLE MACHINE CONTROLLER
                </span>
                <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-lg border ${machineTheme.stepBadge}`}>
                  {machineTheme.step}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className={`text-xs font-mono font-black tracking-wide ${machineTheme.titleColor}`}>
                  {machineTheme.title}
                </span>
                <p className="text-[11px] font-medium text-slate-700 leading-snug">
                  {machineTheme.desc}
                </p>
              </div>
              <div className="bg-purple-50/80 rounded-xl p-2 border border-purple-200 text-[10px] font-mono text-purple-900 flex flex-col gap-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Operation:</span>
                  <span className={`font-bold ${machineTheme.opColor}`}>{machineTheme.opText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Execution:</span>
                  <span className="font-bold text-slate-700">Multi-Cycle Latency</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CPI (Latency):</span>
                  <span className="font-bold text-indigo-700">3.00 cycles / cake</span>
                </div>
              </div>
            </div>

            {/* Single Machine (Center) */}
            <div
              className="absolute top-0 flex flex-col items-center pointer-events-auto"
              style={{ left: '50%', transform: 'translateX(-50%)', width: '150px' }}
            >
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
                  className="w-36 h-36 object-contain object-top filter drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* ELEVATED CONVEYOR BELT ASSEMBLY (Moved Higher Up, bottom at 95px) */}
        <div className="w-full absolute z-20" style={{ bottom: '95px' }}>
          {/* Moving Cakes Track */}
          <div className="relative h-28 pointer-events-none w-full z-20">
            <div ref={trackRef} data-testid="pipeline-track" className="w-full h-full relative z-20" />
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

          {/* Authentic Purble Place Conveyor Support Legs (anchored to floor) */}
          <div className="w-full h-24 flex justify-around px-16 pointer-events-none absolute top-full left-0 z-0">
            <div className="w-4 h-full bg-gradient-to-b from-slate-700 to-slate-900 rounded-b shadow-lg border-x border-slate-600" />
            <div className="w-4 h-full bg-gradient-to-b from-slate-700 to-slate-900 rounded-b shadow-lg border-x border-slate-600" />
            <div className="w-4 h-full bg-gradient-to-b from-slate-700 to-slate-900 rounded-b shadow-lg border-x border-slate-600" />
            <div className="w-4 h-full bg-gradient-to-b from-slate-700 to-slate-900 rounded-b shadow-lg border-x border-slate-600" />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
