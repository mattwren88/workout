// Thin wrappers over Capacitor plugins, with browser fallbacks so the same
// bundle runs as the HTML preview.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { StatusBar, Style } from '@capacitor/status-bar';

export const isNative = Capacitor.isNativePlatform();

// Our own plugin: android/app/src/main/java/com/mattwren/fivebyfive/HealthSyncPlugin.kt
const HealthSync = registerPlugin('HealthSync');

export const health = isNative ? {
  async status() { return HealthSync.status(); },
  async request() { return (await HealthSync.requestPermission()).granted; },
  async write(records) { await HealthSync.writeSessions({ records }); },
  async remove(ids) { await HealthSync.deleteSessions({ ids }); }
} : null;

const REST_ID = 1;
const CHANNEL = 'rest';

export async function init({ onBack }) {
  if (!isNative) return;
  App.addListener('backButton', () => onBack());
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL, name: 'Rest timer', description: 'Buzzes when rest is up',
      importance: 4, vibration: true, visibility: 1
    });
  } catch { /* channel already exists */ }
}

let permAsked = false;
async function canNotify() {
  let p = await LocalNotifications.checkPermissions();
  if (p.display !== 'granted' && !permAsked) {
    permAsked = true;
    p = await LocalNotifications.requestPermissions();
  }
  return p.display === 'granted';
}

// Native: a scheduled notification fires even with the screen off.
export async function scheduleRest(at, missed) {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_ID }] });
    if (!at || at <= Date.now() || !(await canNotify())) return;
    await LocalNotifications.schedule({
      notifications: [{
        id: REST_ID, channelId: CHANNEL, title: 'Rest is up',
        body: missed ? 'Five minutes done. Go again.' : 'Next set when you are ready.',
        schedule: { at: new Date(at), allowWhileIdle: true }
      }]
    });
  } catch { /* notifications unavailable */ }
}

// Foreground buzz. On native the notification also vibrates; this covers the
// case where the person denied notifications.
export function buzz() {
  if (isNative) {
    Haptics.vibrate({ duration: 400 }).catch(() => {});
  } else {
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch { /* unsupported */ }
  }
}

let awake = false;
export function keepAwake(on) {
  if (!isNative || on === awake) return;
  awake = on;
  (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep()).catch(() => {});
}

export async function shareBackup(text) {
  const name = 'five-by-five-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  if (isNative) {
    const res = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: '5×5 backup', files: [res.uri], dialogTitle: 'Save backup' });
    return 'Backup ready. Save it to Drive, email or Files.';
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return 'Backup downloaded.';
}

export function pickFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json,text/plain';
    input.onchange = () => {
      const f = input.files && input.files[0];
      if (!f) { resolve(null); return; }
      f.text().then(resolve, () => resolve(null));
    };
    input.click();
  });
}

// Match the Android status bar to the theme. Style.Dark = light icons.
export function setBars(color, dark) {
  if (!isNative) return;
  StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
  if (color) StatusBar.setBackgroundColor({ color }).catch(() => {});
}

export function minimize() {
  if (isNative) App.minimizeApp().catch(() => {});
}
