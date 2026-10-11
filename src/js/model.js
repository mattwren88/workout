// Program data, state and all training logic. No DOM here, so it runs under node:test.
// Ported from reference/Main.dc.html (the Claude Design prototype).

import { planFor, daysFor, madcowBump } from './programs.js';

export const STORAGE_KEY = 'fivebyfive.v1';

export const LIFTS = {
  squat: { name: 'Squat', barWarm: true, color: '#FF5A36', stroke: '#D9401E' },
  bench: { name: 'Bench Press', barWarm: true, color: '#2D5BFF', stroke: '#2D5BFF' },
  row: { name: 'Barbell Row', barWarm: false, color: '#F2B800', stroke: '#B88A00' },
  ohp: { name: 'Overhead Press', barWarm: true, color: '#1FA57A', stroke: '#178A65' },
  dead: { name: 'Deadlift', barWarm: false, color: '#9B6BFF', stroke: '#7A48E6' }
};

export const SCHEMES = {
  '5x5': { sets: 5, reps: 5 }, '3x5': { sets: 3, reps: 5 }, '3x3': { sets: 3, reps: 3 },
  '1x5': { sets: 1, reps: 5 }, '1x3': { sets: 1, reps: 3 }, '2x5': { sets: 2, reps: 5 }
};

export const LADDER = { '5x5': '3x5', '3x5': '3x3', '1x5': '1x3' };
export const PLAN = { A: ['squat', 'bench', 'row'], B: ['squat', 'ohp', 'dead'] };
export const PROGRAM_IDS = ['sl', 'lite', 'madcow', 'texas'];
// Weekly programs reuse the Day A / Day B accessory slots: A = Mon + Fri, B = Wed.
const AB_SLOT = { M: 'A', W: 'B', F: 'A', V: 'A', R: 'B', I: 'A' };
export const abSlot = (day) => AB_SLOT[day] || day;

export const ACC_LIB = [
  { key: 'pullup', name: 'Pull-ups', sets: 3, reps: 8, kind: 'bw' },
  { key: 'chinup', name: 'Chin-ups', sets: 3, reps: 8, kind: 'bw' },
  { key: 'dip', name: 'Dips', sets: 3, reps: 8, kind: 'bw' },
  { key: 'pushup', name: 'Push-ups', sets: 3, reps: 10, kind: 'bw' },
  { key: 'facepull', name: 'Face Pulls', sets: 3, reps: 12, kind: 'wt', dflt: { lb: 30, kg: 12.5 } },
  { key: 'curl', name: 'Barbell Curls', sets: 3, reps: 10, kind: 'wt', dflt: { lb: 45, kg: 20 } },
  { key: 'tricep', name: 'Triceps Extensions', sets: 3, reps: 10, kind: 'wt', dflt: { lb: 25, kg: 10 } },
  { key: 'kbswing', name: 'KB Swings', sets: 5, reps: 10, kind: 'kb', dflt: { lb: 35, kg: 16 } },
  { key: 'goblet', name: 'Goblet Squats', sets: 3, reps: 8, kind: 'kb', dflt: { lb: 35, kg: 16 } },
  { key: 'kbrow', name: 'KB Rows', sets: 3, reps: 8, kind: 'kb', note: 'per side', dflt: { lb: 35, kg: 16 } },
  { key: 'kbpress', name: 'KB Press', sets: 3, reps: 5, kind: 'kb', note: 'per side', dflt: { lb: 25, kg: 12 } }
];

export const KB_ROUTINE = [
  { key: 'kb_halo', name: 'Halos', sets: 2, reps: 5, kind: 'kb', note: 'warm-up · each direction', dflt: { lb: 15, kg: 8 } },
  { key: 'kb_goblet', name: 'Goblet Squat', sets: 3, reps: 5, kind: 'kb', note: 'slow, sit deep', dflt: { lb: 35, kg: 16 } },
  { key: 'kb_swing', name: 'Two-Hand Swing', sets: 10, reps: 10, kind: 'kb', note: 'snap the hips, rest as needed', dflt: { lb: 35, kg: 16 } },
  { key: 'kb_tgu', name: 'Turkish Get-Up', sets: 5, reps: 2, kind: 'kb', note: '1 per side each round', dflt: { lb: 25, kg: 12 } }
];

