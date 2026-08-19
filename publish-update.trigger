Publish requested: UEP 0.80.80 connection architecture stabilization - retry 2
Requested at: 2026-08-19 KST
Fix: 0.80.80 patch no longer assumes one exact startup Google/setup gate layout. It patches the gate when present and safely applies the non-blocking architecture marker when 0.80.79 source already differs.
Base: v0.80.77 + bundled 0.80.78 + 0.80.79 + 0.80.80 patches
Google: inherit 0.80.78 OAuth token behavior; do not force Google as an app-start gate.
Architecture: completed setup wizard must not reopen only because Google is disconnected; last successful cache remains usable; Google is a sync-layer warning/reconnect action.
Features inherited: SDGs/student growth story profile and teacher guidance; selection-course studentID-first matching and pre-consultation vs Liro main-application comparison.
Visible version: v0.80.80
