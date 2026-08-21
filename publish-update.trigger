Publish requested: UEP 0.81.00 ZIP-era connection model + login identity
Requested at: 2026-08-21 KST
Core: restore the old ZIP-era behavior where the school/service connection supplies Google Sheet data immediately. UEP login adds only teacher name+email identity and homeroom/role permission mapping.
REMOVE from normal runtime: per-PC Google approval, per-teacher Google OAuth, browser authorization, token exchange, refresh-token requirement.
google:credentialStatus => autoConnected/login_identity when service credentials are not local; approvalRequired=false; tokenExchangeRequired=false.
google:authorizeUser => legacy entry point bypassed; returns success/skipped without browser or token exchange.
Preserve: SDGs evidence rendering, 06_선택과목이력 direct connection, meal, privacy, dorm outing, approval line, dashboard and completed features.
Build script: scripts/build-update-0.81.00.ps1
Visible version: v0.81.00