export const CYCLE = { key: 'cycle', name: 'Cycling', kind: 'cardio' };
export const SET_CHOICES = [1, 2, 3, 4, 5, 6, 8, 10];
export const REP_CHOICES = [1, 2, 3, 5, 6, 8, 10, 12, 15, 20];

// Plates a gym might have, per unit, and a typical commercial-gym starting set (pairs).
export const PLATE_SIZES = {
  lb: [55, 45, 35, 25, 15, 10, 5, 2.5, 1.25, 1, 0.5, 0.25],
  kg: [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5, 0.25]
};
export const defaultInventory = () => ({
  lb: { 45: 8, 35: 2, 25: 2, 10: 2, 5: 2, 2.5: 2 },
  kg: { 20: 8, 15: 2, 10: 2, 5: 2, 2.5: 2, 1.25: 2 }
});

/**
 * Plates per side for `w` on `bar`, using only `pairs` (size → pairs owned).
 * Exact if possible with the fewest plates; otherwise the heaviest load under w.
 */
export function loadout(w, bar, pairs) {
  const side = round2((w - bar) / 2);
  if (side <= 0) return { plates: [], total: bar, exact: Math.abs(w - bar) < 0.01 };
  const sizes = Object.keys(pairs).map(Number).filter((p) => pairs[p] > 0).sort((a, b) => b - a);
  let best = null;
  const cents = (x) => Math.round(x * 100);
  const target = cents(side);
  const seen = new Set();
  const dfs = (i, left, used) => {
    const key = i + ':' + left;
    if (seen.has(key)) return;
    seen.add(key);
    const sum = target - left;
    if (!best || sum > best.sum || (sum === best.sum && used.length < best.plates.length)) best = { sum, plates: used.slice() };
    if (left === 0 || i >= sizes.length) return;
    const p = cents(sizes[i]);
    const max = Math.min(pairs[sizes[i]], Math.floor(left / p));
    for (let n = max; n >= 0; n--) {
      for (let k = 0; k < n; k++) used.push(sizes[i]);
      dfs(i + 1, left - n * p, used);
      used.length -= n;
      if (best.sum === target && n < max) break; // more of a bigger plate is never worse
    }
  };
  dfs(0, target, []);
  return { plates: best.plates, total: round2(bar + 2 * best.sum / 100), exact: best.sum === target };
}

export const MISS_REST = 300;
export const EXTRA_REST = 90;

export const schemeCycle = (id) => (id === 'dead' ? ['1x5', '1x3'] : ['5x5', '3x5', '3x3']);
export const schemeLabel = (k) => k.replace('x', '×');
export const defaultSchemes = () => ({ squat: '5x5', bench: '5x5', row: '5x5', ohp: '5x5', dead: '1x5' });
export const defaults = (unit) => (unit === 'kg'
  ? { squat: 20, bench: 20, row: 30, ohp: 20, dead: 40 }
  : { squat: 45, bench: 45, row: 65, ohp: 45, dead: 95 });
export const defaultIncs = (unit) => (unit === 'kg'
  ? { squat: 2.5, bench: 2.5, row: 2.5, ohp: 2.5, dead: 5 }
  : { squat: 5, bench: 5, row: 5, ohp: 5, dead: 10 });
export const zeros = () => ({ squat: 0, bench: 0, row: 0, ohp: 0, dead: 0 });
export const incChoices = (unit) => (unit === 'kg' ? [1.25, 2.5, 5] : [2.5, 5, 10]);
export const barChoices = (unit) => (unit === 'kg' ? [20, 15, 10] : [45, 35, 33]);

