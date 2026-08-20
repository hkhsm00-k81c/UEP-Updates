Publish requested: UEP 0.80.94 source-level implementation fixes
Retry requested at: 2026-08-20 13:29 KST
Base: v0.80.92 stable release.
Build-script repair: replace literal PowerShell backtick-n injection with real platform newlines in gyomuon/main/preload source insertion. This fixes the gyomuon.js SyntaxError Unexpected identifier 'html' seen in the failed Actions run.
Selection: merge normalized/fallback/legacy 06_선택과목이력 so newly added 3rd-year final applications appear automatically. Pre-application is error history only. Current main application gets mixed humanities/science, science hierarchy, and cross-semester duplicate validation.
Quick open: full multi-line lunch/dinner menu; compact approval-line explorer.
Privacy: internal grade statistics mask only student number/name; rank, subject counts, totals, 5-grade average, 9-grade reference and achievement remain visible.
Dorm outing: add teacher-entry form from quick-open and save to 02_학사외출_일자별 with source 교사등록.
Preserve: v0.80.92 OAuth recovery, launcher/updater/dashboard recovery and growth-profile/SDGs features already present in 0.80.92.
Visible version: v0.80.94
