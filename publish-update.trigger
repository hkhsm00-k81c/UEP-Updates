Publish requested: UEP 0.80.88 growth profile visual refinement - syntax-fixed retry
Requested at: 2026-08-20 KST
Base: v0.80.87 stable renderer recovery
Retry reason: first #41 build injected raw CSS as JavaScript text and node --check correctly stopped publication at gyomuon.js line 11805. Fixed by JSON-encoding the CSS string before injection and making syntax-check failure explicit.
Scope: UI-only refinement. Preserve launcher, automatic update, dashboard recovery, Google/NEIS/shared-sheet startup paths.
Fix 1: compress and visually unify the growth-profile introduction, core student story and lens explanation.
Fix 2: reduce oversized intermediate cards into compact summary metrics beneath the story.
Fix 3: SDGs evidence hierarchy - confirmed prominent, possible secondary, no-evidence quiet; compact evidence detail cards.
Data logic: unchanged.
Next session: verify homeroom-teacher launcher/install/Google connection first.
Visible version: v0.80.88
