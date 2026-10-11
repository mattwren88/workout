// Turns Tracker state into HTML. Buttons carry data-act="<n>" pointing at a handler
// collected during render; main.js dispatches clicks to them.
import {
  LIFTS, LADDER, ACC_LIB, PLATE_SIZES, KB_ROUTINE, EXTRA_REST, CYCLE, schemeLabel, barChoices,
  fmt, round2, clock, liftEntry, entryWeight, entryUnit
} from './model.js';
import { PROGRAMS, DAY_TITLES, DAY_SUBTITLES, isLinear, daysFor, GUIDE, QUIZ, recommend } from './programs.js';

const ACC_COLOR = '#B8AE98';
const KB_COLOR = '#5A554B';
const INK = '#1D1B17';

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function dateText(d) {
  try { return new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); } catch { return ''; }
}
function shortDate(d) {
  try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return ''; }
}

export function lastText(prev, target) {
  if (!prev) return 'first session';
  const digits = (prev.reps || '').replace(/[^0-9 ]/g, '').trim().split(/\s+/);
  const allHit = prev.ok === true || (digits.length > 0 && digits.every((c) => Number(c) === target));
  const pw = entryWeight(prev);
  const wt = prev.w === null ? 'bw' : (isNaN(pw) ? '' : fmt(pw));
  return 'last: ' + wt + ' · ' + (allHit ? 'all ' + target + 's' : (prev.reps || '').replace(/ · /g, ' '));
}

export function restInfo(s, now) {
  const secs = s.restFrom ? Math.max(0, Math.floor((now - s.restFrom) / 1000)) : 0;
  const up = secs >= s.restTarget;
  return {
    up,
    label: up ? 'GO · ' + clock(secs) : 'REST ' + clock(secs) + ' / ' + clock(s.restTarget),
    aria: 'Rest ' + clock(secs) + '. Tap to clear.'
  };
}

export function sessionText(s, now) {
  const secs = s.sessionStart ? Math.max(0, Math.floor((now - s.sessionStart) / 1000)) : 0;
  return Math.floor(secs / 60) + ' MIN IN';
}

