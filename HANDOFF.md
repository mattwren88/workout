# 5×5 Lifting Tracker: handoff brief

A personal barbell tracker designed and prototyped on a Claude Design canvas. `reference/Main.dc.html` is the working prototype. It's a Design Component file, so it needs that canvas runtime (`support.js`) to run. Treat it as the source of truth for **look, copy and logic**, not as code to ship. The `<x-dc>` markup holds the layout and inline styles; the `class Component` script holds all the state and logic in plain JS.

## Goal for this repo
Rebuild it as a standalone, installable mobile web app (PWA) for personal use:
- Plain HTML/CSS/JS, PostCSS and esbuild (no framework needed)
- Works offline; saves to IndexedDB or localStorage; keeps the JSON backup/restore format
- Optional later: sync across devices

## Design (Option D, "Color ledger")
- Paper ground `#F3EEE2`, ink `#1D1B17`, muted text `#5A554B`, rules `#CDC3AE`, dashed `#8C8576`, inset panel `#E9E2D2`
- Missed-set red `#E0401C` border / `#B32A0E` text; "rest done" blue `#1E44D6`
- Lift colours (stripe on the left of each row): squat `#FF5A36`, bench `#2D5BFF`, row `#F2B800`, OHP `#1FA57A`, deadlift `#9B6BFF`. Accessories `#B8AE98`, kettlebell `#5A554B`
- Type: Bricolage Grotesque 800 for headings and weights; Space Mono for everything else
- Square set buttons (6px radius): dashed = not done, ink fill = all reps, white with red border = missed reps
- 2px ink rules under headers; 1px rules between lifts. Tabs: LOG / HISTORY / SETUP
- Touch targets ≥ 44px

## What's built (all in the prototype)
- **Programs:** StrongLifts 5×5 (A: squat/bench/row, B: squat/OHP/deadlift 1×5) and Lite 2×5 (every lift 2×5)
- **Set logging:** tap = target reps, each further tap counts down to 0, then clears
- **Progression:** all reps hit → + per-lift increment (default 5 lb / 2.5 kg, deadlift 10 / 5). Miss → repeat. 3 misses in a row → −10% deload
- **Lower-volume ladder:** after 2 deloads on a lift, offer 5×5 → 3×5 → 3×3 (deadlift 1×5 → 1×3). Can also be set by hand
- **Ease back in after time off:** last session ≥ 14 days ago → offer −10%; ≥ 28 days → −20%; ≥ 56 days → −30% (my own rule of thumb, not official StrongLifts guidance)
- **Warm-ups:** empty bar 2×5 (squat/bench/OHP only), then 40% ×5, 60% ×3, 80% ×2, rounded to 5 lb / 2.5 kg; plates per side worked out from the bar weight
- **Settings:** units (lb/kg, converts and rounds), bar weight (45/35/33 lb or 20/15/10 kg), rest target after a full set (1:30/2:00/3:00), per-lift increment
- **Rest timer:** after a full set it counts to your rest target; after a missed set, to 5:00. Vibrates when time is up
- **Session timer, this-week strip, last-session line on each lift**
- **Accessories:** a library of 11 lifts, each assigned to Day A, B or both; manual weight
- **Kettlebell off day:** halos 2×5, goblet squat 3×5, two-hand swing 10×10, get-ups 5 rounds of 1 per side
- **History:** small progress chart per lift (last 12 sessions), session length, delete a session
- **Backup/restore:** JSON with `v: 3`

## Next: programs to add
1. **Madcow 5×5** (intermediate, weekly progression)
   - Mon: squat, bench, row, each 5 sets of 5 building up in ~12.5% jumps to a top set
   - Wed: squat 4×5 building up but stopping at Monday's 3rd set, then OHP and deadlift building up to a top set
   - Fri: squat, bench, row building up to a top set of 3 at ~2.5% over Monday's top, then 1×8 back-off at Monday's 3rd-set weight
   - Top sets go up ~2.5% a week
2. **Texas Method**
   - Mon (volume): 5×5 at ~90% of Friday's 5-rep weight
   - Wed (recovery): 2×5 at ~80% of Monday's weight, plus light press
   - Fri (intensity): 1×5 at a new best, normally +5 lb a week; alternate bench and OHP across weeks
3. Check the exact percentages and ramps against a reliable source before building. These are from memory.

## Open questions
- Should Madcow and Texas share the history and charts with StrongLifts, or start a new block?
- How to switch programs mid-cycle (carry over working weights or estimate from recent best sets?)
- Plate inventory and microplates for exact plate maths
