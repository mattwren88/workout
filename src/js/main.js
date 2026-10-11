import { Tracker } from './model.js';
import { render, restInfo, sessionText } from './view.js';
import * as native from './native.js';

const root = document.getElementById('app');
let acts = [];
let lastTab = null;

const tracker = new Tracker({ storage: window.localStorage, onChange: draw });

tracker.health = native.health;
tracker.ui = {
  async shareBackup() {
    try {
      const msg = await native.shareBackup(tracker.backupText());
      tracker.setState({ backupOk: true, backupMsg: msg });
    } catch {
      tracker.setState({ backupOpen: true, backupOk: false, backupMsg: 'Could not save here. Copy the backup text below instead.' });
    }
  },
  async pickBackupFile() {
    const text = await native.pickFile();
    if (text != null) tracker.restore(text);
  }
};

let restKey = null;
function syncNative(s) {
  const key = s.restFrom ? s.restFrom + '|' + s.restTarget : '';
  if (key !== restKey) {
    restKey = key;
    native.scheduleRest(s.restFrom ? s.restFrom + s.restTarget * 1000 : null, s.restTarget > 180);
  }
  native.keepAwake(!!s.sessionStart && s.tab === 'workout');
}

function draw() {
  const s = tracker.state;
  const main = document.getElementById('main');
  const scroll = main && s.tab === lastTab ? main.scrollTop : 0;
  const out = render(tracker, Date.now());
  acts = out.acts;
  root.innerHTML = out.html;
  document.getElementById('main').scrollTop = scroll;
  lastTab = s.tab;
  syncNative(s);
}

root.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn || btn.disabled) return;
  const fn = acts[Number(btn.dataset.act)];
  if (fn) fn();
});

// Text fields update state without re-rendering, so focus and caret survive.
root.addEventListener('input', (e) => {
  const key = e.target.dataset && e.target.dataset.input;
  if (key) tracker.state = { ...tracker.state, [key]: e.target.value };
});

// Every second: update timer text in place (a full re-render would swallow taps).
let buzzedFor = null;
setInterval(() => {
  const s = tracker.state, now = Date.now();
  if (s.restFrom) {
    const r = restInfo(s, now);
    if (r.up && buzzedFor !== s.restFrom) { buzzedFor = s.restFrom; native.buzz(); }
    root.querySelectorAll('[data-live="rest"]').forEach((el) => {
      el.textContent = r.label;
      el.setAttribute('aria-label', r.aria);
      el.classList.toggle('is-up', r.up);
    });
  }
  if (s.sessionStart) root.querySelectorAll('[data-live="session"]').forEach((el) => { el.textContent = sessionText(s, now); });
}, 1000);

// Coming back from the background: refresh dates, timers and the welcome-back check.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { draw(); tracker.syncHealth(); }
});

native.init({
  onBack() {
    const s = tracker.state;
    if (s.tab === 'programs') tracker.setState({ tab: 'settings' });
    else if (s.tab !== 'workout') tracker.setState({ tab: 'workout' });
    else native.minimize();
  }
});

draw();
tracker.syncHealth(); // retry anything a previous run couldn't write
