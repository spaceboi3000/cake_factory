import {
  cacheReducer, createCacheState, GROUPED_ORDERS, MIXED_ORDERS,
  type CacheAction, type CacheState, type Ingredient,
} from './cacheSimulation';

// Ingredient IDs belong to the simulation, never to orders or visible labels.
export const TOPPINGS: Record<Ingredient | 'D', { name: string; icon: string }> = {
  A: { name: 'Strawberry', icon: '🍓' },
  B: { name: 'Chocolate', icon: '🍫' },
  C: { name: 'Vanilla', icon: '🌼' },
  D: { name: 'Blueberry', icon: '🫐' },
};

export interface CacheLesson {
  simulation: CacheState;
  hasCompletedRound: boolean;
  hintRevealed: boolean;
  source: 'mixed' | 'self' | 'hint';
}

export function createCacheLesson(): CacheLesson {
  return { simulation: createCacheState(), hasCompletedRound: false, hintRevealed: false, source: 'mixed' };
}

export type LessonAction = Exclude<CacheAction, { type: 'preset' }>
  | { type: 'restoreMixed' }
  | { type: 'revealHint' }
  | { type: 'useHint' };

// Visit-level teaching state wraps the unchanged cycle model. Reset only resets
// the simulation; leaving the window unmounts this entire visit.
export function cacheLessonReducer(lesson: CacheLesson, action: LessonAction): CacheLesson {
  if (action.type === 'revealHint') {
    return lesson.hasCompletedRound ? { ...lesson, hintRevealed: true } : lesson;
  }
  if (action.type === 'restoreMixed' || action.type === 'useHint') {
    if (lesson.simulation.status !== 'idle' || (action.type === 'useHint' && !lesson.hintRevealed)) return lesson;
    return {
      ...lesson,
      source: action.type === 'useHint' ? 'hint' : 'mixed',
      simulation: cacheReducer(lesson.simulation, {
        type: 'preset', orders: action.type === 'useHint' ? GROUPED_ORDERS : MIXED_ORDERS,
      }),
    };
  }
  const simulation = cacheReducer(lesson.simulation, action);
  if (simulation === lesson.simulation) return lesson;
  let source = lesson.source;
  if (action.type === 'swap' && source !== 'hint') {
    source = simulation.orders.some((ingredient, index) => ingredient !== MIXED_ORDERS[index]) ? 'self' : 'mixed';
  }
  const justCompleted = simulation.status === 'complete' && lesson.simulation.status !== 'complete';
  return {
    simulation, source,
    hasCompletedRound: lesson.hasCompletedRound || justCompleted,
    hintRevealed: lesson.hintRevealed || (justCompleted && source === 'self'),
  };
}
