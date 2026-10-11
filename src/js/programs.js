// Program definitions and per-day session plans.
//
// Each lift's stored weight is its "base":
//   StrongLifts / Lite  the working weight for every set
//   Madcow              the top set of 5 (Monday; Wednesday for press and deadlift)
//   Texas Method        the Friday 5-rep target (deadlift: its Monday 1×5)
//
// Madcow follows the StrongLifts Madcow guide: 12.5% ramps, Friday triple at
// +2.5% over Monday's top, a set of 8 at Monday's third set, +2.5% a week.
// Texas Method follows Rippetoe's template: Monday 5×5 at 90% of Friday,
// Wednesday squat 2×5 at 80% of Monday, Friday a new 5-rep best; bench and
// press alternate weeks.
import { SCHEMES, roundTo, round2, step } from './model.js';

export const PROGRAMS = {
  sl: {
    name: 'STRONGLIFTS 5×5', days: ['A', 'B'], linear: true,
    note: 'Classic 5×5 on squat, bench, row and press, 1×5 deadlift. Alternate Day A and Day B. Adds weight every session.'
  },
  lite: {
    name: 'LITE 2×5', days: ['A', 'B'], linear: true,
    note: 'Same lifts and progression with two sets each. Half the volume, for when recovery is short, like a heavy cycling block.'
  },
  madcow: {
    name: 'MADCOW 5×5', days: ['M', 'W', 'F'],
    note: 'Intermediate, weekly progress. Monday ramps to a top 5, Wednesday is light, Friday ramps to a triple 2.5% over Monday plus a back-off 8. The weight shown is your Monday top set; it goes up 2.5% after a good Friday.'
  },
  texas: {
    name: 'TEXAS METHOD', days: ['V', 'R', 'I'],
    note: 'Intermediate, weekly progress. Monday 5×5 at 90%, Wednesday light, Friday a new 5-rep best. Bench and press swap each week. The weight shown is your Friday target; it goes up by the increment after a good Friday.'
  }
};

export const DAY_TITLES = {
  A: 'Day A', B: 'Day B', C: 'Day C', KB: 'Kettlebell',
  M: 'Monday', W: 'Wednesday', F: 'Friday',
  V: 'Volume', R: 'Recovery', I: 'Intensity'
};

export const DAY_SUBTITLES = { M: 'heavy', W: 'light', F: 'intensity', V: 'Monday', R: 'Wednesday', I: 'Friday' };

export const LINEAR_PLAN = { A: ['squat', 'bench', 'row'], B: ['squat', 'ohp', 'dead'] };

export const daysFor = (program) => (PROGRAMS[program] || PROGRAMS.sl).days;
export const isLinear = (program) => !!(PROGRAMS[program] || PROGRAMS.sl).linear;
const fine = (unit) => (unit === 'kg' ? 1.25 : 2.5);

// Madcow weekly bump: +2.5%, never less than the smallest plate pair.
export function madcowBump(w, unit) {
  return round2(Math.max(w + fine(unit), roundTo(w * 1.025, fine(unit))));
}

/**
 * The lifts for one day. Each item:
 *   { id, label, sets: [{ reps, w }], top, progress }
 * progress: null (no change), { type: 'linear' }, { type: 'pct', idx } or { type: 'inc', idx },
 * where idx lists the sets that must all hit their reps.
 */