export const step = (unit) => (unit === 'kg' ? 2.5 : 5);
export const extraStep = (kind, unit) => (kind === 'kb' ? (unit === 'kg' ? 4 : 5) : (unit === 'kg' ? 2.5 : 5));
export const roundTo = (x, s) => Math.round(x / s) * s;
export const round2 = (x) => Math.round(x * 100) / 100;
export const fmt = (n) => String(round2(n));
export const clock = (secs) => {
  const m = Math.floor(secs / 60), ss = secs % 60;
  return m + ':' + (ss < 10 ? '0' : '') + ss;
};

export function extraDef(key) {
  return ACC_LIB.concat(KB_ROUTINE).find((d) => d.key === key) || null;
}

export function fresh() {
  return {
    program: 'sl', texasPress: 'bench', unit: 'lb', bar: 45, incs: defaultIncs('lb'), restGood: 180,
    weights: defaults('lb'), fails: zeros(), deloads: zeros(), schemes: defaultSchemes(),
    offers: {}, accs: {}, accW: {}, accSR: {}, dayC: { kb: true, cycle: false }, cycleMins: 45,
    cycleDone: false, healthSync: false, inventory: defaultInventory(), mode: 'bar', next: 'A', sets: {}, history: [],
    sessionStart: null, returnSeen: null,
    // UI-only state below, never persisted
    tab: 'workout', openWarm: null, restFrom: null, restLift: null, restTarget: 180,
    confirmReset: false, confirmDel: null, healthMsg: '', healthOk: true, backupOpen: false, backupMsg: '', backupOk: true, importText: ''
  };
}

// The v3 backup format. Matches the prototype exactly so old backups restore.
export function persisted(m) {
  return {
    v: 3, program: m.program, texasPress: m.texasPress, unit: m.unit, bar: m.bar, incs: m.incs, restGood: m.restGood,
    weights: m.weights, fails: m.fails, deloads: m.deloads, schemes: m.schemes, offers: m.offers,
    accs: m.accs, accW: m.accW, accSR: m.accSR, dayC: m.dayC, cycleMins: m.cycleMins,
    cycleDone: m.cycleDone, healthSync: m.healthSync, inventory: m.inventory, mode: m.mode, next: m.next, sets: m.sets,
    history: m.history, sessionStart: m.sessionStart, returnSeen: m.returnSeen
  };
}

export function absorb(s, p) {
  if (!p || typeof p !== 'object' || !p.weights || (p.unit !== 'lb' && p.unit !== 'kg')) return false;
  const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  s.program = PROGRAM_IDS.includes(p.program) ? p.program : 'sl';
  s.texasPress = p.texasPress === 'ohp' ? 'ohp' : 'bench';
  s.unit = p.unit;
  s.bar = typeof p.bar === 'number' ? p.bar : (p.unit === 'kg' ? 20 : 45);
  s.incs = Object.assign(defaultIncs(p.unit), obj(p.incs));
  s.restGood = typeof p.restGood === 'number' ? p.restGood : 180;
  s.weights = Object.assign(defaults(p.unit), p.weights);
  s.fails = Object.assign(zeros(), obj(p.fails));
  s.deloads = Object.assign(zeros(), obj(p.deloads));
  s.schemes = Object.assign(defaultSchemes(), obj(p.schemes));
  s.offers = obj(p.offers);
  s.accs = obj(p.accs);
  s.accW = obj(p.accW);
  s.accSR = obj(p.accSR);
  s.dayC = Object.assign({ kb: true, cycle: false }, obj(p.dayC));
  s.cycleMins = typeof p.cycleMins === 'number' ? p.cycleMins : 45;
  s.cycleDone = p.cycleDone === true;
  s.healthSync = p.healthSync === true;
  const inv = obj(p.inventory), dInv = defaultInventory();
  s.inventory = { lb: Object.keys(obj(inv.lb)).length ? inv.lb : dInv.lb, kg: Object.keys(obj(inv.kg)).length ? inv.kg : dInv.kg };
  // 'kb' was the prototype's kettlebell mode; it is now Day C.
  s.mode = p.mode === 'kb' || p.mode === 'c' ? 'c' : 'bar';
  s.next = daysFor(s.program).includes(p.next) ? p.next : daysFor(s.program)[0];
  s.sets = obj(p.sets);
  s.history = Array.isArray(p.history) ? p.history : [];
  s.sessionStart = typeof p.sessionStart === 'number' ? p.sessionStart : null;
  s.returnSeen = typeof p.returnSeen === 'string' ? p.returnSeen : null;
  return true;
}

