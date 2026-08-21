Publish requested: UEP 0.80.99 SDGs + homeroom Google connection fix
Requested at: 2026-08-21 10:48 KST
Retry reason: previous 0.80.99 run failed only because the SDGs purpose sentence verification counted multiple wrapper variants. The prerequisite now deduplicates the literal sentence regardless of wrapper and requires exactly one visible occurrence.
Base: shipped v0.80.97 update package.
Included: corrected SDGs clickless evidence-card refinement; Google OAuth token exchange URLSearchParams explicit serialization; saved Google OAuth token validation/refresh during connection-status check so a successful first approval persists across later UEP logins without pressing Google account connect each time.
Preserve: 06_선택과목이력 direct connection, meal, privacy, dorm outing, approval line, dashboard and other completed features.
Build script: scripts/build-update-0.80.99.ps1
Visible version: v0.80.99