export function render(t, now) {
  const s = t.state;
  const acts = [];
  const on = (fn) => { acts.push(fn); return 'data-act="' + (acts.length - 1) + '"'; };
  const isC = s.mode === 'c';
  let anyLogged = false;

  const seg = (options, current, pick, cls = '') => options.map(([val, label]) => {
    const sel = val === current;
    return `<button class="seg${sel ? ' is-on' : ''} ${cls}" aria-pressed="${sel}" ${on(() => pick(val))}>${esc(label)}</button>`;
  }).join('');

  const pm = (name, minus, plus) =>
    `<button class="pm" aria-label="Lower ${esc(name)} weight" ${on(minus)}>&minus;</button>` +
    `<button class="pm" aria-label="Raise ${esc(name)} weight" ${on(plus)}>+</button>`;

  const restBtn = (key) => {
    if (!s.restFrom || s.restLift !== key) return '';
    const r = restInfo(s, now);
    return `<button class="rest${r.up ? ' is-up' : ''}" data-live="rest" aria-label="${r.aria}" ${on(() => t.setState({ restFrom: null, restLift: null }))}>${r.label}</button>`;
  };

  const setButtons = (key, n, target, restFull, small) => {
    const arr = s.sets[key] || [];
    let html = '';
    for (let i = 0; i < n; i++) {
      const v = arr[i];
      if (v != null) anyLogged = true;
      const state = v == null ? '' : (v === target ? ' is-full' : ' is-miss');
      const aria = v == null ? 'not done' : v + ' of ' + target + ' reps';
      html += `<button class="set${small ? ' set--sm' : ''}${state}" aria-label="Set ${i + 1}: ${aria}" ${on(() => t.tapSet(key, i, n, target, restFull))}>${v == null ? target : v}</button>`;
    }
    return `<div class="sets">${html}</div>`;
  };

  // ---------- LOG ----------
  const logView = () => {
    const ret = !isC ? t.returnInfo() : null;
    const other = t.nextDay();
    const prog = PROGRAMS[s.program] || PROGRAMS.sl;
    let html = `<header class="head">
      <div class="head__top">
        <div><div class="eyebrow">${esc(dateText(now))} · ${isC ? 'IN-BETWEEN DAY' : prog.name + (DAY_SUBTITLES[s.next] ? ' · ' + DAY_SUBTITLES[s.next] : '')}</div>
        <h1 class="title">${isC ? 'Day C' : DAY_TITLES[s.next]}</h1></div>
        ${isC ? '' : `<button class="btn btn--ghost btn--sm" aria-label="Switch to ${DAY_TITLES[other]}" ${on(() => t.swapWorkout())}>SWITCH → ${shortDay(other)}</button>`}
      </div>
      <div class="head__meta">
        <div class="week"><span class="eyebrow">THIS WEEK</span><div class="week__days">${weekStrip(s, now)}</div></div>
        ${s.sessionStart ? `<div class="eyebrow" data-live="session">${sessionText(s, now)}</div>` : ''}
      </div>
      <div class="grid2">${seg([['bar', 'BARBELL · ' + DAY_TITLES[s.next].toUpperCase()], ['c', 'DAY C']], s.mode, (m) => t.setMode(m))}</div>
    </header>`;

    if (ret) {
      html += `<section class="callout">
        <div class="callout__title">Welcome back</div>
        <div>${ret.days} days since your last session. Take ${ret.pct}% off every main lift and build back up from there?</div>
        <div class="grid2">
          <button class="btn btn--paper" ${on(() => t.applyReturn())}>EASE BACK IN</button>
          <button class="btn btn--outline-paper" ${on(() => t.skipReturn())}>KEEP WEIGHTS</button>
        </div></section>`;
    }
    if (isC) {
      html += '<p class="note note--pad">A light day between lifting. Keep it easy enough that it helps recovery instead of eating into it. Day C doesn\'t change the A/B rotation.</p>';
      if (s.dayC.cycle) html += cycleCard();
      const defs = t.dayCExtras();
      html += defs.map((d) => extraCard(d, KB_ROUTINE.some((k) => k.key === d.key) ? INK : (d.kind === 'kb' ? KB_COLOR : ACC_COLOR))).join('');
      if (!s.dayC.cycle && !defs.length) html += '<p class="note note--pad">Nothing on Day C yet. Turn on the kettlebell routine or cycling, or add accessories to Day C, under Setup.</p>';
    } else {
      html += t.plan().map((item) => liftCard(item)).join('');
      const extraDefs = t.activeAccs();
      if (extraDefs.length) {
        html += '<div class="label label--pad">ACCESSORIES</div>';
        html += extraDefs.map((d) => extraCard(d, d.kind === 'kb' ? KB_COLOR : ACC_COLOR)).join('');
      } else if (Object.keys(s.accs).length === 0) {
        html += '<p class="note note--pad">Add pull-ups, dips, kettlebell work and more under Setup → Accessories.</p>';
      }
    }

    html += `<div class="finish">
      <button class="btn btn--finish" ${anyLogged ? '' : 'disabled'} ${on(() => { t.finish(); t.syncHealth(); })}>Finish ${isC ? 'Day C' : DAY_TITLES[s.next]}</button>
      <p class="note center">Tap a set when you hit every rep. Tap again to count down missed reps.</p></div>`;
    return html;
  };

  const liftCard = (item) => {
    const id = item.id, lift = LIFTS[id], w = item.top;
    const linear = isLinear(s.program);
    const sk = item.scheme || '5x5';
    const open = s.openWarm === id;
    const ramp = item.sets.some((x) => x.w !== item.sets[0].w || x.reps !== item.sets[0].reps);
    let last = lastText(t.lastFor(id, lift.name), item.sets[item.sets.length - 1].reps);
    if (s.fails[id] > 0) last += ' · miss ' + s.fails[id] + '/3';
    const nextScheme = LADDER[sk];
    const offer = !!s.offers[id] && !!nextScheme && s.program === 'sl';
    return `<section class="lift">
      <div class="stripe" style="background:${lift.color}"></div>
      <div class="lift__body">
        <div class="lift__head">
          <div><h2 class="lift__name">${lift.name}</h2>
          <div class="note">${esc(item.label)}${s.deloads[id] > 0 && s.program === 'sl' ? ' · deloads ' + s.deloads[id] : ''}</div></div>
          <div class="weight">${fmt(w)}<span class="weight__unit"> ${s.unit}</span></div>
        </div>
        ${offer ? `<div class="offer"><div>This lift has stalled through two deloads. Fewer sets usually gets it moving again.</div>
          <div class="grid2"><button class="btn btn--ink" ${on(() => t.acceptOffer(id))}>SWITCH TO ${schemeLabel(nextScheme)}</button>
          <button class="btn btn--ghost" ${on(() => t.declineOffer(id))}>NOT NOW</button></div></div>` : ''}
        ${ramp ? rampButtons(id, item.sets, s.restGood) : setButtons(id, item.sets.length, item.sets[0].reps, s.restGood)}
        <div class="lift__foot"><div>${esc(last)}</div>${restBtn(id)}</div>
        ${open ? `<div class="warm"><div class="warm__row warm__row--head"><div>SETS</div><div>${s.unit.toUpperCase()}</div><div>PLATES / SIDE</div></div>
          ${(linear || !ramp ? t.warmups(id, w, item.sets.length + '×' + item.sets[0].reps) : item.sets.map((x) => ({ reps: '1×' + x.reps, weightText: fmt(x.w), plates: t.plates(x.w), work: x.w === w })))
            .map((r) => `<div class="warm__row${r.work ? ' is-work' : ''}"><div>${r.reps}</div><div>${r.weightText}</div><div>${r.plates}</div></div>`).join('')}</div>` : ''}
        <div class="lift__tools">
          <button class="link" aria-expanded="${open}" ${on(() => t.setState({ openWarm: open ? null : id }))}>${open ? '− hide' : (w <= s.bar || ramp ? '+ plates' : '+ warm-up')}</button>
          <div class="pms">${pm(lift.name, () => t.adjust(id, -1), () => t.adjust(id, 1))}</div>
        </div>
      </div></section>`;
  };

  // Sets with their own reps and weights (ramps): weight printed under each button.
  const rampButtons = (key, list, restFull) => {
    const arr = s.sets[key] || [];
    return `<div class="sets">${list.map((x, i) => {
      const v = arr[i];
      if (v != null) anyLogged = true;
      const state = v == null ? '' : (v === x.reps ? ' is-full' : ' is-miss');
      const aria = (v == null ? 'not done' : v + ' of ' + x.reps + ' reps') + ' at ' + fmt(x.w) + ' ' + s.unit;
      return `<div class="set-col"><button class="set${state}" aria-label="Set ${i + 1}: ${aria}" ${on(() => t.tapSet(key, i, list.length, x.reps, restFull))}>${v == null ? x.reps : v}</button><div class="set-w">${fmt(x.w)}</div></div>`;
    }).join('')}</div>`;
  };

  const cycleCard = () => {
    if (s.cycleDone) anyLogged = true;
    return `<section class="lift lift--extra">
      <div class="stripe" style="background:${INK}"></div>
      <div class="lift__body">
        <div class="lift__head">
          <div><h2 class="lift__name lift__name--sm">${CYCLE.name}</h2><div class="note">easy spin · tap when done</div></div>
          <div class="weight weight--sm">${s.cycleMins}<span class="weight__unit"> min</span></div>
        </div>
        <div class="lift__foot">
          <button class="set set--wide${s.cycleDone ? ' is-full' : ''}" aria-pressed="${s.cycleDone}" ${on(() => t.toggleCycleDone())}>${s.cycleDone ? 'DONE' : 'RIDE'}</button>
          <div class="pms"><button class="pm" aria-label="Fewer minutes" ${on(() => t.adjustCycle(-1))}>&minus;</button><button class="pm" aria-label="More minutes" ${on(() => t.adjustCycle(1))}>+</button></div>
        </div>
      </div></section>`;
  };

  const extraCard = (def, color) => {
    const key = 'x:' + def.key, hasWeight = def.kind !== 'bw', w = t.extraW(def);
    return `<section class="lift lift--extra">
      <div class="stripe" style="background:${color}"></div>
      <div class="lift__body">
        <div class="lift__head">
          <div><h2 class="lift__name lift__name--sm">${def.name}</h2>
          <div class="note">${def.sets}×${def.reps}${def.note ? ' · ' + def.note : ''}</div></div>
          <div class="weight weight--sm">${hasWeight ? fmt(w) : 'BW'}<span class="weight__unit"> ${hasWeight ? s.unit : ''}</span></div>
        </div>
        ${setButtons(key, def.sets, def.reps, EXTRA_REST, true)}
        <div class="lift__foot"><div>${esc(lastText(t.lastFor(key, def.name), def.reps))}</div>${restBtn(key)}
          ${hasWeight ? `<div class="pms">${pm(def.name, () => t.adjustExtra(def, -1), () => t.adjustExtra(def, 1))}</div>` : ''}</div>
      </div></section>`;
  };

  // ---------- HISTORY ----------
  const historyView = () => {
    const n = s.history.length;
    let html = `<header class="head head--plain"><div class="eyebrow">${n}${n === 1 ? ' SESSION' : ' SESSIONS'}</div><h1 class="title">History</h1></header>`;
    if (!n) return html + '<p class="note note--pad">No sessions logged yet. Finish one and it lands here with the weight for next time.</p>';
    const rows = progressRows(s);
    if (rows.length) {
      html += '<section class="progress"><h2 class="label">PROGRESS</h2>' + rows.map((p) => `
        <div class="progress__row">
          <div class="stripe stripe--thin" style="background:${p.color}"></div>
          <div class="grow"><div class="progress__name">${p.name}</div><div class="note">${esc(p.delta)}</div></div>
          <svg width="110" height="36" viewBox="0 0 110 36" role="img" aria-label="${esc(p.aria)}"><title>${esc(p.aria)}</title>
            <polyline points="${p.points}" fill="none" stroke="${p.stroke}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
            <circle cx="${p.endX}" cy="${p.endY}" r="4" fill="${p.stroke}" stroke="#F3EEE2" stroke-width="2"/></svg>
          <div class="progress__now">${p.current}</div>
        </div>`).join('') + '</section>';
    }
    const byName = {};
    Object.values(LIFTS).forEach((l) => { byName[l.name] = l; });
    html += s.history.map((h, idx) => {
      const key = h.date + '|' + idx, confirming = s.confirmDel === key;
      const title = (DAY_TITLES[h.workout] || 'Day ' + h.workout) + (h.program === 'lite' ? ' · Lite' : (h.program === 'madcow' ? ' · Madcow' : (h.program === 'texas' ? ' · Texas' : '')));
      const kindColor = (l) => (l.kind === 'cardio' || KB_ROUTINE.some((k) => 'x:' + k.key === l.id) ? INK : (l.kind === 'kb' ? KB_COLOR : ACC_COLOR));
      const lifts = (h.lifts || []).map((l) => {
        const m = (l.id && LIFTS[l.id]) || byName[l.name];
        const c = m ? m.color : kindColor(l);
        return `<div class="entry"><div class="stripe stripe--thin" style="background:${c}"></div>
          <div class="grow"><div class="row"><b>${esc(l.name)}</b><b class="nowrap">${esc(l.weightText)}</b></div>
          <div class="row note"><div>${esc(l.reps)}</div><div class="right">${esc(l.outcome || '')}</div></div></div></div>`;
      }).join('');
      return `<section class="session">
        <div class="row row--base"><h2 class="lift__name">${esc(title)}</h2><div class="eyebrow">${esc(dateText(h.date))}${h.mins ? ' · ' + h.mins + ' min' : ''}</div></div>
        ${lifts}
        <div class="right"><button class="link link--sm${confirming ? ' is-danger' : ''}" ${on(() => (confirming ? t.deleteSession(idx) : t.setState({ confirmDel: key })))}>${confirming ? 'TAP AGAIN TO DELETE' : 'DELETE'}</button></div>
      </section>`;
    }).join('');
    return html;
  };

  // ---------- SETUP ----------
  const settingsView = () => {
    const section = (label, body, note) => `<section class="block"><h2 class="label">${label}</h2>${body}${note ? `<p class="note">${note}</p>` : ''}</section>`;
    const locked = s.program !== 'sl';
    const dayNames = { '': 'OFF', both: 'A + B', A: 'DAY A', B: 'DAY B', C: 'DAY C' };
    const srLinks = (base) => {
      const d = t.def(base);
      return `<div class="cfg__links">
        <button class="link link--sm link--muted" aria-label="${base.name} sets, now ${d.sets}. Tap to change." ${on(() => t.cycleSR(base.key, 'sets'))}>${d.sets} sets</button>
        <button class="link link--sm link--muted" aria-label="${base.name} reps, now ${d.reps}. Tap to change." ${on(() => t.cycleSR(base.key, 'reps'))}>× ${d.reps}${base.note ? ' ' + base.note : ''}</button></div>`;
    };
    let html = '<header class="head head--plain"><h1 class="title">Setup</h1></header>';
    html += section('PROGRAM', `<div class="grid2">${seg(Object.keys(PROGRAMS).map((k) => [k, PROGRAMS[k].name]), s.program, (p) => t.setProgram(p))}</div>`,
      PROGRAMS[s.program].note + ' Switching keeps your weights and history.' +
      `</p><button class="link" ${on(() => t.setState({ tab: 'programs' }))}>Which program is right for me? →</button><p class="note">`);
    html += section('UNITS', `<div class="grid2">${seg([['lb', 'POUNDS'], ['kg', 'KILOGRAMS']], s.unit, (u) => t.setUnit(u))}</div>`,
      'Switching converts your working weights and rounds them to plates and bells you can load.');
    html += section('BAR WEIGHT', `<div class="grid3">${seg(barChoices(s.unit).map((b) => [b, b + ' ' + s.unit]), s.bar, (b) => t.save({ bar: b }))}</div>`,
      'Used for warm-ups and the plate math.' +
      `</p><button class="link" ${on(() => t.setState({ tab: 'plates' }))}>Plate calculator and my plates →</button><p class="note">`);
    html += section('REST AFTER A GOOD SET', `<div class="grid3">${seg([[90, '1:30'], [120, '2:00'], [180, '3:00']], s.restGood, (r) => t.save({ restGood: r }))}</div>`,
      'After a missed set the timer counts to 5:00. Accessories and kettlebell sets rest 1:30. The phone buzzes when time is up.');
    html += section('MAIN LIFTS', Object.keys(LIFTS).map((id) => {
      const l = LIFTS[id];
      const sch = s.program === 'madcow' ? 'top set' : (s.program === 'texas' ? (id === 'dead' ? '1×5' : '5-rep target') : schemeLabel(t.schemeFor(id)));
      const inc = s.program === 'madcow' ? '+2.5% / week' : '+' + fmt(s.incs[id]) + ' ' + s.unit + (s.program === 'texas' ? ' / week' : ' / session');
      const incLocked = s.program === 'madcow' || (s.program === 'texas' && id === 'row');
      return `<div class="cfg"><div class="stripe stripe--thin" style="background:${l.color}"></div>
        <div class="grow"><div class="progress__name">${l.name}</div><div class="cfg__links">
          <button class="link link--sm link--muted${locked ? ' is-locked' : ''}" ${locked ? 'disabled' : ''} aria-label="Change ${l.name} sets and reps, now ${sch}" ${on(() => t.cycleScheme(id))}>${sch}</button>
          <button class="link link--sm link--muted${incLocked ? ' is-locked' : ''}" ${incLocked ? 'disabled' : ''} aria-label="Change ${l.name} increment, now ${inc}" ${on(() => t.cycleInc(id))}>${inc}</button></div></div>
        <button class="pm" aria-label="Lower ${l.name} weight" ${on(() => t.adjust(id, -1))}>&minus;</button>
        <div class="cfg__w">${fmt(s.weights[id])}</div>
        <button class="pm" aria-label="Raise ${l.name} weight" ${on(() => t.adjust(id, 1))}>+</button></div>`;
    }).join(''), isLinear(s.program)
      ? 'Tap the sets × reps or the increment to change them. After a lift stalls through two deloads, the log offers the next lower-volume step: 5×5 → 3×5 → 3×3.'
      : (s.program === 'madcow'
        ? 'Weights are your top set of 5: Monday for squat, bench and row; Wednesday for press and deadlift. The ramps are worked out from them. Texas Method doesn\'t use row.'
        : 'Weights are your Friday 5-rep targets (deadlift: its Monday 1×5). Monday and Wednesday are worked out from them. Row isn\'t part of Texas Method.'));
    html += section('DAY C', `<div class="grid2">
        <button class="seg${s.dayC.kb ? ' is-on' : ''}" aria-pressed="${!!s.dayC.kb}" ${on(() => t.toggleDayC('kb'))}>KB ROUTINE</button>
        <button class="seg${s.dayC.cycle ? ' is-on' : ''}" aria-pressed="${!!s.dayC.cycle}" ${on(() => t.toggleDayC('cycle'))}>CYCLING</button></div>
      ${s.dayC.kb ? KB_ROUTINE.map((d) => `<div class="cfg"><div class="stripe stripe--thin" style="background:${INK}"></div>
        <div class="grow"><b>${d.name}</b>${srLinks(d)}</div></div>`).join('') : ''}`,
      'The in-between day. Pick what goes on it here, and add accessories to it below. Day C doesn\'t change the A/B rotation.');
    html += section('ACCESSORIES', '<p class="note">Tap the day button to put a lift on Day A, Day B, both, or Day C. Tap sets or reps to change them. Accessories have no automatic progression.</p>' + ACC_LIB.map((d) => {
      const day = s.accs[d.key] || '';
      return `<div class="cfg"><div class="stripe stripe--thin" style="background:${d.kind === 'kb' ? KB_COLOR : ACC_COLOR}"></div>
        <div class="grow"><b>${d.name}</b>${srLinks(d)}<div class="note">${d.kind === 'kb' ? 'kettlebell' : (d.kind === 'bw' ? 'bodyweight' : 'weighted')}</div></div>
        <button class="seg seg--day${day ? ' is-on' : ''}" aria-label="${d.name}: ${day ? 'on ' + dayNames[day] : 'off'}. Tap to change." ${on(() => t.cycleAccDay(d.key))}>${dayNames[day]}</button></div>`;
    }).join(''));
    html += section('PROGRESSION', '<p>Hit every rep and the lift goes up next time. Miss reps and the weight repeats. Three misses in a row drops it 10%. After two weeks or more away, the log offers to ease you back in.</p>');
    html += section('GOOGLE HEALTH', t.health
      ? `<div class="grid2">
          <button class="seg${s.healthSync ? ' is-on' : ''}" aria-pressed="${s.healthSync}" ${on(() => t.enableHealth())}>${s.healthSync ? 'SYNC ON' : 'CONNECT'}</button>
          <button class="seg" ${s.healthSync ? '' : 'disabled'} ${on(() => t.disableHealth())}>TURN OFF</button></div>
        ${s.healthMsg ? `<div role="status" class="msg${s.healthOk ? '' : ' is-danger'}">${esc(s.healthMsg)}</div>` : ''}`
      : '<p>Health Connect sync works in the Android app, not in this preview.</p>',
      'Each finished session is written to Health Connect as a strength workout, and Day C cycling as a ride. Connecting also sends your past sessions. Deleting a session here removes it there too.');
    html += section('BACKUP', `<p class="note">Your log lives on this device. Uninstalling the app erases it, so save a backup somewhere safe now and then.</p>
      <div class="grid2"><button class="btn btn--ink" ${on(() => t.ui.shareBackup())}>SAVE BACKUP</button>
      <button class="btn btn--ghost" aria-expanded="${!!s.backupOpen}" ${on(() => t.setState({ backupOpen: !s.backupOpen, backupMsg: '' }))}>${s.backupOpen ? 'HIDE' : 'RESTORE'}</button></div>
      ${s.backupMsg ? `<div role="status" class="msg${s.backupOk ? '' : ' is-danger'}">${esc(s.backupMsg)}</div>` : ''}
      ${s.backupOpen ? `<div class="stack">
        <div class="label label--sm">CURRENT BACKUP</div><div class="dump">${esc(t.backupText())}</div>
        <label class="label label--sm" for="restore-box">PASTE A BACKUP TO RESTORE</label>
        <textarea id="restore-box" rows="4" data-input="importText">${esc(s.importText)}</textarea>
        <div class="grid2"><button class="btn btn--ghost" ${on(() => t.ui.pickBackupFile())}>OPEN FILE</button>
        <button class="btn btn--ghost" ${on(() => t.restore(t.state.importText))}>RESTORE</button></div></div>` : ''}`);
    html += `<div class="finish"><button class="btn btn--danger" ${on(() => (s.confirmReset ? t.reset() : t.setState({ confirmReset: true })))}>${s.confirmReset ? 'TAP AGAIN TO ERASE EVERYTHING' : 'RESET ALL DATA'}</button></div>`;
    return html;
  };

  // ---------- WHICH PROGRAM ----------
  const programsView = () => {
    const quiz = s.quiz || {};
    const stalls = Object.keys(LIFTS).filter((id) => (s.deloads[id] || 0) >= 2).length;
    const rec = recommend(quiz, stalls);
    let html = `<header class="head head--plain">
      <button class="link link--sm" ${on(() => t.setState({ tab: 'settings' }))}>← SETUP</button>
      <h1 class="title">Which program?</h1></header>`;
    html += QUIZ.map((item) => `<section class="block"><h2 class="label">${item.q.toUpperCase()}</h2>
      <div class="stack">${item.options.map(([val, label]) => {
        const sel = quiz[item.key] === val;
        return `<button class="seg seg--left${sel ? ' is-on' : ''}" aria-pressed="${sel}" ${on(() => t.setState({ quiz: { ...quiz, [item.key]: sel ? undefined : val } }))}>${label}</button>`;
      }).join('')}</div></section>`).join('');
    const current = rec.id === s.program;
    html += `<section class="callout">
      <div class="eyebrow eyebrow--paper">SUGGESTED FOR YOU</div>
      <div class="callout__title">${PROGRAMS[rec.id].name}</div>
      <div>${rec.why}${stalls >= 2 && !quiz.exp ? ` Your log shows ${stalls} lifts that have deloaded twice.` : ''}</div>
      ${current ? '<div><b>You’re already on it.</b></div>' : `<button class="btn btn--paper" ${on(() => { t.setProgram(rec.id); t.setState({ tab: 'workout' }); })}>USE ${PROGRAMS[rec.id].name}</button>`}
    </section>`;
    html += '<div class="label label--pad">ALL PROGRAMS</div>';
    html += Object.keys(PROGRAMS).map((k) => {
      const g = GUIDE[k], on_ = s.program === k;
      return `<section class="session">
        <div class="row row--base"><h2 class="lift__name lift__name--sm">${PROGRAMS[k].name}</h2>${on_ ? '<div class="eyebrow">CURRENT</div>' : ''}</div>
        <p><b>For:</b> ${g.who}</p>
        <p class="note">${g.week} · ${g.time}</p>
        <p><b>Upside:</b> ${g.upside}</p>
        <p><b>Catch:</b> ${g.catch}</p>
        ${on_ ? '' : `<div class="right"><button class="link link--sm" ${on(() => { t.setProgram(k); t.setState({ tab: 'workout' }); })}>USE THIS</button></div>`}
      </section>`;
    }).join('');
    html += '<p class="note note--pad">Switching keeps your weights and history; check the weights under Setup → Main lifts afterwards, since each program reads them a little differently. Session times include warm-ups and rest and are rough.</p>';
    return html;
  };

  // ---------- PLATES ----------
  const platesView = () => {
    const owned = t.pairs();
    const smallest = Math.min(...Object.keys(owned).map(Number).filter((p) => owned[p] > 0), Infinity);
    const stepW = isFinite(smallest) ? smallest * 2 : (s.unit === 'kg' ? 2.5 : 5);
    const target = typeof s.calcW === 'number' ? s.calcW : (s.weights.squat || s.bar);
    const L = t.loadout(target);
    const setW = (x) => t.setState({ calcW: Math.max(s.bar, round2(x)) });
    const maxP = PLATE_SIZES[s.unit][0];
    const plateEl = (p) => `<div class="plate" style="height:${Math.round(40 + 90 * Math.sqrt(p / maxP))}px">${fmt(p)}</div>`;
    let html = `<header class="head head--plain">
      <button class="link link--sm" ${on(() => t.setState({ tab: 'settings' }))}>← SETUP</button>
      <h1 class="title">Plates</h1></header>`;
    html += `<section class="block"><h2 class="label">CALCULATOR</h2>
      <div class="calc">
        <button class="pm" aria-label="Down 10 ${s.unit}" ${on(() => setW(target - (s.unit === 'kg' ? 5 : 10)))}>&minus;&minus;</button>
        <button class="pm" aria-label="Down ${fmt(stepW)} ${s.unit}" ${on(() => setW(target - stepW))}>&minus;</button>
        <div class="calc__w">${fmt(target)}<span class="weight__unit"> ${s.unit}</span></div>
        <button class="pm" aria-label="Up ${fmt(stepW)} ${s.unit}" ${on(() => setW(target + stepW))}>+</button>
        <button class="pm" aria-label="Up 10 ${s.unit}" ${on(() => setW(target + (s.unit === 'kg' ? 5 : 10)))}>++</button>
      </div>
      <div class="barviz" aria-label="Each side: ${L.plates.length ? L.plates.map(fmt).join(', ') : 'empty bar'}">
        <div class="barviz__sleeve"></div>${L.plates.map(plateEl).join('')}<div class="barviz__end"></div>
      </div>
      <p><b>Each side:</b> ${L.plates.length ? L.plates.map(fmt).join(' + ') : 'nothing, just the bar'} · bar ${fmt(s.bar)} ${s.unit}</p>
      ${L.exact ? '' : `<p class="msg is-danger">Can’t make ${fmt(target)} with your plates. Closest is ${fmt(L.total)} ${s.unit}.</p>`}
      <div class="calc__lifts">${Object.keys(LIFTS).map((id) => `<button class="link link--sm" ${on(() => setW(s.weights[id]))}>${{ squat: 'Squat', bench: 'Bench', row: 'Row', ohp: 'Press', dead: 'Deadlift' }[id]} ${fmt(s.weights[id])}</button>`).join('')}</div>
    </section>`;
    html += `<section class="block"><h2 class="label">MY PLATES (${s.unit.toUpperCase()} · PAIRS)</h2>
      <p class="note">Set how many pairs of each plate your gym has. Warm-ups, set weights and this calculator only use what's here. Set to 0 for plates you don't have.</p>
      ${PLATE_SIZES[s.unit].map((p) => {
        const n = owned[p] || 0;
        return `<div class="cfg"><div class="grow"><b class="${n ? '' : 'muted'}">${fmt(p)} ${s.unit}</b></div>
          <button class="pm" aria-label="One fewer pair of ${fmt(p)}" ${on(() => t.setPairs(p, -1))}>&minus;</button>
          <div class="cfg__w">${n}</div>
          <button class="pm" aria-label="One more pair of ${fmt(p)}" ${on(() => t.setPairs(p, 1))}>+</button></div>`;
      }).join('')}
      <p class="note">Switching units under Setup keeps a separate plate list for pounds and kilograms.</p></section>`;
    return html;
  };

  const body = s.tab === 'plates' ? platesView() : s.tab === 'programs' ? programsView() : s.tab === 'history' ? historyView() : (s.tab === 'settings' ? settingsView() : logView());
  const tabs = [['workout', 'LOG'], ['history', 'HISTORY'], ['settings', 'SETUP']].map(([k, label]) => {
    const cur = s.tab === k || (k === 'settings' && (s.tab === 'programs' || s.tab === 'plates'));
    return `<button class="tab${cur ? ' is-on' : ''}" aria-current="${cur ? 'page' : 'false'}" ${on(() => t.setState({ tab: k, confirmReset: false, confirmDel: null, backupMsg: '' }))}>${label}</button>`;
  }).join('');

  return { html: `<main class="main" id="main">${body}</main><nav class="tabs" aria-label="Sections">${tabs}</nav>`, acts };
}

