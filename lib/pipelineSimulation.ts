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
    cakes.push({ id: nextId++, stage: 0, position, previousPosition: position });
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
