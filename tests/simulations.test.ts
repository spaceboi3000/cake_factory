import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cacheLessonReducer, createCacheLesson, TOPPINGS, type CacheLesson } from '../lib/cacheLesson';
import {
  MIXED_ORDERS, GROUPED_ORDERS, advanceCacheCycle, cacheReducer, createCacheState, runCacheTrace,
} from '../lib/cacheSimulation';
import {
  advancePipelineClock, advancePipelineCycle, createPipelineClock, createPipelineState,
  type PipelineMode,
} from '../lib/pipelineSimulation';

function finishLesson(lesson: CacheLesson): CacheLesson {
  while (lesson.simulation.status !== 'complete') lesson = cacheLessonReducer(lesson, { type: 'step' });
  return lesson;
}

test('lesson starts with six requested cakes, two per named topping, and no hint access', () => {
  const lesson = createCacheLesson();
  assert.deepEqual(lesson.simulation.orders, MIXED_ORDERS);
  assert.deepEqual(lesson.simulation.orders.map(id => TOPPINGS[id].name), ['Strawberry', 'Chocolate', 'Vanilla', 'Strawberry', 'Chocolate', 'Vanilla']);
  assert.equal(lesson.hasCompletedRound, false);
  assert.equal(lesson.hintRevealed, false);
  assert.equal(cacheLessonReducer(lesson, { type: 'revealHint' }), lesson);
  assert.equal(cacheLessonReducer(lesson, { type: 'useHint' }), lesson);
});

test('first mixed result unlocks the optional hint without revealing the answer; Reset retains availability', () => {
  let lesson = finishLesson(createCacheLesson());
  assert.equal(lesson.simulation.cycles, 24);
  assert.equal(lesson.hasCompletedRound, true);
  assert.equal(lesson.hintRevealed, false);
  lesson = cacheLessonReducer(lesson, { type: 'reset' });
  assert.deepEqual(lesson.simulation, createCacheState());
  assert.equal(lesson.hasCompletedRound, true);
  assert.equal(lesson.hintRevealed, false);
  const before = lesson.simulation;
  lesson = cacheLessonReducer(lesson, { type: 'revealHint' });
  assert.equal(lesson.hintRevealed, true);
  assert.equal(lesson.simulation, before, 'revealing teaching material does not change the round');
  lesson = cacheLessonReducer(lesson, { type: 'reset' });
  assert.equal(lesson.hintRevealed, true);
});

test('swapping preserves the six requested toppings; only completing a changed self-arrangement auto-reveals', () => {
  let lesson = cacheLessonReducer(createCacheLesson(), { type: 'swap', first: 1, second: 3 });
  assert.deepEqual([...lesson.simulation.orders].sort(), [...MIXED_ORDERS].sort());
  assert.equal(lesson.source, 'self');
  assert.equal(lesson.hintRevealed, false);
  const orders = [...lesson.simulation.orders];
  lesson = cacheLessonReducer(lesson, { type: 'step' });
  assert.equal(lesson.hintRevealed, false);
  lesson = cacheLessonReducer(lesson, { type: 'reset' });
  assert.deepEqual(lesson.simulation.orders, orders);
  assert.equal(lesson.source, 'self');
  lesson = finishLesson(lesson);
  assert.equal(lesson.hasCompletedRound, true);
  assert.equal(lesson.hintRevealed, true);
  assert.equal(lesson.source, 'self');
  assert.deepEqual(lesson.simulation, runCacheTrace(orders));
});

test('same-topping swaps, undoing swaps and restoring mixed do not auto-reveal', () => {
  let lesson = cacheLessonReducer(createCacheLesson(), { type: 'swap', first: 0, second: 3 });
  assert.equal(finishLesson(lesson).hintRevealed, false);
  lesson = cacheLessonReducer(createCacheLesson(), { type: 'swap', first: 0, second: 1 });
  lesson = cacheLessonReducer(lesson, { type: 'swap', first: 0, second: 1 });
  assert.equal(finishLesson(lesson).hintRevealed, false);
  lesson = cacheLessonReducer(createCacheLesson(), { type: 'swap', first: 0, second: 1 });
  lesson = cacheLessonReducer(lesson, { type: 'restoreMixed' });
  assert.equal(finishLesson(lesson).hintRevealed, false);
});