// One- or three-letter label for chips and the switch button.
function shortDay(d) { return { M: 'MON', W: 'WED', F: 'FRI', V: 'VOL', R: 'REC', I: 'INT' }[d] || d; }

function weekStrip(s, now) {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const done = s.history.filter((h) => new Date(h.date) >= start).reverse();
  const chip = (label, aria, cls) => `<div class="chip ${cls}" aria-label="${aria}">${esc(label)}</div>`;
  const label = (w) => (w === 'KB' ? 'C' : shortDay(w));
  const name = (w) => DAY_TITLES[w] || 'Day ' + w;
  let html = done.map((h) => chip(label(h.workout), name(h.workout) + ' done', 'is-done')).join('');
  html += chip(label(s.next), name(s.next) + ' up next', 'is-next');
  const days = daysFor(s.program);
  let nxt = days[(days.indexOf(s.next) + 1) % days.length];
  const lifted = done.filter((h) => h.workout !== 'C' && h.workout !== 'KB').length;
  for (let k = lifted + 1; k < 3; k++) {
    html += chip(label(nxt), name(nxt) + ' planned', 'is-planned');
    nxt = days[(days.indexOf(nxt) + 1) % days.length];
  }
  return html;
}

export function progressRows(s) {
  const chrono = s.history.slice().reverse();
  const rows = [];
  for (const id of Object.keys(LIFTS)) {
    const lift = LIFTS[id], pts = [];
    chrono.forEach((h) => (h.lifts || []).forEach((l) => {
      if (liftEntry(l, id, lift.name) && entryUnit(l, s.unit) === s.unit) {
        const w = entryWeight(l);
        if (!isNaN(w)) pts.push({ w, date: h.date });
      }
    }));
    if (!pts.length) continue;
    const shown = pts.slice(-12);
    const W = 110, H = 36, pad = 5;
    const min = Math.min(...shown.map((p) => p.w)), max = Math.max(...shown.map((p) => p.w));
    const coords = shown.map((p, i) => {
      const x = shown.length === 1 ? W - pad : pad + (i / (shown.length - 1)) * (W - pad * 2);
      const y = max === min ? H / 2 : pad + (1 - (p.w - min) / (max - min)) * (H - pad * 2);
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    });
    if (coords.length === 1) coords.unshift([pad, coords[0][1]]);
    const end = coords[coords.length - 1];
    const first = pts[0].w, current = s.weights[id], diff = Math.round((current - first) * 100) / 100;
    rows.push({
      name: lift.name, color: lift.color, stroke: lift.stroke,
      points: coords.map((c) => c.join(',')).join(' '),
      endX: end[0], endY: end[1], current: fmt(current),
      delta: (diff > 0 ? '+' : '') + fmt(diff) + ' ' + s.unit + ' since ' + shortDate(pts[0].date),
      aria: lift.name + ': ' + pts.length + ' sessions, from ' + fmt(first) + ' to ' + fmt(pts[pts.length - 1].w) + ' ' + s.unit + ', next ' + fmt(current)
    });
  }
  return rows;
}
