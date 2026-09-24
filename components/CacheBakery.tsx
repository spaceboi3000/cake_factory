'use client';

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import {
  CACHE_CYCLE_MS, FETCH_CYCLES, GROUPED_ORDERS, MIXED_ORDERS,
  runCacheTrace, type Ingredient,
} from '../lib/cacheSimulation';
import { cacheLessonReducer, createCacheLesson, TOPPINGS } from '../lib/cacheLesson';
import {
  PANTRY_PAIRS, SPATIAL_BOTH_ORDERS, SPATIAL_CYCLE_MS, SPATIAL_MIXED_ORDERS,
  SPATIAL_NEIGHBOR_ORDERS, SPATIAL_TEMPORAL_ORDERS, runSpatialCacheTrace,
  type SpatialIngredient,
} from '../lib/spatialCacheSimulation';
import { createSpatialCacheLesson, spatialCacheLessonReducer } from '../lib/spatialCacheLesson';

const toppingStyle: Record<Ingredient, string> = {
  A: 'bg-pink-100 border-pink-400 text-pink-950',
  B: 'bg-orange-100 border-amber-800 text-amber-950',
  C: 'bg-yellow-50 border-yellow-400 text-yellow-950',
};
const spatialToppingStyle: Record<SpatialIngredient, string> = {
  A: toppingStyle.A, B: toppingStyle.B, C: toppingStyle.C,
  D: 'bg-blue-100 border-blue-500 text-blue-950',
};
const buttonStyle = 'min-h-12 rounded-2xl border-2 border-purple-300 bg-white px-3 py-2 font-bold text-purple-900 shadow-sm hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50';

function ToppingIcon({ ingredient }: { ingredient: SpatialIngredient }) {
  const topping = TOPPINGS[ingredient];
  return <span role="img" aria-label={`${topping.name} topping`} title={topping.name}>{topping.icon}</span>;
}

function CakeToppingImage({ ingredient, className }: { ingredient: SpatialIngredient; className: string }) {
  return (
    <span className={`relative mx-auto block ${className}`} aria-hidden="true">
      <img src="/sprites/cake.png" alt="" className="h-full w-full object-contain" />
      <span className="absolute right-2 top-[24%] -translate-y-1/2 text-xl leading-none drop-shadow-sm">
        {TOPPINGS[ingredient].icon}
      </span>
    </span>
  );
}

function BakingSequence({ orders }: { orders: readonly SpatialIngredient[] }) {
  return (
    <ol aria-label="Baking order" className="mt-2 flex flex-wrap gap-1 text-lg">
      {orders.map((ingredient, index) => (
        <li key={index} aria-label={`Order ${index + 1}: ${TOPPINGS[ingredient].name}`} className={`rounded-lg border px-2 py-1 ${spatialToppingStyle[ingredient]}`}>
          <ToppingIcon ingredient={ingredient} />
        </li>
      ))}
    </ol>
  );
}

