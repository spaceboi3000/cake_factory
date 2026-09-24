export type Ingredient = 'A' | 'B' | 'C';
export const MIXED_ORDERS: readonly Ingredient[] = ['A', 'B', 'C', 'A', 'B', 'C'];
export const GROUPED_ORDERS: readonly Ingredient[] = ['A', 'A', 'B', 'B', 'C', 'C'];
export const FETCH_CYCLES = 3;
export const CACHE_CYCLE_MS = 600;

export interface Access {
  ingredient: Ingredient;
  hit: boolean;
  cycle: number;
  completedAt: number | null;
}
interface ShelfEntry { ingredient: Ingredient; lastUsed: number }
interface Pending {
  ingredient: Ingredient;
  slot: number;
  waitsLeft: number;
  hit: boolean;
  evicted: Ingredient | null;
}
export interface CacheState {
  orders: Ingredient[];
  status: 'idle' | 'running' | 'paused' | 'complete';
  cycles: number;
  cakes: number;
  hits: number;
  misses: number;
  shelf: (ShelfEntry | null)[];
  pending: Pending | null;
  accesses: Access[];
  lastCycle: {
    order: number;
    kind: 'wait' | 'bake';
    hit: boolean;
    waitNumber: number;
    evicted: Ingredient | null;
  } | null;
}

export function createCacheState(orders: readonly Ingredient[] = MIXED_ORDERS): CacheState {
  return {
    orders: [...orders], status: 'idle', cycles: 0, cakes: 0, hits: 0, misses: 0,
    shelf: [null, null], pending: null, accesses: [], lastCycle: null,
  };
}

// Exactly one simulated cycle. Fetching occupies three full cycles; baking
// occupies the next one. Ingredients remain in their physical slot after use.
export function advanceCacheCycle(state: CacheState): CacheState {
  if (state.cakes === state.orders.length) return state;
  const next: CacheState = {
    ...state, cycles: state.cycles + 1, shelf: [...state.shelf],
    accesses: state.accesses.map(access => ({ ...access })),
  };
  let pending = state.pending ? { ...state.pending } : null;
  if (!pending) {
    const ingredient = state.orders[state.cakes];
    let slot = state.shelf.findIndex(entry => entry?.ingredient === ingredient);
    const hit = slot !== -1;
    if (!hit) {
      slot = state.shelf.findIndex(entry => entry === null);
      if (slot === -1) {
        slot = state.shelf[0]!.lastUsed <= state.shelf[1]!.lastUsed ? 0 : 1;
      }
    }
    pending = {
      ingredient, slot, hit, waitsLeft: hit ? 0 : FETCH_CYCLES,
      evicted: hit ? null : state.shelf[slot]?.ingredient ?? null,
    };
    next.hits += hit ? 1 : 0;
    next.misses += hit ? 0 : 1;
    next.accesses.push({ ingredient, hit, cycle: next.cycles, completedAt: null });
  }

  if (pending.waitsLeft > 0) {
    pending.waitsLeft--;
    if (pending.waitsLeft === 0) {
      next.shelf[pending.slot] = { ingredient: pending.ingredient, lastUsed: next.cycles };
    }
    next.lastCycle = {
      order: state.cakes, kind: 'wait', hit: false,
      waitNumber: FETCH_CYCLES - pending.waitsLeft,
      evicted: pending.waitsLeft === 0 ? pending.evicted : null,
    };
    next.pending = pending;
  } else {
    next.shelf[pending.slot] = { ingredient: pending.ingredient, lastUsed: next.cycles };
    next.lastCycle = { order: state.cakes, kind: 'bake', hit: pending.hit, waitNumber: 0, evicted: null };
    next.cakes++;
    next.accesses[next.accesses.length - 1].completedAt = next.cycles;
    next.pending = null;
    if (next.cakes === next.orders.length) next.status = 'complete';
  }
  return next;
}

export type CacheAction =
  | { type: 'run' | 'pause' | 'tick' | 'step' | 'reset' }
  | { type: 'preset'; orders: readonly Ingredient[] }
  | { type: 'swap'; first: number; second: number };

export function cacheReducer(state: CacheState, action: CacheAction): CacheState {
  switch (action.type) {
    case 'reset': return createCacheState(state.orders);
    case 'run': return state.status === 'complete' ? state : { ...state, status: 'running' };
    case 'pause': return state.status === 'running' ? { ...state, status: 'paused' } : state;
    case 'tick': return state.status === 'running' ? advanceCacheCycle(state) : state;
    case 'step': return state.status === 'running' || state.status === 'complete'
      ? state : advanceCacheCycle({ ...state, status: 'paused' });
    case 'preset': return state.status === 'idle' ? createCacheState(action.orders) : state;
    case 'swap': {
      if (state.status !== 'idle' || !state.orders[action.first] || !state.orders[action.second]) return state;
      const orders = [...state.orders];
      [orders[action.first], orders[action.second]] = [orders[action.second], orders[action.first]];
      return createCacheState(orders);
    }
  }
}

// Reference comparisons replay the very same transitions as the live game.
export function runCacheTrace(orders: readonly Ingredient[]): CacheState {
  let state = createCacheState(orders);
  while (state.cakes < state.orders.length) state = advanceCacheCycle(state);
  return state;
}
