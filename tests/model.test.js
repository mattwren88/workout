import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tracker, persisted, STORAGE_KEY, healthRecords } from '../src/js/model.js';

const mem = (init) => {
  const m = new Map(init ? [[STORAGE_KEY, JSON.stringify(init)]] : []);
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m };
};
const DAY = 86400000;
const make = (opts = {}) => {
  let t0 = Date.UTC(2026, 9, 1, 12);
  const tr = new Tracker({ storage: mem(opts.saved), now: () => t0 });
  tr.advance = (ms) => { t0 += ms; };
  return tr;
};
// Log every set of a lift at `reps` (null = target reps).
const logAll = (t, id, reps) => {
  const sc = t.schemeFor(id);
  const [n, target] = sc.split('x').map(Number);
  for (let i = 0; i < n; i++) {
    t.tapSet(id, i, n, target, 180);
    for (let r = target; r > (reps ?? target); r--) t.tapSet(id, i, n, target, 180);
  }
};

test('tap cycles target → countdown → clear', () => {
  const t = make();
  const seq = [];
  for (let k = 0; k < 7; k++) { t.tapSet('squat', 0, 5, 5, 180); seq.push(t.state.sets.squat[0]); }
  assert.deepEqual(seq, [5, 4, 3, 2, 1, 0, null]);
});

test('full session adds increment, alternates day, logs history', () => {
  const t = make();
  ['squat', 'bench', 'row'].forEach((id) => logAll(t, id));
  t.finish();
  assert.equal(t.state.weights.squat, 50);
  assert.equal(t.state.weights.row, 70);
  assert.equal(t.state.next, 'B');
  assert.equal(t.state.history.length, 1);
  assert.equal(t.state.history[0].lifts[0].outcome, 'next 50');
});

test('three misses deload 10%; two deloads offer lower volume', () => {
  const t = make();
  t.save({ weights: { ...t.state.weights, squat: 200 } });
  for (let k = 0; k < 6; k++) {
    logAll(t, 'squat', 3);
    t.finish();
    t.save({ next: 'A' });
  }
  assert.equal(t.state.weights.squat, 160); // 200 → 180 → 160
  assert.equal(t.state.deloads.squat, 2);
  assert.equal(t.state.offers.squat, true);
  t.acceptOffer('squat');
  assert.equal(t.state.schemes.squat, '3x5');
});

test('ease back in after time off', () => {
  const t = make();
  logAll(t, 'squat'); t.finish();
  t.save({ weights: { ...t.state.weights, squat: 200 } });
  t.advance(30 * DAY);
  assert.deepEqual([t.returnInfo().days, t.returnInfo().pct], [30, 20]);
  t.applyReturn();
  assert.equal(t.state.weights.squat, 160);
  assert.equal(t.returnInfo(), null);
});

test('warm-ups and plates', () => {
  const t = make();
  const w = t.warmups('squat', 225);
  assert.deepEqual(w.map((r) => [r.reps, r.weightText, r.plates]), [
    ['2×5', '45', 'bar'], ['1×5', '90', '10 10 2.5'], ['1×3', '135', '45'], ['1×2', '180', '45 10 10 2.5'], ['5×5', '225', '45 45']
  ]);
  assert.equal(t.warmups('row', 135)[0].reps, '1×5'); // no empty-bar sets on row
});

test('unit switch converts and rounds', () => {
  const t = make();
  t.save({ weights: { ...t.state.weights, squat: 225 } });
  t.setUnit('kg');
  assert.equal(t.state.weights.squat, 102.5);
  assert.equal(t.state.bar, 20);
});

test('rest timer: full set uses rest target, miss uses 5:00', () => {
  const t = make();
  t.tapSet('squat', 0, 5, 5, 120);
  assert.equal(t.state.restTarget, 120);
  t.tapSet('squat', 0, 5, 5, 120);
  assert.equal(t.state.restTarget, 300);
});

test('v3 backup round-trips and persists', () => {
  const a = make();
  logAll(a, 'squat'); a.finish();
  const text = a.backupText();
  assert.equal(JSON.parse(text).v, 3);
  const b = make();
  assert.equal(b.restore(text), true);
  assert.equal(b.state.history.length, 1);
  assert.equal(b.state.weights.squat, 50);
  assert.equal(b.restore('nope'), false);
  const c = new Tracker({ storage: mem(persisted(a.state)) });
  assert.equal(c.state.weights.squat, 50);
});