// Health Connect records for one history entry. IDs are stable so re-syncing
// updates rather than duplicates. Day C cycling is its own biking record,
// placed just before any strength work so the two never overlap.
export function healthId(entry) { return 'fivebyfive:' + entry.date; }

export function healthRecords(entry) {
  const end = Date.parse(entry.date);
  const start = typeof entry.start === 'number' ? entry.start : end - Math.max(1, entry.mins || 1) * 60000;
  const lifts = entry.lifts || [];
  const ride = lifts.find((l) => l.id === 'x:cycle');
  const work = lifts.filter((l) => l !== ride);
  const name = entry.workout === 'KB' ? 'Kettlebell' : 'Day ' + entry.workout;
  const notes = work.map((l) => l.name + ' · ' + l.weightText + (l.reps ? ' · ' + l.reps : '')).join('\n');
  const out = [];
  if (work.length) out.push({ id: healthId(entry), type: 'strength', start, end, title: '5×5 ' + name, notes });
  if (ride) {
    const ms = (parseInt(ride.weightText, 10) || 30) * 60000;
    const rEnd = work.length ? start : end;
    out.push({ id: healthId(entry) + ':ride', type: 'cycling', start: rEnd - ms, end: rEnd, title: 'Cycling', notes: '' });
  }
  return out;
}

export function liftEntry(l, id, name) { return l.id === id || (!l.id && l.name === name); }
export function entryWeight(l) { return typeof l.w === 'number' ? l.w : parseFloat(l.weightText); }
export function entryUnit(l, fallback) {
  return l.unit || (/kg/.test(l.weightText || '') ? 'kg' : (l.weightText ? 'lb' : fallback));
}

/**
 * Holds state, persists it and exposes every action the UI can take.
 * `storage` is anything with getItem/setItem; `onChange` re-renders; `now` is injectable for tests.
 */
export class Tracker {
  constructor({ storage, onChange = () => {}, now = () => Date.now() } = {}) {
    this.storage = storage;
    this.onChange = onChange;
    this.now = now;
    this.state = this.load();
  }

  load() {
    const s = fresh();
    try {
      const raw = this.storage && this.storage.getItem(STORAGE_KEY);
      if (raw) absorb(s, JSON.parse(raw));
    } catch { /* corrupt storage: start fresh */ }
    return s;
  }

  setState(patch) {
    this.state = Object.assign({}, this.state, patch);
    this.onChange(this.state);
  }

  save(patch) {
    const m = Object.assign({}, this.state, patch);
    try { this.storage && this.storage.setItem(STORAGE_KEY, JSON.stringify(persisted(m))); } catch { /* quota */ }
    this.setState(patch);
  }

  schemeFor(id) {
    return this.state.program === 'lite' ? '2x5' : (this.state.schemes[id] || defaultSchemes()[id]);
  }

  // Library entry with the person's own sets × reps applied.
  def(base) {
    const o = this.state.accSR[base.key];
    return o ? { ...base, sets: o.sets || base.sets, reps: o.reps || base.reps } : base;
  }

  cycleSR(key, field) {
    const base = extraDef(key);
    if (!base) return;
    const ch = field === 'sets' ? SET_CHOICES : REP_CHOICES;
    const cur = this.def(base)[field];
    const i = ch.indexOf(cur);
    const nxt = ch[(i + 1) % ch.length];
    const accSR = { ...this.state.accSR, [key]: { ...this.def(base), [field]: nxt } };
    accSR[key] = { sets: accSR[key].sets, reps: accSR[key].reps };
    if (accSR[key].sets === base.sets && accSR[key].reps === base.reps) delete accSR[key];
    const sets = { ...this.state.sets }; delete sets['x:' + key];
    this.save({ accSR, sets });
  }

