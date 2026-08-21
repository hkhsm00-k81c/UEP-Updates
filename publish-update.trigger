Publish requested: UEP 0.81.01 bounds-safe ZIP-era connection model + login identity
Requested at: 2026-08-21 KST
Fix: replace unsafe Substring verification with required-anchor and bounds checks so missing/replaced handlers fail with a clear anchor error instead of a negative length.
Base: build from the last known-good 0.80.99 prerequisite; do not invoke the failed 0.81.00 post-build verification.
Core: school/service connection supplies Google Sheet data immediately. UEP login name+email identifies teacher, homeroom, and role permissions.
REMOVE from normal runtime: per-PC Google approval, per-teacher Google OAuth, browser authorization, token exchange, refresh-token requirement.
Preserve: SDGs evidence-only cards/map, 06_선택과목이력 direct connection and validation, lunch/dinner meal duty, dorm outing, approval line, privacy masking, dashboard and completed features.
Pre-release checks: node syntax checks plus bounded feature-marker checks.
Build script: scripts/build-update-0.81.01.ps1
Visible version: v0.81.01
