Publish requested: UEP 0.80.85 render-first startup recovery
Requested at: 2026-08-20 KST
Base: v0.80.84
Evidence: package inspection confirmed package.json and gyomuon APP_VERSION are 0.80.84, but static index.html still contains v0.78.6 and the old 2026-07-20 date; blank page can survive after auth gate release.
Fix: remove legacy static identity, make initial navigate resilient with dashboard fallback, unlock auth gate independently, and add blank-content render watchdog. Google/external connection remains non-blocking.
Inherited: all 0.80.84 and earlier features including selection validation/history, 3rd-grade auto-expansion, evidence-based SDGs/UNESCO/university-talent profile, program planning-center linkage.
Visible version: v0.80.85
