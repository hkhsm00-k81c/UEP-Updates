Publish requested: UEP 0.81.03 homeroom school connection recovery
Requested at: 2026-08-21 KST
Priority: restore homeroom teacher data connection before other UI work.
Connection: use an already provisioned school service-account recovery on the same Windows user/PC; search stable and legacy UEP APPDATA roots.
OAuth: no per-teacher Google approval, account-link button, token exchange, or refresh-token dependency.
Security: do not embed or commit a private key. Same-PC AES-GCM recovery only; persist recovered account with Windows safeStorage.
Login: preserve name+email identity and role/class mapping.
Preserve: 0.81.02 SDGs and local-only NEIS recordbook validator, 06_선택과목이력, meal duty, dorm outing, approval line, privacy masking, dashboard, and all completed features.
Build script: scripts/build-update-0.81.03.ps1
Visible version: v0.81.03