function TemporalLevel({ active, onUnlock }: { active: boolean; onUnlock: () => void }) {
  const [lesson, dispatch] = useReducer(cacheLessonReducer, undefined, createCacheLesson);
  const state = lesson.simulation;
  const [selected, setSelected] = useState<number | null>(null);
  const comparisons = useMemo(() => lesson.hintRevealed ? [
    { name: 'Mixed orders', result: runCacheTrace(MIXED_ORDERS) },
    { name: 'Hint example', result: runCacheTrace(GROUPED_ORDERS) },
  ] : [], [lesson.hintRevealed]);

  useEffect(() => {
    if (!active) {
      if (state.status !== 'idle') dispatch({ type: 'reset' });
      setSelected(null);
      return;
    }
    if (state.status !== 'running') return;
    const timer = window.setInterval(() => dispatch({ type: 'tick' }), CACHE_CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [active, state.status]);

  useEffect(() => { if (lesson.hasCompletedRound) onUnlock(); }, [lesson.hasCompletedRound, onUnlock]);

  const editable = state.status === 'idle';
  const running = state.status === 'running';
  const complete = state.status === 'complete';
  const event = state.lastCycle;
  const currentOrder = event?.order ?? 0;
  const ingredient = state.orders[currentOrder];
  const topping = TOPPINGS[ingredient];
  const waiting = event?.kind === 'wait';
  const statusText = !event ? 'Ready to bake!'
    : waiting ? `Pantry trip — baker waiting. Wait ${event.waitNumber} of ${FETCH_CYCLES}.`
    : `${event.hit ? 'On the shelf! No waiting.' : 'Jar fetched!'} Cake baked.`;

  function chooseOrder(index: number) {
    if (selected === null) setSelected(index);
    else {
      dispatch({ type: 'swap', first: selected, second: index });
      setSelected(null);
    }
  }

  return (
    <section aria-labelledby="cache-title" className={`cache-game flex flex-col gap-4 rounded-3xl border-4 border-purple-200 bg-pink-50 p-3 shadow-2xl md:p-5 ${active ? '' : 'hidden'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 sm:flex-1">
          <p className="text-sm font-bold uppercase tracking-wider text-purple-700">Window 3 · Six cakes, one baker</p>
          <h2 id="cache-title" className="text-2xl font-black text-purple-950 md:text-3xl">The Baker’s Fast Shelf</h2>
          <p id="cache-challenge" className="mt-1 text-base text-purple-900">Six cake orders, two of each topping. Can you make fewer pantry trips?</p>
        </div>
        <span className="rounded-xl border-2 border-purple-200 bg-white px-3 py-2 font-bold text-purple-900" data-testid="cache-status">
          {complete ? 'Round complete' : running ? 'Running' : editable ? 'Ready to arrange' : 'Paused'}
        </span>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="rounded-2xl border-2 border-purple-200 bg-white/90 p-3">
            <p id="order-help" className="mb-3 text-sm font-semibold text-purple-950" aria-live="polite">
              {editable ? selected === null
                ? 'Tap two orders to swap, then press Run.'
                : `Order ${selected + 1} selected. Tap another to swap; tap again to cancel.`
                : 'Orders locked. Reset to rearrange.'}
            </p>
            {lesson.source === 'hint' && <p className="mb-2 text-sm font-bold text-purple-800">Hint-assisted round</p>}
            <div className="grid grid-cols-3 gap-2" aria-label="Six independent cake orders" data-testid="cache-orders">
              {state.orders.map((item, index) => {
                const access = state.accesses[index];
                return (
                  <button key={index} type="button" disabled={!editable} onClick={() => chooseOrder(index)}
                    aria-pressed={selected === index} aria-describedby="order-help"
                    aria-label={`Order ${index + 1}: ${TOPPINGS[item].name} topping cake`}
                    aria-current={event && currentOrder === index ? 'step' : undefined}
                    className={`min-h-24 rounded-2xl border-2 p-2 text-center ${toppingStyle[item]} ${selected === index ? 'ring-4 ring-purple-700 ring-offset-2' : ''} ${event && currentOrder === index ? 'outline outline-4 outline-purple-600' : ''} ${editable ? 'hover:shadow-lg' : ''}`}>
                    <span className="block text-sm font-semibold">Order {index + 1}</span>
                    <span className="relative mx-auto block h-10 w-12" aria-hidden="true">
                      <img src="/sprites/cake.png" alt="" className="h-full w-full object-contain" />
                      <span className="absolute -right-1 -top-1 text-xl">{TOPPINGS[item].icon}</span>
                    </span>
                    <span className="block min-h-5 text-xs font-bold sm:text-sm">
                      {editable ? TOPPINGS[item].name : access ? `${access.completedAt ? '✓ ' : ''}${access.hit ? 'On shelf' : 'Pantry trip'}` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={buttonStyle} disabled={!editable} onClick={() => { dispatch({ type: 'restoreMixed' }); setSelected(null); }}>Restore mixed orders</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Round controls">
            <button disabled={running || complete} onClick={() => { setSelected(null); dispatch({ type: 'run' }); }}
              className={`${buttonStyle} !border-purple-700 !bg-purple-700 !text-white hover:!bg-purple-800`}>
              {state.status === 'paused' ? 'Resume' : 'Run'}
            </button>
            <button className={buttonStyle} disabled={!running} onClick={() => dispatch({ type: 'pause' })}>Pause</button>
            <button className={buttonStyle} disabled={running || complete} onClick={() => { setSelected(null); dispatch({ type: 'step' }); }}>Step one cycle</button>
            <button className={buttonStyle} onClick={() => { dispatch({ type: 'reset' }); setSelected(null); }}>Reset</button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Cakes baked', `${state.cakes} / ${state.orders.length}`, 'cache-cakes'],
              ['Elapsed cycles', state.cycles, 'cache-cycles'],
              ['Pantry trips', state.misses, 'cache-misses'],
              ['Found on shelf', state.hits, 'cache-hits'],
            ].map(([label, value, id]) => (
              <div key={id} className="rounded-2xl border-2 border-purple-200 bg-white p-3 text-purple-950">
                <span className="block text-sm font-bold">{label}</span>
                <strong className="text-3xl tabular-nums" data-testid={id}>{value}</strong>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border-4 border-purple-300 bg-cover bg-center p-3"
            style={{ backgroundImage: "linear-gradient(#fff8, #fff8), url('/sprites/purble_background.png')" }}>
            <div className="grid items-end gap-3 md:grid-cols-[1fr_1.4fr]">
              <div className={`rounded-t-3xl border-4 border-amber-800 bg-amber-100 p-2 shadow-lg ${waiting ? 'ring-4 ring-amber-400' : ''}`}>
                <h3 className="text-center text-xl font-black text-amber-950">Large pantry</h3>
                <p className="mb-2 text-center text-sm font-semibold text-amber-950">3 wait cycles per trip</p>
                <div className="grid grid-cols-3 gap-1 border-b-8 border-amber-800 pb-2" aria-label="Pantry topping jars">
                  {(['A', 'B', 'C'] as const).map(item => (
                    <div key={item} className={`rounded-t-xl border-2 px-1 py-2 text-center text-3xl ${toppingStyle[item]}`}><ToppingIcon ingredient={item} /></div>
                  ))}
                </div>
                <div className="mt-3 flex justify-center gap-2" aria-label={waiting ? `${event.waitNumber} of 3 waiting cycles elapsed` : 'No pantry trip in progress'}>
                  {[1, 2, 3].map(wait => <span key={wait} className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-amber-800 font-bold ${waiting && event.waitNumber >= wait ? 'bg-amber-700 text-white' : 'bg-white text-amber-950'}`}>{wait}</span>)}
                </div>
              </div>

              <div className="flex min-w-0 items-end justify-center gap-2 rounded-2xl bg-white/90 p-2">
                <div className="w-28 shrink-0 text-center xl:w-32">
                  <h3 className="text-lg font-black text-purple-950">Fast shelf</h3>
                  <p className="text-sm text-purple-900">Only two slots</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 border-b-8 border-purple-900 pb-1" data-testid="cache-shelf">
                    {state.shelf.map((entry, slot) => (
                      <div key={slot} role="group" aria-label={`Shelf slot ${slot + 1}: ${entry ? TOPPINGS[entry.ingredient].name + ' topping jar' : 'empty'}`}
                        className={`flex h-20 items-center justify-center rounded-t-xl border-2 text-3xl ${entry ? toppingStyle[entry.ingredient] : 'border-dashed border-purple-300 bg-purple-50 text-purple-500'}`}>
                        <span aria-hidden="true">{entry ? TOPPINGS[entry.ingredient].icon : '—'}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-purple-800">Jars stay after baking</p>
                </div>
                <div className="min-w-0 flex-1 text-center text-purple-950">
                  <span role="img" aria-label="One baker" className={`block text-5xl ${waiting && running ? 'motion-safe:animate-pulse' : ''}`}>👩‍🍳</span>
                  <strong className="mt-1 block text-sm">{waiting ? 'Waiting…' : event ? 'Cake baked!' : 'Ready to bake'}</strong>
                  {event?.kind === 'bake'
                    ? <CakeToppingImage ingredient={ingredient} className="h-20 w-16 max-w-full" />
                    : <img src="/sprites/plate.png" alt="Empty cake plate" className="mx-auto h-20 w-16 max-w-full object-contain" />}
                </div>
              </div>
            </div>
            <div role="status" aria-live="polite" aria-atomic="true" data-testid="cache-feedback"
              className={`mt-3 rounded-2xl border-2 p-3 text-lg font-bold ${waiting ? 'border-amber-500 bg-amber-100 text-amber-950' : 'border-emerald-500 bg-emerald-50 text-emerald-950'}`}>
              <span className="block text-sm">{event ? <>Cycle {state.cycles} · Order {currentOrder + 1} · <ToppingIcon ingredient={ingredient} /></> : 'The shelf starts empty.'}{state.status === 'paused' ? ' · Paused' : ''}</span>
              {statusText}
              {waiting && event.waitNumber === FETCH_CYCLES && <span className="block text-sm">{event.evicted && <><ToppingIcon ingredient={event.evicted} /> replaced by <ToppingIcon ingredient={ingredient} />. </>}Jar ready. Next: bake!</span>}
              {complete && <span className="block">All six cakes are ready!</span>}
            </div>
          </div>
        </div>
      </div>

      {complete && (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-4 text-emerald-950" data-testid="cache-result">
          <h3 className="text-xl font-black">{lesson.source === 'hint' ? 'Hint-assisted round score' : 'Your round score'}</h3>
          <p className="mt-1 text-lg font-bold">{state.cakes} cakes · {state.misses} pantry trips · {state.cycles} cycles</p>
          <p className="mt-1 text-sm">Reset to try another order.</p>
        </div>
      )}

      {lesson.hasCompletedRound && (
        <aside className="rounded-2xl border-2 border-purple-300 bg-white p-4 text-purple-950" aria-label="Optional hint">
          {!lesson.hintRevealed ? (
            <button className={buttonStyle} aria-expanded={false} aria-controls="cache-hint" onClick={() => dispatch({ type: 'revealHint' })}>Need a hint?</button>
          ) : (
            <div id="cache-hint" data-testid="cache-hint">
              <h3 className="text-lg font-black">Hint: put matching toppings together</h3>
              <button className={`${buttonStyle} mt-3`} disabled={!editable} onClick={() => { dispatch({ type: 'useHint' }); setSelected(null); }}>Try hint example</button>
              {!editable && <p className="mt-2 text-sm">Press Reset before trying the hint example.</p>}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm md:text-base">
                  <caption className="mb-2 text-left text-sm">Hint comparison · same baker, shelf and clock.</caption>
                  <thead><tr className="border-b border-purple-200"><th scope="col" className="p-2">Baking order</th><th scope="col" className="p-2">Cakes</th><th scope="col" className="p-2">Trips</th><th scope="col" className="p-2">Cycles</th></tr></thead>
                  <tbody>{comparisons.map(({ name, result }) => (
                    <tr key={name} className="border-b border-purple-100"><th scope="row" className="p-2">{name}<BakingSequence orders={result.orders} /></th><td className="p-2">{result.cakes}</td><td className="p-2">{result.misses}</td><td className="p-2">{result.cycles}</td></tr>
                  ))}</tbody>
                </table>
              </div>
              <h4 className="mt-4 text-xl font-black">Same work, fewer waits</h4>
              <p className="mt-1 font-semibold">Using a recently fetched ingredient again is temporal locality.</p>
            </div>
          )}
        </aside>
      )}

      <details className="rounded-2xl border-2 border-purple-200 bg-white p-4 text-purple-950">
        <summary className="cursor-pointer py-1 text-lg font-bold">How it works · optional</summary>
        <div className="mt-3 space-y-3 leading-relaxed">
          <p>Six independent orders, two per topping, one topping per cake. Order numbers show baking sequence; swapping changes that sequence, not the requested cakes. Each jar has enough for both cakes and stays after baking. The jars represent reusable cached data: a CPU reads data without consuming it.</p>
          <p>One baker, two shelf slots. A cache hit takes one baking cycle; a miss takes three wait cycles plus one baking cycle. Any jar fits either slot (fully associative); the least recently used (LRU) jar is replaced. No prefetch. Real CPUs fetch data automatically; real caches can use other organizations and replacement policies.</p>
          <p>Each cycle lasts {CACHE_CYCLE_MS / 1000} seconds. Reset empties the shelf and counters but keeps your order and hint progress. Complete a round to unlock a hint; completing a self-rearranged round reveals it. Leaving this window starts a fresh visit next time.</p>
        </div>
      </details>
    </section>
  );
}

function SpatialLevel({ active }: { active: boolean }) {
  const [lesson, dispatch] = useReducer(spatialCacheLessonReducer, undefined, createSpatialCacheLesson);
  const state = lesson.simulation;
  const [selected, setSelected] = useState<number | null>(null);
  const event = state.lastCycle;
  const currentOrder = event?.order ?? 0;
  const ingredient = state.orders[currentOrder];
  const waiting = event?.kind === 'wait';
  const editable = state.status === 'idle';
  const running = state.status === 'running';
  const complete = state.status === 'complete';
  const reveal = lesson.hasAttempt || lesson.hintRevealed;

  useEffect(() => {
    if (!active) {
      if (state.status !== 'idle') dispatch({ type: 'reset' });
      setSelected(null);
      return;
    }
    if (!running) return;
    const timer = window.setInterval(() => dispatch({ type: 'tick' }), SPATIAL_CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [active, running, state.status]);

  const comparisons = useMemo(() => reveal ? [
    { name: 'Interleaved challenge', orders: SPATIAL_MIXED_ORDERS },
    { name: 'Same-item reuse', orders: SPATIAL_TEMPORAL_ORDERS },
    { name: 'Neighbor use', orders: SPATIAL_NEIGHBOR_ORDERS },
    { name: 'Both kinds of reuse', orders: SPATIAL_BOTH_ORDERS },
  ].map(row => ({ ...row, result: runSpatialCacheTrace(row.orders) })) : [], [reveal]);

  function chooseOrder(index: number) {
    if (selected === null) setSelected(index);
    else {
      dispatch({ type: 'swap', first: selected, second: index });
      setSelected(null);
    }
  }

  const statusText = !event ? 'Ready to bake!'
    : waiting ? `Both toppings are on a pantry trip. Wait ${event.waitNumber} of 3.`
    : event.hit ? `On the shelf — ${event.explanation}. Cake baked.`
    : 'Pair fetched. Cake baked.';

  return (
    <section aria-labelledby="spatial-title" className={`cache-game flex flex-col gap-3 rounded-3xl border-4 border-purple-200 bg-pink-50 p-2 shadow-2xl md:p-4 ${active ? '' : 'hidden'}`} data-testid="spatial-level">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 sm:flex-1">
          <p className="text-sm font-bold uppercase tracking-wider text-purple-700">Window 3 · Level 2 · Eight cakes</p>
          <h2 id="spatial-title" className="text-2xl font-black text-purple-950 md:text-3xl">The Baker’s Fast Shelf</h2>
          <p className="mt-1 text-base text-purple-900">Can you use the same topping—or its pantry neighbor—before their pair leaves the fast shelf?</p>
        </div>
        <span className="rounded-xl border-2 border-purple-200 bg-white px-3 py-2 font-bold text-purple-900" data-testid="spatial-status">
          {complete ? 'Round complete' : running ? 'Running' : editable ? 'Ready to arrange' : 'Paused'}
        </span>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="rounded-2xl border-2 border-purple-200 bg-white/90 p-2">
            <p id="spatial-order-help" className="mb-2 text-sm font-semibold text-purple-950" aria-live="polite">
              {editable ? selected === null ? 'Tap two cake cards to swap the baking order, then Run.' : `Order ${selected + 1} selected. Tap another order to swap.` : 'Orders locked for this round. Reset to rearrange.'}
            </p>
            {lesson.hintPractice && <p className="mb-2 text-sm font-bold text-purple-800">Hint example · not your solution</p>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Eight independent cake orders" data-testid="spatial-orders">
              {state.orders.map((item, index) => {
                const access = state.accesses[index];
                return <button key={index} type="button" disabled={!editable} onClick={() => chooseOrder(index)}
                  aria-pressed={selected === index} aria-describedby="spatial-order-help"
                  aria-label={`Order ${index + 1}: ${TOPPINGS[item].name} topping cake`}
                  className={`min-h-24 rounded-2xl border-2 p-2 text-center ${spatialToppingStyle[item]} ${selected === index ? 'ring-4 ring-purple-700 ring-offset-2' : ''} ${event && currentOrder === index ? 'outline outline-4 outline-purple-600' : ''}`}>
                  <span className="block text-sm font-semibold">Order {index + 1}</span>
                  <CakeToppingImage ingredient={item} className="h-10 w-12" />
                  <span className="block min-h-5 break-words text-xs font-bold leading-tight">{editable ? TOPPINGS[item].name : access ? access.hit ? access.explanation : 'Pantry trip' : ''}</span>
                </button>;
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button className={buttonStyle} disabled={!editable} onClick={() => { dispatch({ type: 'restoreMixed' }); setSelected(null); }}>Restore challenge order</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Level 2 round controls">
            <button disabled={running || complete} onClick={() => { setSelected(null); dispatch({ type: 'run' }); }} className={`${buttonStyle} !border-purple-700 !bg-purple-700 !text-white`}>
              {state.status === 'paused' ? 'Resume' : 'Run'}
            </button>
            <button className={buttonStyle} disabled={!running} onClick={() => dispatch({ type: 'pause' })}>Pause</button>
            <button className={buttonStyle} disabled={running || complete} onClick={() => { setSelected(null); dispatch({ type: 'step' }); }}>Step one cycle</button>
            <button className={buttonStyle} onClick={() => { dispatch({ type: 'reset' }); setSelected(null); }}>Reset</button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {[
              ['Cakes baked', `${state.cakes} / 8`, 'spatial-cakes'],
              ['Elapsed cycles', state.cycles, 'spatial-cycles'],
              ['Pantry trips', state.misses, 'spatial-misses'],
              ['Found on shelf', state.hits, 'spatial-hits'],
            ].map(([label, value, id]) => <div key={id} className="rounded-2xl border-2 border-purple-200 bg-white p-2 text-purple-950"><span className="block text-xs font-bold sm:text-sm">{label}</span><strong className="text-2xl tabular-nums" data-testid={id}>{value}</strong></div>)}
          </div>

          <div className="rounded-2xl border-4 border-purple-300 bg-cover bg-center p-2" style={{ backgroundImage: "linear-gradient(#fff8, #fff8), url('/sprites/purble_background.png')" }}>
            <div className="grid items-end gap-4 md:grid-cols-[1fr_1.4fr]">
              <div className={`rounded-t-3xl border-4 border-amber-800 bg-amber-100 p-1.5 shadow-lg ${waiting ? 'ring-4 ring-amber-400' : ''}`}>
                <h3 className="text-center text-lg font-black text-amber-950">Two distant shelves</h3>
                <p className="mb-1 text-center text-xs font-semibold text-amber-950 sm:text-sm">One trip visits one shelf · fetch both jars</p>
                <div className="space-y-1" aria-label="Two fixed pantry memory pairs">
                  {PANTRY_PAIRS.map((pair, index) => <div key={index} role="group" aria-label={`Distant pantry shelf ${index + 1}: adjacent ${pair.map(id => TOPPINGS[id].name).join(' and ')}`} className="grid grid-cols-2 overflow-hidden rounded-xl border-2 border-amber-800">
                    <span className="col-span-2 bg-amber-200 py-0.5 text-center text-xs font-bold text-amber-950">Shelf {index + 1}</span>
                    {pair.map(item => <div key={item} className={`border-r-2 border-amber-700 px-1 py-1 text-center last:border-r-0 ${spatialToppingStyle[item]}`}>
                      <span className="mx-auto flex h-7 w-7 items-center justify-center text-xl leading-none"><ToppingIcon ingredient={item} /></span>
                      <span className="block text-xs font-bold">{TOPPINGS[item].name}</span>
                    </div>)}
                  </div>)}
                </div>
                <div className="mt-2 flex justify-center gap-1.5" aria-label={waiting ? `${event.waitNumber} of 3 pair-fetch waiting cycles elapsed` : 'No pantry trip in progress'}>
                  {[1, 2, 3].map(wait => <span key={wait} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-amber-800 font-bold ${waiting && event.waitNumber >= wait ? 'bg-amber-700 text-white' : 'bg-white text-amber-950'}`}>{wait}</span>)}
                </div>
              </div>
              <div className="flex min-w-0 items-center justify-center gap-8 rounded-2xl bg-white/90 p-2">
                <div className="w-32 shrink-0 text-center">
                  <h3 className="text-base font-black text-purple-950">Fast shelf · one pair</h3>
                  <p className="text-sm text-purple-900">Two topping jars total</p>
                  <div className="mt-1.5 grid grid-cols-2 gap-1 border-b-8 border-purple-900 pb-1" data-testid="spatial-shelf">
                    {[0, 1].map(slot => { const item = state.shelf?.[slot]; return <div key={slot} role="group" aria-label={`Shelf slot ${slot + 1}: ${item ? `${TOPPINGS[item].name} topping jar` : 'empty'}`} className={`flex h-14 items-center justify-center rounded-t-xl border-2 text-3xl ${item ? spatialToppingStyle[item] : 'border-dashed border-purple-300 bg-purple-50 text-purple-500'}`}>{item ? <ToppingIcon ingredient={item} /> : '—'}</div>; })}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-purple-800">Both arrive and leave together</p>
                </div>
                <div className="w-28 shrink-0 text-center text-purple-950">
                  <span role="img" aria-label="One baker" className={`block text-4xl ${waiting && running ? 'motion-safe:animate-pulse' : ''}`}>👩‍🍳</span>
                  <strong className="mt-1 block text-sm">{waiting ? 'Waiting for both…' : event?.kind === 'bake' ? 'Cake baked!' : 'Ready to bake'}</strong>
                  {event?.kind === 'bake' ? <CakeToppingImage ingredient={ingredient} className="h-16 w-14" /> : <img src="/sprites/plate.png" alt="Empty cake plate" className="mx-auto h-16 w-14 object-contain" />}
                </div>
              </div>
            </div>
            <div role="status" aria-live="polite" aria-atomic="true" data-testid="spatial-feedback" className={`mt-2 rounded-2xl border-2 p-2 text-base font-bold ${waiting ? 'border-amber-500 bg-amber-100 text-amber-950' : 'border-emerald-500 bg-emerald-50 text-emerald-950'}`}>
              <span className="block text-sm">{event ? <>Cycle {state.cycles} · Order {currentOrder + 1} · <ToppingIcon ingredient={ingredient} /></> : 'The one-pair shelf starts empty.'}{state.status === 'paused' ? ' · Paused' : ''}</span>
              {statusText}
              {waiting && event.arriving && <span className="block text-sm">Both <ToppingIcon ingredient={event.arriving[0]} /> + <ToppingIcon ingredient={event.arriving[1]} /> arrive together{event.evicted ? <>; <ToppingIcon ingredient={event.evicted[0]} /> + <ToppingIcon ingredient={event.evicted[1]} /> leave together</> : ''}. Next: bake!</span>}
              {complete && <span className="block">All eight cakes are ready!</span>}
            </div>
          </div>
        </div>
      </div>

      {complete && <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-3 text-emerald-950" data-testid="spatial-result">
        <h3 className="text-xl font-black">{lesson.hintPractice ? 'Hint example score · not your solution' : 'Your Level 2 score'}</h3>
        <p className="mt-1 text-lg font-bold">8 cakes · {state.misses} pair trips · {state.cycles} cycles</p>
      </div>}

      <aside className="rounded-2xl border-2 border-purple-300 bg-white p-3 text-purple-950" aria-label="Level 2 locality explanation and hint">
        {!lesson.hintRevealed && <button className={buttonStyle} onClick={() => dispatch({ type: 'revealHint' })}>Need a hint?</button>}
        {lesson.hintRevealed && <>
          <h3 className="text-lg font-black">Hint: keep each pantry pair together</h3>
          <button className={`${buttonStyle} mt-2`} disabled={!editable} onClick={() => { dispatch({ type: 'tryExample' }); setSelected(null); }}>Try the “both kinds” example</button>
          {!editable && <p className="mt-2 text-sm">Reset before trying the hint example.</p>}
        </>}
        {(lesson.hasAttempt || lesson.hintRevealed) && <p className="mt-3 font-semibold">Using the exact same item again is temporal locality. Using a different item that arrived in its fixed pair is spatial locality.</p>}
        {reveal && <div className="mt-3 overflow-x-auto" data-testid="spatial-comparison">
          <table className="w-full text-left text-sm md:text-base"><caption className="mb-2 text-left">Level 2 examples · all make eight cakes.</caption>
            <thead><tr className="border-b border-purple-200"><th scope="col" className="p-2">Order</th><th scope="col" className="p-2">Trips</th><th scope="col" className="p-2">Hits</th><th scope="col" className="p-2">Cycles</th></tr></thead>
            <tbody>{comparisons.map(({ name, orders, result }) => <tr key={name} className="border-b border-purple-100"><th scope="row" className="p-2">{name}<BakingSequence orders={orders} /></th><td className="p-2">{result.misses}</td><td className="p-2">{result.hits}</td><td className="p-2">{result.cycles}</td></tr>)}</tbody>
          </table>
        </div>}
      </aside>

      <details className="rounded-2xl border-2 border-purple-200 bg-white p-3 text-purple-950">
        <summary className="cursor-pointer py-1 text-lg font-bold">How it works · optional</summary>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p>Pantry pairs stand for adjacent memory addresses; topping jars stand for reusable data. Each fixed pair is like one cache line: a small group of nearby data fetched together. Fetching either topping automatically brings its whole pair after three waiting cycles. The one-pair shelf stores two items total; fetching the other pair replaces both. Fetching is one trip, and an unused neighbor is not a hit or a cake.</p>
          <p>Both same-item reuse and neighbor use are ordinary cache hits, explained by when the item was last used since the pair arrived. There is one baker, no manual prefetch, and one bake cycle per cake.</p>
          <p>Each on-screen cycle lasts {SPATIAL_CYCLE_MS / 1000} seconds. Switching levels resets that level to an empty shelf; its orders remain independent from Level 1.</p>
        </div>
      </details>
    </section>
  );
}

export default function CacheBakery() {
  const [activeLevel, setActiveLevel] = useState<1 | 2>(1);
  const [level2Unlocked, setLevel2Unlocked] = useState(false);
  const unlockLevel2 = useCallback(() => setLevel2Unlocked(true), []);
  return <div className="flex flex-col gap-3">
    <nav className="flex flex-wrap gap-2" aria-label="Bakery lesson levels">
      <button className={`${buttonStyle} ${activeLevel === 1 ? '!border-purple-700 !bg-purple-700 !text-white' : ''}`} aria-pressed={activeLevel === 1} onClick={() => setActiveLevel(1)}>Level 1 · Two jars</button>
      <button className={`${buttonStyle} ${activeLevel === 2 ? '!border-purple-700 !bg-purple-700 !text-white' : ''}`} aria-pressed={activeLevel === 2} disabled={!level2Unlocked} onClick={() => setActiveLevel(2)}>{level2Unlocked ? 'Level 2 · Pantry pairs' : 'Level 2 · Unlock after one round'}</button>
    </nav>
    <TemporalLevel active={activeLevel === 1} onUnlock={unlockLevel2} />
    <SpatialLevel active={activeLevel === 2} />
  </div>;
}
