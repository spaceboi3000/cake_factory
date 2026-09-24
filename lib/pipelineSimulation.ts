export type PipelineMode = 'sequential' | 'pipeline';
export interface PipelineCake {
  id: number;
  stage: number; // Number of completed processing stages, capped at three.
  position: number; // Station units from the center; delivery travels left.
  previousPosition: number;
}
export interface PipelineState {
  mode: PipelineMode;
  cycles: number;
  produced: number;
  nextId: number;
  cakes: PipelineCake[];
  completedThisCycle: number[];
}

// Also used on mode changes: processing, delivery and counters all start empty.
export function createPipelineState(mode: PipelineMode = 'sequential'): PipelineState {
  return { mode, cycles: 0, produced: 0, nextId: 101, cakes: [], completedThisCycle: [] };
}

export function advancePipelineCycle(state: PipelineState): PipelineState {
  const completedThisCycle: number[] = [];
  const cakes = state.cakes.map(cake => ({ ...cake, previousPosition: cake.position }));
  let nextId = state.nextId;
  // Completed cakes continue delivering, but can never re-enter processing.
  for (const cake of cakes) {
    if (cake.stage === 3) cake.position--;
    else if (state.mode === 'pipeline') cake.position--;
  }
  if (state.mode === 'pipeline' || !cakes.some(cake => cake.stage < 3)) {
    const position = state.mode === 'pipeline' ? 1 : 0;
    const previousPosition = state.mode === 'pipeline' ? 2 : 1;
    cakes.push({ id: nextId++, stage: 0, position, previousPosition });
  }
  for (const cake of cakes) {
    if (cake.stage < 3) {
      cake.stage++;
      if (cake.stage === 3) completedThisCycle.push(cake.id);
    }
  }
  return {
    ...state, cycles: state.cycles + 1, nextId,
    produced: state.produced + completedThisCycle.length,
    cakes: cakes.filter(cake => cake.position >= -3), completedThisCycle,
  };
}

export interface PipelineClock { simulation: PipelineState; phase: number }
export function createPipelineClock(mode: PipelineMode): PipelineClock {
  return { simulation: createPipelineState(mode), phase: 0 };
}

// Display speed affects elapsed wall time only, never the processing schedule.
export function advancePipelineClock(clock: PipelineClock, seconds: number, speed: number): PipelineClock {
  let phase = clock.phase + Math.max(0, seconds) * Math.max(1, Math.min(5, speed));
  let simulation = clock.simulation;
  while (phase >= 1) {
    phase -= 1;
    simulation = advancePipelineCycle(simulation);
  }
  return { simulation, phase };
}

export interface ActivePipelineCake {
  id: number;
  baseStage: number;     // 0: Plate, 1: Baked, 2: Glazed, 3: Boxed
  fallingStage: number;  // 0: none, 1: Bake, 2: Glaze, 3: Box
  sFrom: number;         // Station moving from
  sMid: number;          // Station during pulse
  sTo: number;           // Station moving to
  isStalled?: boolean;   // True when line is stalled
}

export function getActivePipelineCakes(mode: PipelineMode, currentCycle: number): ActivePipelineCake[] {
  const cakes: ActivePipelineCake[] = [];
  if (currentCycle < 1) return cakes;

  if (mode === 'pipeline') {
    for (let age = 1; age <= Math.min(5, currentCycle); age++) {
      const id = 100 + currentCycle - age + 1;
      if (age === 1) {
        cakes.push({ id, baseStage: 0, fallingStage: 1, sFrom: 2, sMid: 1, sTo: 0 });
      } else if (age === 2) {
        cakes.push({ id, baseStage: 1, fallingStage: 2, sFrom: 1, sMid: 0, sTo: -1 });
      } else if (age === 3) {
        cakes.push({ id, baseStage: 2, fallingStage: 3, sFrom: 0, sMid: -1, sTo: -2 });
      } else if (age === 4) {
        cakes.push({ id, baseStage: 3, fallingStage: 0, sFrom: -1, sMid: -2, sTo: -3 });
      } else if (age === 5) {
        cakes.push({ id, baseStage: 3, fallingStage: 0, sFrom: -2, sMid: -3, sTo: -4 });
      }
    }
  } else {
    const id = 101 + Math.floor((currentCycle - 1) / 3);
    const step = ((currentCycle - 1) % 3) + 1;
    if (step === 1) {
      cakes.push({ id, baseStage: 0, fallingStage: 1, sFrom: 1, sMid: 0, sTo: 0, isStalled: false });
    } else if (step === 2) {
      // Step 2 (Glaze): Active cake stays under machine, and the line STALLS (next plate waits at station 1)
      cakes.push({ id, baseStage: 1, fallingStage: 2, sFrom: 0, sMid: 0, sTo: 0, isStalled: false });
      cakes.push({ id: id + 1, baseStage: 0, fallingStage: 0, sFrom: 1, sMid: 1, sTo: 1, isStalled: true });
    } else if (step === 3) {
      // Step 3 (Boxing): Cake stays stationary under machine while box drops; line remains STALLED
      cakes.push({ id, baseStage: 2, fallingStage: 3, sFrom: 0, sMid: 0, sTo: 0, isStalled: false });
      cakes.push({ id: id + 1, baseStage: 0, fallingStage: 0, sFrom: 1, sMid: 1, sTo: 1, isStalled: true });
    }
    if (currentCycle > 3) {
      const prevId = id - 1;
      if (step === 1) {
        // Step 1: previous boxed cake moves out of machine to delivery exit
        cakes.push({ id: prevId, baseStage: 3, fallingStage: 0, sFrom: 0, sMid: -1, sTo: -2, isStalled: false });
      }
    }
  }
  return cakes;
}