  toggleDayC(field) { this.save({ dayC: { ...this.state.dayC, [field]: !this.state.dayC[field] } }); }

  adjustCycle(dir) { this.save({ cycleMins: Math.max(5, this.state.cycleMins + dir * 5) }); }

  toggleCycleDone() {
    const patch = { cycleDone: !this.state.cycleDone };
    if (!this.state.sessionStart && patch.cycleDone) patch.sessionStart = this.now();
    this.save(patch);
  }

  extraW(def) {
    const v = this.state.accW[def.key];
    return typeof v === 'number' ? v : (def.dflt ? def.dflt[this.state.unit] : 0);
  }

  pairs() { return this.state.inventory[this.state.unit] || defaultInventory()[this.state.unit]; }

  loadout(w) { return loadout(w, this.state.bar, this.pairs()); }

  plates(w) {
    if (w <= this.state.bar) return 'bar';
    const L = this.loadout(w);
    const txt = L.plates.length ? L.plates.map(fmt).join(' ') : 'bar';
    return L.exact ? txt : txt + ' · closest ' + fmt(L.total);
  }

  setPairs(size, dir) {
    const unit = this.state.unit;
    const cur = { ...this.pairs() };
    cur[size] = Math.max(0, Math.min(20, (cur[size] || 0) + dir));
    if (!cur[size]) delete cur[size];
    this.save({ inventory: { ...this.state.inventory, [unit]: cur } });
  }

  warmups(id, w, label) {
    const lift = LIFTS[id], bar = this.state.bar, st = step(this.state.unit);
    const rows = [];
    if (w > bar) {
      if (lift.barWarm) rows.push({ w: bar, reps: '2×5' });
      let last = bar;
      for (const [pct, reps] of [[0.4, 5], [0.6, 3], [0.8, 2]]) {
        const x = roundTo(w * pct, st);
        if (x > last && x < w) { rows.push({ w: x, reps: '1×' + reps }); last = x; }
      }
    }
    const list = rows.map((r) => ({ reps: r.reps, weightText: fmt(r.w), plates: this.plates(r.w), work: false }));
    list.push({ reps: label || schemeLabel(this.schemeFor(id)), weightText: fmt(w), plates: this.plates(w), work: true });
    return list;
  }

  adjust(id, dir) {
    const s = this.state, w = { ...s.weights };
    const inc = Math.min(s.incs[id], step(s.unit));
    w[id] = Math.max(s.bar, round2(w[id] + dir * inc));
    this.save({ weights: w });
  }

  adjustExtra(def, dir) {
    const s = this.state, st = extraStep(def.kind, s.unit);
    const accW = { ...s.accW };
    accW[def.key] = Math.max(st, round2(this.extraW(def) + dir * st));
    this.save({ accW });
  }

  cycleInc(id) {
    const s = this.state, ch = incChoices(s.unit);
    const incs = { ...s.incs };
    incs[id] = ch[(ch.indexOf(s.incs[id]) + 1) % ch.length];
    this.save({ incs });
  }

  cycleScheme(id) {
    const s = this.state, ch = schemeCycle(id);
    const schemes = { ...s.schemes };
    schemes[id] = ch[(ch.indexOf(s.schemes[id]) + 1) % ch.length];
    const offers = { ...s.offers }; delete offers[id];
    const sets = { ...s.sets }; delete sets[id];
    this.save({ schemes, offers, sets });
  }

  acceptOffer(id) {
    const s = this.state, nextScheme = LADDER[s.schemes[id]];
    if (!nextScheme) return;
    const schemes = { ...s.schemes, [id]: nextScheme };
    const offers = { ...s.offers }; delete offers[id];
    const deloads = { ...s.deloads, [id]: 0 };
    const fails = { ...s.fails, [id]: 0 };
    const sets = { ...s.sets }; delete sets[id];
    this.save({ schemes, offers, deloads, fails, sets });
  }

