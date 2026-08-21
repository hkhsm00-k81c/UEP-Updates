Publish requested: UEP 0.81.00 login identity gateway + SDGs evidence rendering
Requested at: 2026-08-21 KST
Base: shipped v0.80.97 update package, applying corrected 0.80.98/0.80.99 prerequisites.
Core change: normal homeroom runtime no longer requires per-user Google OAuth token exchange. UEP login name/email is the identity gateway for homeroom permission; existing school/service connection remains the data connection path.
SDGs: preserve evidence-card refinement and force runtime evidence-card rendering markers.
Preserve: 06_선택과목이력 direct connection, meal, privacy, dorm outing, approval line, dashboard and other completed features.
Build script: scripts/build-update-0.81.00.ps1
Visible version: v0.81.00