test('hint examples require reveal, remain labeled assisted through Reset/swaps, and use the unchanged model', () => {
  let lesson = finishLesson(createCacheLesson());
  lesson = cacheLessonReducer(lesson, { type: 'reset' });
  assert.equal(cacheLessonReducer(lesson, { type: 'useHint' }), lesson);
  lesson = cacheLessonReducer(lesson, { type: 'revealHint' });
  lesson = cacheLessonReducer(lesson, { type: 'useHint' });
  assert.equal(lesson.source, 'hint');
  assert.deepEqual(lesson.simulation.orders, GROUPED_ORDERS);
  lesson = finishLesson(lesson);
  assert.equal(lesson.simulation.cycles, 15);
  assert.equal(lesson.simulation.misses, 3);
  lesson = cacheLessonReducer(lesson, { type: 'reset' });
  assert.equal(lesson.source, 'hint');
  assert.equal(lesson.hintRevealed, true);
  assert.deepEqual(lesson.simulation, createCacheState(GROUPED_ORDERS));
  lesson = cacheLessonReducer(lesson, { type: 'swap', first: 0, second: 2 });
  assert.equal(lesson.source, 'hint');
  lesson = cacheLessonReducer(lesson, { type: 'restoreMixed' });
  assert.equal(lesson.source, 'mixed');
  assert.equal(lesson.hintRevealed, true);
});

test('lesson controls keep order locked mid-round and a new visit hides the hint', () => {
  let lesson = finishLesson(createCacheLesson());
  lesson = cacheLessonReducer(lesson, { type: 'reset' });
  lesson = cacheLessonReducer(lesson, { type: 'revealHint' });
  lesson = cacheLessonReducer(lesson, { type: 'run' });
  for (const type of ['useHint', 'restoreMixed'] as const) assert.equal(cacheLessonReducer(lesson, { type }), lesson);
  assert.equal(cacheLessonReducer(lesson, { type: 'swap', first: 0, second: 1 }), lesson);
  lesson = cacheLessonReducer(lesson, { type: 'pause' });
  assert.equal(cacheLessonReducer(lesson, { type: 'useHint' }), lesson);
  assert.equal(createCacheLesson().hintRevealed, false);
  assert.equal(createCacheLesson().hasCompletedRound, false);
});

test('mixed orders: six misses, 18 waits, six bakes, 24 cycles', () => {
  let state = createCacheState(MIXED_ORDERS);
  const kinds: string[] = [];
  while (state.status !== 'complete') {
    state = advanceCacheCycle(state);
    kinds.push(state.lastCycle!.kind);
  }
  assert.equal(state.cakes, 6);
  assert.equal(state.hits, 0);
  assert.equal(state.misses, 6);
  assert.equal(state.cycles, 24);
  assert.equal(kinds.filter(kind => kind === 'wait').length, 18);
  assert.equal(kinds.filter(kind => kind === 'bake').length, 6);
  assert.deepEqual(state.accesses.map(access => access.completedAt), [4, 8, 12, 16, 20, 24]);
  assert.deepEqual(state.accesses.map(access => access.hit), [false, false, false, false, false, false]);
  assert.equal(advanceCacheCycle(state), state);
});

test('grouped orders: three misses, three hits, six cakes, 15 cycles', () => {
  const state = runCacheTrace(GROUPED_ORDERS);
  assert.equal(state.cakes, 6);
  assert.equal(state.cycles, 15);
  assert.equal(state.misses, 3);
  assert.equal(state.hits, 3);
  assert.deepEqual(state.accesses.map(access => access.hit), [false, true, false, true, false, true]);
  assert.deepEqual(state.accesses.map(access => access.completedAt), [4, 5, 9, 10, 14, 15]);
});

test('fetch is three visible waits, installs only on arrival, and baking retains the ingredient', () => {
  let state = createCacheState();
  for (let cycle = 1; cycle <= 3; cycle++) {
    const before = structuredClone(state);
    const next = advanceCacheCycle(state);
    assert.deepEqual(state, before, 'transition must not mutate its input');
    state = next;
    assert.equal(state.lastCycle?.waitNumber, cycle);
    assert.equal(state.cakes, 0);
    assert.equal(state.shelf[0]?.ingredient ?? null, cycle === 3 ? 'A' : null);
    assert.equal(state.misses, 1, 'one access, not one miss per waiting cycle');
  }
  state = advanceCacheCycle(state);
  assert.equal(state.cakes, 1);
  assert.equal(state.lastCycle?.kind, 'bake');
  assert.equal(state.shelf[0]?.ingredient, 'A');
});

test('fully associative LRU: a hit refreshes recency, eviction preserves slot identity', () => {
  let state = createCacheState(['A', 'B', 'A', 'C', 'A', 'B']);
  while (state.cycles < 9) state = advanceCacheCycle(state);
  assert.deepEqual(state.shelf.map(entry => entry?.ingredient), ['A', 'B']);
  assert.equal(state.accesses[2].hit, true);
  while (state.cycles < 12) state = advanceCacheCycle(state);
  assert.equal(state.lastCycle?.evicted, 'B', 'B is older despite being inserted after A');
  assert.deepEqual(state.shelf.map(entry => entry?.ingredient), ['A', 'C']);
  while (state.status !== 'complete') state = advanceCacheCycle(state);
  assert.deepEqual(state.accesses.map(access => access.hit), [false, false, true, false, true, false]);
  assert.deepEqual(state.shelf.map(entry => entry?.ingredient), ['A', 'B']);
  assert.equal(state.cycles, 18);
});

