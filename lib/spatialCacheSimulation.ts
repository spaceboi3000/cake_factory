export type SpatialIngredient = 'A' | 'B' | 'C' | 'D';
export type PantryPair = readonly [SpatialIngredient, SpatialIngredient];

export const PANTRY_PAIRS: readonly PantryPair[] = [['A', 'B'], ['C', 'D']];
export const SPATIAL_MIXED_ORDERS: readonly SpatialIngredient[] = ['A', 'C', 'B', 'D', 'A', 'C', 'B', 'D'];
export const SPATIAL_TEMPORAL_ORDERS: readonly SpatialIngredient[] = ['A', 'A', 'C', 'C', 'B', 'B', 'D', 'D'];
export const SPATIAL_NEIGHBOR_ORDERS: readonly SpatialIngredient[] = ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D'];
export const SPATIAL_BOTH_ORDERS: readonly SpatialIngredient[] = ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D'];
export const SPATIAL_CYCLE_MS = 600;
const FETCH_WAITS = 3;

export interface SpatialAccess {
  ingredient: SpatialIngredient;
  hit: boolean;
  explanation: 'same item again' | 'neighbor brought along' | null;
  completedAt: number | null;
}

interface PendingAccess {
  ingredient: SpatialIngredient;
  pair: PantryPair;
  waitsLeft: number;
  hit: boolean;
  evicted: PantryPair | null;
}

export interface SpatialCacheState {
  orders: SpatialIngredient[];
  status: 'idle' | 'running' | 'paused' | 'complete';
  cycles: number;
  cakes: number;
  hits: number;
  misses: number;
  shelf: PantryPair | null;
  seenInPair: SpatialIngredient[];
  pending: PendingAccess | null;
  accesses: SpatialAccess[];
  lastCycle: {
    order: number;
    ingredient: SpatialIngredient;
    kind: 'wait' | 'bake';
    hit: boolean;
    explanation: SpatialAccess['explanation'];
    waitNumber: number;
    arriving: PantryPair | null;
    evicted: PantryPair | null;
  } | null;
}

export function pairFor(ingredient: SpatialIngredient): PantryPair {
  return PANTRY_PAIRS.find(pair => pair.includes(ingredient))!;
}

export function createSpatialCacheState(orders: readonly SpatialIngredient[] = SPATIAL_MIXED_ORDERS): SpatialCacheState {
  return {
    orders: [...orders], status: 'idle', cycles: 0, cakes: 0, hits: 0, misses: 0,
    shelf: null, seenInPair: [], pending: null, accesses: [], lastCycle: null,
  };
}

export function advanceSpatialCacheCycle(state: SpatialCacheState): SpatialCacheState {
  if (state.cakes === state.orders.length) return state;
  const next: SpatialCacheState = {
    ...state, cycles: state.cycles + 1,
    seenInPair: [...state.seenInPair], accesses: state.accesses.map(access => ({ ...access })),
  };
  let pending = state.pending ? { ...state.pending } : null;
  if (!pending) {
    const ingredient = state.orders[state.cakes];
    const pair = pairFor(ingredient);
    const hit = state.shelf?.[0] === pair[0];
    pending = { ingredient, pair, hit, waitsLeft: hit ? 0 : FETCH_WAITS, evicted: hit ? null : state.shelf };
    next.hits += hit ? 1 : 0;
    next.misses += hit ? 0 : 1;
    next.accesses.push({ ingredient, hit, explanation: null, completedAt: null });
  }

  if (pending.waitsLeft > 0) {
    pending.waitsLeft--;
    const arrived = pending.waitsLeft === 0;
    if (arrived) {
      next.shelf = pending.pair;
      next.seenInPair = [];
    }
    next.lastCycle = {
      order: state.cakes, ingredient: pending.ingredient, kind: 'wait', hit: false,
      explanation: null, waitNumber: FETCH_WAITS - pending.waitsLeft,
      arriving: arrived ? pending.pair : null, evicted: arrived ? pending.evicted : null,
    };
    next.pending = pending;
  } else {
    const explanation = pending.hit
      ? next.seenInPair.includes(pending.ingredient) ? 'same item again' : 'neighbor brought along'
      : null;
    next.seenInPair = next.seenInPair.includes(pending.ingredient)
      ? next.seenInPair : [...next.seenInPair, pending.ingredient];
    next.lastCycle = {
      order: state.cakes, ingredient: pending.ingredient, kind: 'bake', hit: pending.hit,
      explanation, waitNumber: 0, arriving: null, evicted: null,
    };
    next.cakes++;
    next.accesses[next.accesses.length - 1].explanation = explanation;
    next.accesses[next.accesses.length - 1].completedAt = next.cycles;
    next.pending = null;
    if (next.cakes === next.orders.length) next.status = 'complete';
  }
  return next;
}

export type SpatialCacheAction =
  | { type: 'run' | 'pause' | 'tick' | 'step' | 'reset' }
  | { type: 'swap'; first: number; second: number }
  | { type: 'restoreMixed' };

export function spatialCacheReducer(state: SpatialCacheState, action: SpatialCacheAction): SpatialCacheState {
  switch (action.type) {
    case 'reset': return createSpatialCacheState(state.orders);
    case 'run': return state.status === 'complete' ? state : { ...state, status: 'running' };
    case 'pause': return state.status === 'running' ? { ...state, status: 'paused' } : state;
    case 'tick': return state.status === 'running' ? advanceSpatialCacheCycle(state) : state;
    case 'step': return state.status === 'running' || state.status === 'complete' ? state : advanceSpatialCacheCycle({ ...state, status: 'paused' });
    case 'restoreMixed': return state.status === 'idle' ? createSpatialCacheState() : state;
    case 'swap': {
      if (state.status !== 'idle' || state.orders[action.first] === undefined || state.orders[action.second] === undefined) return state;
      const orders = [...state.orders];
      [orders[action.first], orders[action.second]] = [orders[action.second], orders[action.first]];
      return createSpatialCacheState(orders);
    }
  }
}

export function runSpatialCacheTrace(orders: readonly SpatialIngredient[]): SpatialCacheState {
  let state = createSpatialCacheState(orders);
  while (state.status !== 'complete') state = advanceSpatialCacheCycle(state);
  return state;
}
