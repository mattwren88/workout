# 5×5

A personal barbell tracker (StrongLifts 5×5 and Lite 2×5) packaged as an Android app.
Plain JS + SCSS, built with esbuild and PostCSS, wrapped with Capacitor. Fully offline; data stays on the phone.

`reference/Main.dc.html` is the Claude Design prototype this was ported from, and `HANDOFF.md` is the design brief.

## Get the APK
Every push builds an APK on GitHub Actions (**Actions → Android APK → run → Artifacts**).
Pushes to `main` also update **Releases → Latest build**, so the newest APK is always at the same link.

On the phone, open the `.apk`, allow "install unknown apps" for your browser or Files app once, then install.

**Signing:** add the repo secrets `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS` and `KEY_PASSWORD`
(Settings → Secrets and variables → Actions). With them, each new APK installs over the old one and keeps your data.
Without them, builds use a throwaway debug key and you'd have to uninstall first, which erases the log.
Keep the keystore safe: losing it means the next build can't update the installed app.

## Develop
```sh
npm install
npm run dev       # rebuilds www/ on save, serves it with live reload
npm test          # training logic tests
npm run lint
npm run preview   # preview/index.html: one self-contained file to open in any browser
npm run android   # build www/ and copy it into the Android project
npm run apk       # needs a local Android SDK
```

`src/js/model.js` holds all the program logic (no DOM), `view.js` renders it, `native.js` wraps the
Capacitor plugins (rest-timer notifications, haptics, keep-awake, share/backup) with browser fallbacks.

## Backup
Setup → Backup saves a v3 JSON file through the Android share sheet (Drive, email, Files).
Restore by opening the file or pasting the text. Backups from the prototype restore too.
