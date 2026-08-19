Publish requested: UEP 0.80.84 startup state-load recovery
Requested at: 2026-08-20 KST retry 2
Base: v0.80.83
Root cause: static index.html userAuthGate can remain because startup awaits window.schoolBoard.loadState before the gate release path.
Fix: source-tolerant regex patch wraps the actual await window.schoolBoard.loadState() expression in a 1.8s timeout instead of matching exact whitespace; add independent static HTML boot fail-safe and shorten remembered-user transition.
Inherited: all 0.80.83/0.80.82 features including local-first login, selection validation/history, 3rd-grade auto-expansion, evidence-based SDGs/UNESCO/university-talent profile, program planning-center linkage.
Visible version: v0.80.84