export function planFor(s, day, schemeFor) {
  const st = step(s.unit), bar = s.bar;
  const at = (x) => Math.max(bar, roundTo(x, st));
  const sets = (n, reps, w) => Array.from({ length: n }, () => ({ reps, w }));
  const W = s.weights;

  if (isLinear(s.program)) {
    return (LINEAR_PLAN[day] || LINEAR_PLAN.A).map((id) => {
      const sk = schemeFor(id), sc = SCHEMES[sk];
      return { id, scheme: sk, label: sk.replace('x', '×'), sets: sets(sc.sets, sc.reps, W[id]), top: W[id], progress: { type: 'linear' } };
    });
  }

  if (s.program === 'madcow') {
    const ramp = (T, pcts, reps = 5) => pcts.map((p) => ({ reps, w: at(T * p) }));
    const five = [0.5, 0.625, 0.75, 0.875, 1];
    if (day === 'W') {
      return [
        { id: 'squat', label: '4×5 light · up to Monday’s 3rd set', sets: ramp(W.squat, [0.5, 0.625, 0.75, 0.75]), top: at(W.squat * 0.75), progress: null },
        { id: 'ohp', label: 'ramp 5×5 to a top set', sets: ramp(W.ohp, five), top: W.ohp, progress: { type: 'pct', idx: [4] } },
        { id: 'dead', label: 'ramp 4×5 to a top set', sets: ramp(W.dead, [0.625, 0.75, 0.875, 1]), top: W.dead, progress: { type: 'pct', idx: [3] } }
      ];
    }
    return ['squat', 'bench', 'row'].map((id) => {
      const T = W[id];
      if (day === 'F') {
        const triple = Math.max(bar, roundTo(T * 1.025, fine(s.unit)));
        return {
          id, label: 'ramp · triple +2.5% · back-off 8',
          sets: ramp(T, [0.5, 0.625, 0.75, 0.875]).concat([{ reps: 3, w: triple }, { reps: 8, w: at(T * 0.75) }]),
          top: triple, progress: { type: 'pct', idx: [4] }
        };
      }
      return { id, label: 'ramp 5×5 to a top set', sets: ramp(T, five), top: T, progress: null };
    });
  }

  // Texas Method
  const press = s.texasPress === 'ohp' ? 'ohp' : 'bench';
  const other = press === 'ohp' ? 'bench' : 'ohp';
  if (day === 'R') {
    return [
      { id: 'squat', label: '2×5 light · 80% of Monday', sets: sets(2, 5, at(W.squat * 0.72)), top: at(W.squat * 0.72), progress: null },
      { id: other, label: '3×5 light', sets: sets(3, 5, at(W[other] * 0.9)), top: at(W[other] * 0.9), progress: null }
    ];
  }
  if (day === 'I') {
    return [
      { id: 'squat', label: '1×5 · new 5-rep best', sets: sets(1, 5, W.squat), top: W.squat, progress: { type: 'inc', idx: [0] } },
      { id: press, label: '1×5 · new 5-rep best', sets: sets(1, 5, W[press]), top: W[press], progress: { type: 'inc', idx: [0] } }
    ];
  }
  return [
    { id: 'squat', label: '5×5 · 90% of Friday', sets: sets(5, 5, at(W.squat * 0.9)), top: at(W.squat * 0.9), progress: null },
    { id: press, label: '5×5 · 90% of Friday', sets: sets(5, 5, at(W[press] * 0.9)), top: at(W[press] * 0.9), progress: null },
    { id: 'dead', label: '1×5', sets: sets(1, 5, W.dead), top: W.dead, progress: { type: 'inc', idx: [0] } }
  ];
}

// ---------- "Which program?" guide ----------
export const GUIDE = {
  sl: {
    who: 'New to barbells, or back after a long break.',
    week: '3 days · A/B alternate', time: '45–60 min',
    upside: 'Fastest progress you’ll ever make: weight goes up every session.',
    catch: 'Linear gains run out, usually press first, then bench and squat.'
  },
  lite: {
    who: 'Lifting alongside a lot of other training, like a cycling block, or short on sleep and time.',
    week: '3 days · A/B alternate', time: '25–35 min',
    upside: 'Same progression with half the sets, so it leaves energy for everything else.',
    catch: 'Less volume means slower strength gains and an earlier stall.'
  },
  madcow: {
    who: 'Finished linear progress: lifts keep stalling and deloading on 5×5.',
    week: '3 days · Mon heavy, Wed light, Fri top triple', time: '60–75 min',
    upside: 'Ramping sets double as warm-ups and the jumps are small, so it’s forgiving. Expect a PR every week.',
    catch: 'Progress is weekly (about 2.5%), and Friday is a long session.'
  },
  texas: {
    who: 'Finished linear progress and recovers well: sleeping and eating enough.',
    week: '3 days · Mon volume, Wed recovery, Fri 5-rep PR', time: '60–90 min',
    upside: 'A new 5-rep best every Friday, which is very motivating while it lasts.',
    catch: 'Monday’s 5×5 at 90% is hard, and it’s easy to burn out if recovery slips.'
  }
};

export const QUIZ = [
  { key: 'exp', q: 'Where are you with barbell training?', options: [
    ['new', 'New, or under ~6 months'], ['back', 'Coming back after time off'], ['stalled', 'Stalling on 5×5 despite deloads']] },
  { key: 'rec', q: 'How much else is on your plate?', options: [
    ['ok', 'Lifting is my main training'], ['low', 'Lots of other training, or short on sleep']] },
  { key: 'style', q: 'Which sounds better?', options: [
    ['ramp', 'Building up through lighter sets'], ['heavy', 'One heavy all-out set a week']] }
];

/**
 * answers: { exp, rec, style } (any may be missing). stalls: main lifts with
 * two or more deloads in the log. Returns { id, why }.
 */
export function recommend(answers, stalls) {
  const a = answers || {};
  const stalled = a.exp === 'stalled' || (!a.exp && stalls >= 2);
  if (a.rec === 'low') {
    return { id: 'lite', why: 'With a lot of other training going on, half the volume keeps you progressing without digging a recovery hole.' };
  }
  if (stalled) {
    return a.style === 'heavy'
      ? { id: 'texas', why: 'Linear progress has run its course, and you like a heavy top set. Texas gives you a 5-rep PR every Friday.' }
      : { id: 'madcow', why: 'Linear progress has run its course. Madcow moves to weekly progress with gentle ramps, the easier step up.' };
  }
  if (a.exp === 'back') {
    return { id: 'sl', why: 'Coming back, strength returns fastest with session-to-session progress. Take the ease-back offer on the Log page first.' };
  }
  return { id: 'sl', why: 'Adding weight every session is the fastest way to get strong while it still works.' };
}
