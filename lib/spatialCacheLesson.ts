import {
  createSpatialCacheState, spatialCacheReducer, SPATIAL_BOTH_ORDERS,
  type SpatialCacheAction, type SpatialCacheState,
} from './spatialCacheSimulation';

export interface SpatialCacheLesson {
  simulation: SpatialCacheState;
  hasAttempt: boolean;
  hintRevealed: boolean;
  hintPractice: boolean;
}

export function createSpatialCacheLesson(): SpatialCacheLesson {
  return { simulation: createSpatialCacheState(), hasAttempt: false, hintRevealed: false, hintPractice: false };
}

export type SpatialLessonAction = SpatialCacheAction | { type: 'revealHint' } | { type: 'tryExample' };

export function spatialCacheLessonReducer(lesson: SpatialCacheLesson, action: SpatialLessonAction): SpatialCacheLesson {
  if (action.type === 'revealHint') return { ...lesson, hintRevealed: true };
  if (action.type === 'tryExample') {
    if (!lesson.hintRevealed || lesson.simulation.status !== 'idle') return lesson;
    return { ...lesson, simulation: createSpatialCacheState(SPATIAL_BOTH_ORDERS), hintPractice: true };
  }
  const simulation = spatialCacheReducer(lesson.simulation, action);
  if (simulation === lesson.simulation) return lesson;
  return {
    ...lesson,
    simulation,
    hasAttempt: lesson.hasAttempt || simulation.status === 'complete',
  };
}