  declineOffer(id) {
    const offers = { ...this.state.offers }; delete offers[id];
    this.save({ offers });
  }

  cycleAccDay(key) {
    const order = ['', 'both', 'A', 'B', 'C'];
    const accs = { ...this.state.accs };
    const nxt = order[(order.indexOf(accs[key] || '') + 1) % order.length];
    if (nxt) accs[key] = nxt; else delete accs[key];
    this.save({ accs });
  }

  // Tap = target reps; each further tap counts down to 0, then clears.
  tapSet(key, i, n, target, restFull) {
    const s = this.state;
    const sets = { ...s.sets };
    const arr = (sets[key] || []).slice();
    while (arr.length < n) arr.push(null);
    const v = arr[i];
    const nv = v == null ? target : (v === 0 ? null : v - 1);
    arr[i] = nv;
    sets[key] = arr;
    const patch = { sets };
    if (!s.sessionStart && nv != null) patch.sessionStart = this.now();
    if (nv != null) {
      patch.restLift = key;
      patch.restTarget = nv === target ? restFull : MISS_REST;
      if (!(s.restLift === key && s.restFrom && v != null)) patch.restFrom = this.now();
    }
    this.save(patch);
  }

  setUnit(unit) {
    const s = this.state;
    if (unit === s.unit) return;
    const st = step(unit), bar = unit === 'kg' ? 20 : 45;
    const conv = (x) => (unit === 'kg' ? x / 2.20462 : x * 2.20462);
    const w = {};
    for (const id in s.weights) w[id] = Math.max(bar, roundTo(conv(s.weights[id]), st));
    const accW = {};
    for (const k of Object.keys(s.accW)) {
      const def = extraDef(k);
      if (!def) continue;
      const es = extraStep(def.kind, unit);
      accW[k] = Math.max(es, roundTo(conv(s.accW[k]), es));
    }
    this.save({ unit, weights: w, bar, incs: defaultIncs(unit), accW });
  }

  // Switching keeps working weights; each program reads them as its own base.
  setProgram(p) {
    if (p === this.state.program) return;
    const days = daysFor(p);
    const next = days.includes(this.state.next) ? this.state.next : days[0];
    this.save({ program: p, next, sets: {}, offers: {}, sessionStart: null, restFrom: null, restLift: null });
  }

  plan(day = this.state.next) { return planFor(this.state, day, (id) => this.schemeFor(id)); }

  nextDay(day = this.state.next) {
    const days = daysFor(this.state.program);
    return days[(days.indexOf(day) + 1) % days.length];
  }
  setMode(m) { this.save({ mode: m, restFrom: null, restLift: null }); }

  // Today's workout from the day row: a program day, or 'C'.
  pickDay(d) {
    const s = this.state;
    if (d === 'C') { if (s.mode !== 'c') this.setMode('c'); return; }
    if (s.mode === 'c') this.save({ mode: 'bar', restFrom: null, restLift: null });
    if (d !== this.state.next) this.save({ next: d, sets: {}, sessionStart: null, openWarm: null, restFrom: null, restLift: null });
  }

  swapWorkout() {
    this.save({ next: this.nextDay(), sets: {}, sessionStart: null, openWarm: null, restFrom: null, restLift: null });
  }

  activeAccs() {
    const s = this.state;
    const today = s.mode === 'c' ? 'C' : abSlot(s.next);
    return ACC_LIB.filter((d) => { const day = s.accs[d.key]; return day === today || (day === 'both' && today !== 'C'); })
      .map((d) => this.def(d));
  }

  // Everything with set buttons on Day C, in order: kettlebell routine, then accessories.
  dayCExtras() {
    const kb = this.state.dayC.kb ? KB_ROUTINE.map((d) => this.def(d)) : [];
    return kb.concat(this.activeAccs());
  }

