Publish requested: UEP 0.80.86 dashboard boot recovery
Requested at: 2026-08-20 KST
Base: v0.80.85
Evidence: 0.80.85 reaches the app shell and correct version, but pageContent remains empty. render() itself has an error-card fallback, so blank content means startup stops before normal navigate/render completion.
Fix: isolate normalizeSavedState and remembered-user restoration, cap remembered restore at 1.2s, force dashboard render after header bootstrap if content is empty, and add gyomuon-level repeated hard recovery. Keep Google/NEIS/shared-sheet non-blocking.
Inherited: all 0.80.85 and earlier features including Launcher V2 compatibility, selection validation/history, 3rd-grade auto-expansion, evidence-based SDGs/UNESCO/university-talent profile, program planning-center linkage.
Visible version: v0.80.86