test('Day C logs kb, cycling and C accessories without touching A/B', () => {
  const t = make();
  t.cycleAccDay('pullup'); t.cycleAccDay('pullup'); t.cycleAccDay('pullup'); t.cycleAccDay('pullup');
  assert.equal(t.state.accs.pullup, 'C');
  t.toggleDayC('cycle');
  t.setMode('c');
  assert.deepEqual(t.dayCExtras().map((d) => d.key), ['kb_halo', 'kb_goblet', 'kb_swing', 'kb_tgu', 'pullup']);
  t.tapSet('x:kb_swing', 0, 10, 10, 90);
  t.toggleCycleDone();
  t.finish();
  const h = t.state.history[0];
  assert.equal(h.workout, 'C');
  assert.deepEqual(h.lifts.map((l) => l.name), ['Cycling', 'Two-Hand Swing']);
  assert.equal(h.lifts[0].weightText, '45 min');
  assert.equal(t.state.next, 'A');
  assert.equal(t.state.cycleDone, false);
  t.setMode('bar');
  assert.equal(t.activeAccs().length, 0); // C-only accessory stays off A/B
});

test('accessory sets × reps can be changed and survive backup', () => {
  const t = make();
  t.cycleAccDay('pullup'); // A + B
  t.cycleSR('pullup', 'sets'); // 3 → 4
  t.cycleSR('pullup', 'reps'); // 8 → 10
  assert.deepEqual([t.activeAccs()[0].sets, t.activeAccs()[0].reps], [4, 10]);
  const b = make();
  b.restore(t.backupText());
  assert.deepEqual(b.state.accSR.pullup, { sets: 4, reps: 10 });
});

test('prototype kettlebell mode restores as Day C', () => {
  const t = make();
  const old = JSON.parse(t.backupText());
  old.mode = 'kb'; delete old.dayC; delete old.accSR;
  t.restore(JSON.stringify(old));
  assert.equal(t.state.mode, 'c');
  assert.equal(t.state.dayC.kb, true);
});

test('health records: strength session, Day C ride placed before work', () => {
  const t = make();
  t.tapSet('squat', 0, 5, 5, 180);
  t.advance(40 * 60000);
  t.finish();
  const [rec] = healthRecords(t.state.history[0]);
  assert.equal(rec.type, 'strength');
  assert.equal(rec.end - rec.start, 40 * 60000);
  assert.match(rec.notes, /Squat · 45 lb · 5 0 0 0 0/);

  const c = { date: '2026-10-08T18:00:00.000Z', workout: 'C', mins: 20, lifts: [
    { id: 'x:cycle', name: 'Cycling', weightText: '45 min', reps: '' },
    { id: 'x:kb_swing', name: 'Two-Hand Swing', weightText: '35 lb', reps: '10' }] };
  const [work, ride] = healthRecords(c);
  assert.equal(ride.type, 'cycling');
  assert.equal(ride.end, work.start);
  assert.equal(ride.end - ride.start, 45 * 60000);
  assert.equal(healthRecords({ ...c, lifts: [c.lifts[0]] })[0].end, Date.parse(c.date));
});

test('health sync writes pending sessions once and deletes on remove', async () => {
  const calls = { write: [], remove: [] };
  const t = make();
  t.health = { request: async () => true, write: async (r) => { calls.write.push(r); }, remove: async (ids) => { calls.remove.push(ids); } };
  logAll(t, 'squat'); t.finish();
  await t.syncHealth(); // off: nothing
  assert.equal(calls.write.length, 0);
  await t.enableHealth();
  assert.equal(calls.write.length, 1);
  assert.equal(t.state.history[0].synced, true);
  await t.syncHealth();
  assert.equal(calls.write.length, 1);
  t.deleteSession(0);
  assert.deepEqual(calls.remove[0], ['fivebyfive:' + '2026-10-01T12:00:00.000Z', 'fivebyfive:2026-10-01T12:00:00.000Z:ride']);
});
