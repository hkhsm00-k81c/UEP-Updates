Publish requested: UEP 0.80.84 startup state-load recovery
Requested at: 2026-08-20 KST
Base: v0.80.83
Root cause found in real 0.80.83 package: index.html ships with static userAuthGate showing 자동 로그인 중, and gyomuon.js awaited window.schoolBoard.loadState() without a timeout before the gate could be released.
Fix: wrap loadState in 1.8s startup timeout; continue boot on IPC delay/failure; shorten remembered-user transition; add independent static HTML boot fail-safe so the splash can never remain forever.
Inherited: all 0.80.83/0.80.82 features including local-first login, selection validation/history, 3rd-grade auto-expansion, evidence-based SDGs/UNESCO/university-talent profile, program planning-center linkage.
Visible version: v0.80.84
