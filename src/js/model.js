// Program data, state and all training logic. No DOM here, so it runs under node:test.
// Ported from reference/Main.dc.html (the Claude Design prototype).

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
    program: 'sl', unit: 'lb', bar: 45, incs: defaultIncs('lb'), restGood: 180,
    weights: defaults('lb'), fails: zeros(), deloads: zeros(), schemes: defaultSchemes(),
    offers: {}, accs: {}, accW: {}, mode: 'bar', next: 'A', sets: {}, history: [],
    sessionStart: null, returnSeen: null,
    // UI-only state below, never persisted
    tab: 'workout', openWarm: null, restFrom: null, restLift: null, restTarget: 180,
    confirmReset: false, confirmDel: null, backupOpen: false, backupMsg: '', backupOk: true, importText: ''
  };
}

// The v3 backup format. Matches the prototype exactly so old backups restore.
export function persisted(m) {
  return {
    v: 3, program: m.program, unit: m.unit, bar: m.bar, incs: m.incs, restGood: m.restGood,
    weights: m.weights, fails: m.fails, deloads: m.deloads, schemes: m.schemes, offers: m.offers,
    accs: m.accs, accW: m.accW, mode: m.mode, next: m.next, sets: m.sets,
    history: m.history, sessionStart: m.sessionStart, returnSeen: m.returnSeen
  };
}

export function absorb(s, p) {
  if (!p || typeof p !== 'object' || !p.weights || (p.unit !== 'lb' && p.unit !== 'kg')) return false;
  const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  s.program = p.program === 'lite' ? 'lite' : 'sl';
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
  s.mode = p.mode === 'kb' ? 'kb' : 'bar';
  s.next = p.next === 'B' ? 'B' : 'A';
  s.sets = obj(p.sets);
  s.history = Array.isArray(p.history) ? p.history : [];
  s.sessionStart = typeof p.sessionStart === 'number' ? p.sessionStart : null;
  s.returnSeen = typeof p.returnSeen === 'string' ? p.returnSeen : null;
  return true;
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

  extraW(def) {
    const v = this.state.accW[def.key];
    return typeof v === 'number' ? v : (def.dflt ? def.dflt[this.state.unit] : 0);
  }

  plates(w) {
    const unit = this.state.unit;
    let side = (w - this.state.bar) / 2;
    if (side <= 0) return 'bar';
    const sizes = unit === 'kg' ? [20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5];
    const out = [];
    for (const p of sizes) {
      while (side >= p - 0.001) { out.push(fmt(p)); side -= p; }
    }
    if (side > 0.01) out.push('+' + fmt(side));
    return out.join(' ');
  }

  warmups(id, w) {
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
    list.push({ reps: schemeLabel(this.schemeFor(id)), weightText: fmt(w), plates: this.plates(w), work: true });
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
    const order = ['', 'both', 'A', 'B'];
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

  setProgram(p) { this.save({ program: p, sets: {}, offers: {} }); }
  setMode(m) { this.save({ mode: m, restFrom: null, restLift: null }); }

  swapWorkout() {
    const s = this.state;
    this.save({ next: s.next === 'A' ? 'B' : 'A', sets: {}, sessionStart: null, openWarm: null, restFrom: null, restLift: null });
  }

  activeAccs() {
    const s = this.state;
    return ACC_LIB.filter((d) => { const day = s.accs[d.key]; return day === 'both' || day === s.next; });
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
    if (s.mode === 'kb') {
      const kbLogged = KB_ROUTINE.map((d) => this.logExtra(d, s.sets['x:' + d.key] || [])).filter(Boolean);
      if (!kbLogged.length) return;
      const kbSets = { ...s.sets };
      KB_ROUTINE.forEach((d) => { delete kbSets['x:' + d.key]; });
      this.save({
        history: [{ date, workout: 'KB', mins: this.sessionMins(), lifts: kbLogged }].concat(s.history),
        sets: kbSets, sessionStart: null, tab: 'history', restFrom: null, restLift: null
      });
      return;
    }
    const weights = { ...s.weights }, fails = { ...s.fails };
    const deloads = { ...s.deloads }, offers = { ...s.offers };
    const logged = [];
    for (const id of PLAN[s.next]) {
      const arr = s.sets[id] || [];
      const sk = this.schemeFor(id), sc = SCHEMES[sk];
      let any = false, ok = true;
      const reps = [];
      for (let i = 0; i < sc.sets; i++) {
        const v = arr[i];
        if (v != null) any = true;
        reps.push(v == null ? 0 : v);
        if (v !== sc.reps) ok = false;
      }
      if (!any) continue;
      const w = weights[id];
      let outcome;
      if (ok) {
        weights[id] = round2(w + s.incs[id]);
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
      logged.push({ id, name: LIFTS[id].name, w, unit: s.unit, ok, scheme: sk, weightText: fmt(w) + ' ' + s.unit, reps: reps.join(' '), outcome });
    }
    this.activeAccs().forEach((d) => { const e = this.logExtra(d, s.sets['x:' + d.key] || []); if (e) logged.push(e); });
    if (!logged.length) return;
    const history = [{ date, workout: s.next, program: s.program, mins: this.sessionMins(), lifts: logged }].concat(s.history);
    this.save({
      weights, fails, deloads, offers, history, sets: {}, sessionStart: null,
      next: s.next === 'A' ? 'B' : 'A', tab: 'history', openWarm: null, restFrom: null, restLift: null
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

  deleteSession(idx) {
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
