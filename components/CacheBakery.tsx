'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  CACHE_CYCLE_MS, FETCH_CYCLES, GROUPED_ORDERS, MIXED_ORDERS,
  cacheReducer, createCacheState, runCacheTrace, type Ingredient,
} from '../lib/cacheSimulation';

const ingredientStyle: Record<Ingredient, string> = {
  A: 'bg-pink-100 border-pink-400 text-pink-950',
  B: 'bg-amber-100 border-amber-400 text-amber-950',
  C: 'bg-indigo-100 border-indigo-400 text-indigo-950',
};
const buttonStyle = 'min-h-12 rounded-2xl border-2 border-purple-300 bg-white px-5 py-3 font-bold text-purple-900 shadow-sm hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50';

export default function CacheBakery() {
  const [state, dispatch] = useReducer(cacheReducer, undefined, () => createCacheState());
  const [selected, setSelected] = useState<number | null>(null);
  const comparisons = useMemo(() => [
    { name: 'Mixed: A B C A B C', result: runCacheTrace(MIXED_ORDERS) },
    { name: 'Grouped: A A B B C C', result: runCacheTrace(GROUPED_ORDERS) },
  ], []);

  useEffect(() => {
    if (state.status !== 'running') return;
    const timer = window.setInterval(() => dispatch({ type: 'tick' }), CACHE_CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [state.status]);

  const editable = state.status === 'idle';
  const running = state.status === 'running';
  const complete = state.status === 'complete';
  const event = state.lastCycle;
  const currentOrder = event?.order ?? 0;
  const ingredient = state.orders[currentOrder];
  const waiting = event?.kind === 'wait';
  const statusText = !event ? 'Ready! Arrange your orders, then press Run.'
    : waiting ? `Pantry trip for ${ingredient} — baker waiting. Wait ${event.waitNumber} of ${FETCH_CYCLES}.`
    : `${event.hit ? 'On the shelf! No waiting.' : 'Ingredient fetched!'} Cake ${state.cakes} baked in one cycle.`;

  function chooseOrder(index: number) {
    if (selected === null) setSelected(index);
    else {
      dispatch({ type: 'swap', first: selected, second: index });
      setSelected(null);
    }
  }

  return (
    <section aria-labelledby="cache-title" className="cache-game flex flex-col gap-5 rounded-3xl border-4 border-purple-200 bg-pink-50 p-4 shadow-2xl md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-purple-700">Window 3 · Six cakes, one baker</p>
          <h2 id="cache-title" className="text-3xl font-black text-purple-950">The Baker’s Fast Shelf</h2>
          <p className="mt-2 text-lg text-purple-900">Can you make the same six cakes with fewer trips to the pantry?</p>
        </div>
        <span className="rounded-xl border-2 border-purple-200 bg-white px-3 py-2 font-bold text-purple-900" data-testid="cache-status">
          {complete ? 'Round complete' : running ? 'Running' : editable ? 'Ready to arrange' : 'Paused'}
        </span>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="rounded-2xl border-2 border-purple-200 bg-white/90 p-4">
            <p id="order-help" className="mb-3 font-semibold text-purple-950" aria-live="polite">
              {editable ? selected === null
                ? '① Tap two order cards to swap them, or choose a preset. ② Press Run.'
                : `Order ${selected + 1} selected. Tap another to swap, or tap it again to cancel.`
                : 'Orders are locked for this round. Reset to rearrange and empty the shelf.'}
            </p>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-6 lg:grid-cols-3" aria-label="Cake orders">
              {state.orders.map((item, index) => {
                const access = state.accesses[index];
                return (
                  <button key={index} type="button" disabled={!editable} onClick={() => chooseOrder(index)}
                    aria-pressed={selected === index} aria-describedby="order-help"
                    aria-label={`Order ${index + 1}, ingredient ${item}`}
                    aria-current={event && currentOrder === index ? 'step' : undefined}
                    className={`min-h-24 rounded-2xl border-2 p-2 text-center ${ingredientStyle[item]} ${selected === index ? 'ring-4 ring-purple-700 ring-offset-2' : ''} ${event && currentOrder === index ? 'outline outline-4 outline-purple-600' : ''} ${editable ? 'hover:shadow-lg' : ''}`}>
                    <span className="block text-sm font-semibold">Order {index + 1}</span>
                    <span className="block text-3xl font-black">{item}</span>
                    <span className="block min-h-5 text-xs font-bold">
                      {access ? `${access.completedAt ? '✓ ' : ''}${access.hit ? 'On shelf' : 'Pantry trip'}` : '1 ingredient'}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className={buttonStyle} disabled={!editable} onClick={() => { dispatch({ type: 'preset', orders: MIXED_ORDERS }); setSelected(null); }}>Mixed orders</button>
              <button className={buttonStyle} disabled={!editable} onClick={() => { dispatch({ type: 'preset', orders: GROUPED_ORDERS }); setSelected(null); }}>Grouped orders</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3" aria-label="Round controls">
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
                <p className="mb-3 text-center text-sm font-semibold text-amber-950">All ingredients · 3 extra wait cycles</p>
                <div className="grid grid-cols-3 gap-2 border-b-8 border-amber-800 pb-2">
                  {(['A', 'B', 'C'] as const).map(item => (
                    <div key={item} className={`rounded-t-2xl border-2 py-3 text-center text-3xl font-black ${ingredientStyle[item]}`}>{item}</div>
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
                  <div className="mt-3 grid grid-cols-2 gap-2 border-b-8 border-purple-900 pb-1" data-testid="cache-shelf">
                    {state.shelf.map((entry, slot) => (
                      <div key={slot} className={`flex h-20 items-center justify-center rounded-t-xl border-2 text-3xl font-black ${entry ? ingredientStyle[entry.ingredient] : 'border-dashed border-purple-300 bg-purple-50 text-purple-500'}`}>
                        <span aria-label={`Slot ${slot + 1}: ${entry?.ingredient ?? 'empty'}`}>{entry?.ingredient ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-purple-800">Keep ingredients after baking</p>
                </div>
                <div className="min-w-0 flex-1 text-center text-purple-950">
                  <span role="img" aria-label="One baker" className={`block text-6xl ${waiting && running ? 'motion-safe:animate-pulse' : ''}`}>👩‍🍳</span>
                  <strong className="mt-1 block text-lg">{waiting ? 'Waiting…' : event ? 'Cake baked!' : 'Ready to bake'}</strong>
                  <img src={event?.kind === 'bake' ? '/sprites/cake_glazed.png' : '/sprites/plate.png'} alt={event?.kind === 'bake' ? 'Finished cake' : 'Empty cake plate'} className="mx-auto h-20 w-24 object-contain" />
                </div>
              </div>
            </div>
            <div role="status" aria-live="polite" aria-atomic="true" data-testid="cache-feedback"
              className={`mt-4 rounded-2xl border-2 p-4 text-lg font-bold ${waiting ? 'border-amber-500 bg-amber-100 text-amber-950' : 'border-emerald-500 bg-emerald-50 text-emerald-950'}`}>
              <span className="block text-sm">{event ? `Cycle ${state.cycles} · Order ${currentOrder + 1} · Ingredient ${ingredient}` : 'The shelf starts empty.'}{state.status === 'paused' ? ' · Paused' : ''}</span>
              {statusText}
              {waiting && event.waitNumber === FETCH_CYCLES && <span className="block text-base">{event.evicted ? `${event.evicted} leaves the shelf: it was used least recently. ` : ''}{ingredient} is now on the shelf. Next cycle: bake!</span>}
              {complete && <span className="block">All six cakes are ready!</span>}
            </div>
          </div>
        </div>
      </div>

      {complete && (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-4 text-emerald-950" data-testid="cache-result">
          <h3 className="text-2xl font-black">Same work, fewer waits</h3>
          <p className="mt-1 text-lg font-semibold">Using a recently fetched ingredient again is temporal locality.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm md:text-base">
              <caption className="mb-2 text-left">Each round starts empty, with one baker, two shelf slots and the same cycle length.</caption>
              <thead><tr className="border-b border-emerald-300"><th scope="col" className="p-2">Order</th><th scope="col" className="p-2">Cakes</th><th scope="col" className="p-2">Trips</th><th scope="col" className="p-2">Cycles</th></tr></thead>
              <tbody>{[{ name: `Your round: ${state.orders.join(' ')}`, result: state }, ...comparisons].map(({ name, result }) => (
                <tr key={name} className="border-b border-emerald-200"><th scope="row" className="p-2">{name}</th><td className="p-2">{result.cakes}</td><td className="p-2">{result.misses}</td><td className="p-2">{result.cycles}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <p className="mt-3 font-semibold">Grouping saves {comparisons[0].result.cycles - comparisons[1].result.cycles} waiting cycles by reusing ingredients before they leave the shelf.</p>
          <p className="mt-2">Press Reset, then try another order.</p>
        </div>
      )}

      <details className="rounded-2xl border-2 border-purple-200 bg-white p-4 text-purple-950">
        <summary className="cursor-pointer py-1 text-lg font-bold">How it works · optional</summary>
        <div className="mt-3 space-y-3 leading-relaxed">
          <p>The small shelf represents a cache: a nearby place to keep data. Finding an ingredient there is a cache hit (one baking cycle). Otherwise it is a miss: fetch from the pantry for three extra cycles, then bake for one cycle. Reusing something recently fetched is temporal locality.</p>
          <p>Our simplified rules: one ingredient per cake; independent orders that may be reordered; one baker; two shelf slots; three extra cycles per pantry fetch; and no prefetch (nothing is fetched ahead of an order). Ingredients remain available after baking.</p>
          <p>Any ingredient can go in either slot: this is a fully associative cache. When both slots are full, the least recently used (LRU) ingredient leaves. A hit makes that ingredient most recently used again.</p>
          <p>Real CPUs fetch data automatically. Real caches can have other organizations and replacement policies. Here only the order changes: the baker, shelf size and clock stay the same.</p>
          <p>One simulated cycle is {CACHE_CYCLE_MS / 1000} seconds on screen. Pause freezes the round; Step advances exactly one cycle. Reset keeps your order but empties the shelf and counters. Leaving this window stops the round; returning starts with mixed orders and an empty shelf.</p>
        </div>
      </details>
      <p className="text-sm text-purple-800">Each visit starts a fresh round with an empty shelf. Leaving this window stops and resets the round.</p>
    </section>
  );
}