test('run/pause/step/reset and locked orders use the actual UI reducer', () => {
  let state = createCacheState();
  assert.equal(cacheReducer(state, { type: 'tick' }), state);
  state = cacheReducer(state, { type: 'preset', orders: GROUPED_ORDERS });
  state = cacheReducer(state, { type: 'swap', first: 0, second: 2 });
  assert.deepEqual(state.orders, ['B', 'A', 'A', 'B', 'C', 'C']);
  const orders = [...state.orders];
  state = cacheReducer(state, { type: 'run' });
  assert.equal(cacheReducer(state, { type: 'swap', first: 0, second: 1 }), state);
  assert.equal(cacheReducer(state, { type: 'preset', orders: MIXED_ORDERS }), state);
  assert.equal(cacheReducer(state, { type: 'step' }), state);
  state = cacheReducer(state, { type: 'tick' });
  state = cacheReducer(state, { type: 'pause' });
  const paused = structuredClone(state);
  assert.equal(cacheReducer(state, { type: 'tick' }), state, 'even a queued timer cannot advance a paused round');
  assert.deepEqual(state, paused);
  state = cacheReducer(state, { type: 'step' });
  assert.equal(state.cycles, 2);
  assert.equal(state.status, 'paused');
  state = cacheReducer(state, { type: 'run' });
  while (state.status !== 'complete') state = cacheReducer(state, { type: 'tick' });
  for (const type of ['tick', 'step', 'run'] as const) assert.equal(cacheReducer(state, { type }), state);
  state = cacheReducer(state, { type: 'reset' });
  assert.deepEqual(state, createCacheState(orders));
  assert.equal(cacheReducer(state, { type: 'tick' }), state, 'queued timer after reset is ignored');
  assert.equal(cacheReducer(state, { type: 'step' }).cycles, 1);
});

for (const mode of ['sequential', 'pipeline'] as const) {
  test(`${mode}: processing completion schedule and no double counts during delivery`, () => {
    let state = createPipelineState(mode);
    const completions: number[] = [];
    const ids = new Set<number>();
    for (let cycle = 1; cycle <= 30; cycle++) {
      const before = structuredClone(state);
      const next = advancePipelineCycle(state);
      assert.deepEqual(state, before);
      state = next;
      for (const id of state.completedThisCycle) {
        assert.equal(ids.has(id), false, `cake ${id} counted twice`);
        ids.add(id);
        completions.push(cycle);
        assert.equal(state.cakes.find(cake => cake.id === id)?.stage, 3);
      }
      assert.equal(state.produced, ids.size);
      assert.ok(state.cakes.length <= 5, 'offscreen cakes are removed');
    }
    assert.deepEqual(completions, mode === 'sequential'
      ? [3, 6, 9, 12, 15, 18, 21, 24, 27, 30]
      : Array.from({ length: 28 }, (_, index) => index + 3));
  });

  for (const speed of [1, 2.35, 5]) {
    test(`${mode}: display speed ${speed} preserves processing cycles`, () => {
      let clock = createPipelineClock(mode);
      const completions: number[] = [];
      while (clock.simulation.cycles < 12) {
        const previous = clock.simulation;
        clock = advancePipelineClock(clock, 0.05, speed);
        if (clock.simulation !== previous && clock.simulation.completedThisCycle.length) {
          completions.push(clock.simulation.cycles);
        }
      }
      assert.deepEqual(completions, mode === 'sequential' ? [3, 6, 9, 12] : [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
  }
}

test('mode reset clears counters, delivery entities, IDs and partial animation phase', () => {
  let clock = createPipelineClock('sequential');
  for (const mode of ['pipeline', 'sequential', 'pipeline'] as PipelineMode[]) {
    clock = advancePipelineClock(clock, 9.25, 1);
    assert.ok(clock.simulation.produced > 0);
    assert.ok(clock.phase > 0);
    clock = createPipelineClock(mode);
    assert.deepEqual(clock, { simulation: createPipelineState(mode), phase: 0 });
    clock = advancePipelineClock(clock, 2, 1);
    assert.equal(clock.simulation.produced, 0);
    clock = advancePipelineClock(clock, 1, 1);
    assert.equal(clock.simulation.produced, 1);
    assert.deepEqual(clock.simulation.completedThisCycle, [101]);
  }
});