  logExtra(def, arr) {
    const s = this.state, reps = [];
    let any = false;
    for (let i = 0; i < def.sets; i++) { const v = arr[i]; if (v != null) any = true; reps.push(v == null ? 0 : v); }
    if (!any) return null;
    const w = def.kind === 'bw' ? null : this.extraW(def);
    return {
      id: 'x:' + def.key, name: def.name, w, unit: s.unit, kind: def.kind,
      weightText: w == null ? 'bodyweight' : fmt(w) + ' ' + s.unit,
      reps: reps.join(' '), outcome: ''
    };
  }

  sessionMins() {
    const s = this.state;
    return s.sessionStart ? Math.max(1, Math.round((this.now() - s.sessionStart) / 60000)) : null;
  }

  finish() {
    const s = this.state;
    const date = new Date(this.now()).toISOString();
    if (s.mode === 'c') {
      const defs = this.dayCExtras();
      const cLogged = defs.map((d) => this.logExtra(d, s.sets['x:' + d.key] || [])).filter(Boolean);
      if (s.dayC.cycle && s.cycleDone) {
        cLogged.unshift({ id: 'x:cycle', name: CYCLE.name, w: null, kind: 'cardio', weightText: s.cycleMins + ' min', reps: '', outcome: '' });
      }
      if (!cLogged.length) return;
      const cSets = { ...s.sets };
      defs.forEach((d) => { delete cSets['x:' + d.key]; });
      this.save({
        history: [{ date, start: s.sessionStart || undefined, workout: 'C', mins: this.sessionMins(), lifts: cLogged }].concat(s.history),
        sets: cSets, cycleDone: false, sessionStart: null, tab: 'history', restFrom: null, restLift: null
      });
      return;
    }
    const weights = { ...s.weights }, fails = { ...s.fails };
    const deloads = { ...s.deloads }, offers = { ...s.offers };
    const logged = [];
    for (const item of this.plan()) {
      const id = item.id, arr = s.sets[id] || [];
      let any = false;
      const reps = [];
      item.sets.forEach((set, i) => { const v = arr[i]; if (v != null) any = true; reps.push(v == null ? 0 : v); });
      if (!any) continue;
      const pr = item.progress;
      const idx = pr && pr.idx ? pr.idx : item.sets.map((_, i) => i);
      const ok = idx.every((i) => arr[i] === item.sets[i].reps);
      const sk = item.scheme || item.label;
      const w = weights[id];
      let outcome;
      if (!pr) {
        outcome = '';
      } else if (ok) {
        weights[id] = pr.type === 'pct' ? madcowBump(w, s.unit) : round2(w + s.incs[id]);
        fails[id] = 0;
        outcome = 'next ' + fmt(weights[id]);
      } else {
        fails[id] = (fails[id] || 0) + 1;
        if (fails[id] >= 3) {
          weights[id] = Math.max(s.bar, roundTo(w * 0.9, step(s.unit)));
          fails[id] = 0;
          deloads[id] = (deloads[id] || 0) + 1;
          outcome = 'deload to ' + fmt(weights[id]);
          if (s.program === 'sl' && deloads[id] >= 2 && LADDER[sk]) offers[id] = true;
        } else {
          outcome = 'repeat · miss ' + fails[id] + '/3';
        }
      }
      logged.push({ id, name: LIFTS[id].name, w: item.top, unit: s.unit, ok, scheme: sk, weightText: fmt(item.top) + ' ' + s.unit, reps: reps.join(' '), outcome });
    }
    this.activeAccs().forEach((d) => { const e = this.logExtra(d, s.sets['x:' + d.key] || []); if (e) logged.push(e); });
    if (!logged.length) return;
    const history = [{ date, start: s.sessionStart || undefined, workout: s.next, program: s.program, mins: this.sessionMins(), lifts: logged }].concat(s.history);
    this.save({
      weights, fails, deloads, offers, history, sets: {}, sessionStart: null,
      // Texas Method: bench and press swap after each Friday.
      texasPress: s.program === 'texas' && s.next === 'I' ? (s.texasPress === 'ohp' ? 'bench' : 'ohp') : s.texasPress,
      next: this.nextDay(), tab: 'history', openWarm: null, restFrom: null, restLift: null
    });
  }

