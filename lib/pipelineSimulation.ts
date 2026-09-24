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
    cakes: cakes.filter(cake => cake.position >= -5), completedThisCycle,
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
    // Pipelined mode: 3 dedicated dispenser stations (Bake @ +1, Glaze @ 0, Box @ -1)
    // Boxed cakes continue along the delivery conveyor until the edge of the screen (up to station -5)
    for (let age = 1; age <= Math.min(7, currentCycle); age++) {
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
      } else if (age === 6) {
        cakes.push({ id, baseStage: 3, fallingStage: 0, sFrom: -3, sMid: -4, sTo: -5 });
      } else if (age === 7) {
        cakes.push({ id, baseStage: 3, fallingStage: 0, sFrom: -4, sMid: -5, sTo: -6 });
      }
    }
    // Incoming plates feeding the pipeline conveyor from the right (up to station +4)
    for (let k = 1; k <= 3; k++) {
      const incId = 100 + currentCycle + k;
      const sMid = 1 + k;
      cakes.push({
        id: incId,
        baseStage: 0,
        fallingStage: 0,
        sFrom: sMid + 1,
        sMid: sMid,
        sTo: sMid - 1,
        isStalled: false,
      });
    }
  } else {
    // Non-pipelined sequential mode:
    // Single machine at Station 0. Multi-cycle execution:
    // Step 1: Bake (line moves, plate glides from station 1 to 0)
    // Step 2: Glaze (line STALLS, belt stopped, cake stays at station 0)
    // Step 3: Box (line STALLS, belt stopped, cake stays at station 0, box drops)
    const cakeIdx = Math.floor((currentCycle - 1) / 3);
    const activeId = 101 + cakeIdx;
    const step = ((currentCycle - 1) % 3) + 1;

    // 1. Active cake undergoing processing under the single machine
    if (step === 1) {
      cakes.push({ id: activeId, baseStage: 0, fallingStage: 1, sFrom: 1, sMid: 0, sTo: 0, isStalled: false });
    } else if (step === 2) {
      cakes.push({ id: activeId, baseStage: 1, fallingStage: 2, sFrom: 0, sMid: 0, sTo: 0, isStalled: false });
    } else if (step === 3) {
      cakes.push({ id: activeId, baseStage: 2, fallingStage: 3, sFrom: 0, sMid: 0, sTo: 0, isStalled: false });
    }

    // 2. Incoming plates lane: fill up the conveyor before the machine (stations 1 to 5)
    for (let k = 1; k <= 5; k++) {
      const incomingId = activeId + k;
      if (step === 1) {
        // Line moves during setup time (u < 0.25): each plate glides 1 station forward
        cakes.push({
          id: incomingId,
          baseStage: 0,
          fallingStage: 0,
          sFrom: k + 1,
          sMid: k,
          sTo: k,
          isStalled: false,
        });
      } else {
        // Steps 2 & 3: LINE IS STALLED! Zero belt motion. Plates wait in line.
        // Plate at Station 1 is held directly at machine gate with pulsing STALLED badge.
        cakes.push({
          id: incomingId,
          baseStage: 0,
          fallingStage: 0,
          sFrom: k,
          sMid: k,
          sTo: k,
          isStalled: k === 1,
        });
      }
    }

    // 3. Outgoing boxed cakes lane: continue across belt until the edge of the screen (stations -1 down to -5)
    for (let j = 1; j <= 5; j++) {
      const pastId = activeId - j;
      if (pastId >= 101) {
        if (step === 1) {
          // Line moves during setup time (u < 0.25): boxed cakes advance by 1 station to the left
          cakes.push({
            id: pastId,
            baseStage: 3,
            fallingStage: 0,
            sFrom: -(j - 1),
            sMid: -j,
            sTo: -j,
            isStalled: false,
          });
        } else {
          // Steps 2 & 3: Line is stalled; boxed cakes rest stationary on conveyor belt
          cakes.push({
            id: pastId,
            baseStage: 3,
            fallingStage: 0,
            sFrom: -j,
            sMid: -j,
            sTo: -j,
            isStalled: false,
          });
        }
      }
    }
  }
  return cakes;
}

