Publish requested: UEP 0.80.87 renderer bridge recovery
Requested at: 2026-08-20 KST
Base: v0.80.86
Evidence: automatic update succeeds and v0.80.86 static shell is active, but pageContent remains empty. Runtime inspection confirmed gyomuon.js is loaded as type=module while index.html recovery watchdog tries to call module-scoped navigate(), so the independent recovery layer cannot reach the renderer.
Fix: load gyomuon.js as deferred classic script, explicitly bridge navigate/render/load to window, replace module-blind watchdog with renderer-aware retries, and keep Google/NEIS/shared-sheet work behind UI startup.
Inherited: all 0.80.86 and earlier features including Launcher V2, selection validation/history, 3rd-grade auto-expansion, evidence-based SDGs/UNESCO/university-talent profile, program planning-center linkage.
Visible version: v0.80.87