  // Ease back in after time off: ≥14 days −10%, ≥28 −20%, ≥56 −30%.
  returnInfo() {
    const s = this.state;
    if (!s.history.length) return null;
    const lastDate = s.history[0].date;
    if (s.returnSeen === lastDate) return null;
    const days = Math.floor((this.now() - new Date(lastDate).getTime()) / 86400000);
    if (!(days >= 14)) return null;
    const pct = days >= 56 ? 30 : (days >= 28 ? 20 : 10);
    return { days, pct, lastDate };
  }

  applyReturn() {
    const info = this.returnInfo();
    if (!info) return;
    const s = this.state, w = {};
    for (const id in s.weights) w[id] = Math.max(s.bar, roundTo(s.weights[id] * (1 - info.pct / 100), step(s.unit)));
    this.save({ weights: w, fails: zeros(), returnSeen: info.lastDate });
  }

  skipReturn() {
    const info = this.returnInfo();
    if (info) this.save({ returnSeen: info.lastDate });
  }

  // ---------- Health Connect (this.health is set on Android; null in the browser) ----------
  async enableHealth() {
    if (!this.health) return;
    try {
      const granted = await this.health.request();
      if (!granted) { this.setState({ healthOk: false, healthMsg: 'Permission not granted. Allow 5×5 to write exercise in Health Connect.' }); return; }
      this.save({ healthSync: true });
      await this.syncHealth();
    } catch (e) {
      this.setState({ healthOk: false, healthMsg: (e && e.message) || 'Could not reach Health Connect.' });
    }
  }

  disableHealth() { this.save({ healthSync: false, healthMsg: '' }); }

  // Writes every finished session not yet synced. Safe to repeat: records upsert by id.
  async syncHealth() {
    if (!this.health || !this.state.healthSync || this.syncing) return;
    const pending = this.state.history.filter((h) => !h.synced);
    if (!pending.length) return;
    this.syncing = true;
    try {
      await this.health.write(pending.flatMap(healthRecords));
      const done = new Set(pending.map((h) => h.date));
      this.save({
        history: this.state.history.map((h) => (done.has(h.date) ? { ...h, synced: true } : h)),
        healthOk: true, healthMsg: 'Synced ' + pending.length + (pending.length === 1 ? ' session.' : ' sessions.')
      });
    } catch (e) {
      this.setState({ healthOk: false, healthMsg: 'Sync failed: ' + ((e && e.message) || 'unknown error') + '. It will retry next time.' });
    } finally {
      this.syncing = false;
    }
  }

  deleteSession(idx) {
    const gone = this.state.history[idx];
    if (gone && gone.synced && this.health) {
      this.health.remove([healthId(gone), healthId(gone) + ':ride']).catch(() => {});
    }
    const next = this.state.history.slice();
    next.splice(idx, 1);
    this.save({ history: next, confirmDel: null });
  }

  lastFor(id, name) {
    for (const h of this.state.history) {
      for (const l of h.lifts || []) if (liftEntry(l, id, name)) return l;
    }
    return null;
  }

  backupText() { return JSON.stringify(persisted(this.state)); }

  restore(text) {
    const f = fresh();
    let ok = false;
    try { ok = absorb(f, JSON.parse(text)); } catch { ok = false; }
    if (!ok) { this.setState({ backupOk: false, backupMsg: 'That does not look like a backup from this app.' }); return false; }
    const patch = persisted(f);
    delete patch.v;
    this.save({ ...patch, backupOk: true, backupMsg: 'Restored ' + f.history.length + ' sessions.', importText: '' });
    return true;
  }

  reset() {
    const f = fresh();
    f.tab = 'settings';
    this.save(f);
  }
}
