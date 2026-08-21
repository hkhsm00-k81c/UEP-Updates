Publish requested: UEP 0.81.00 login identity gateway + SDGs evidence rendering
Requested at: 2026-08-21 11:41 KST
Retry: fixed verification logic. The failed run showed login identity gateway=True, automatic connection marker=True, SDGs cards/list=True, selection preservation=True; only the old literal-message check reported False. Verification now checks the credentialStatus block itself and confirms that it contains no getGoogleUserSheetsToken/refresh_token dependency.
Base: shipped v0.80.97 update package, applying corrected 0.80.98/0.80.99 prerequisites.
Core change: normal homeroom runtime no longer requires per-user Google OAuth token exchange. UEP login name/email is the identity gateway for homeroom permission; existing school/service connection remains the data connection path.
Preserve: SDGs evidence cards, 06_선택과목이력 direct connection, meal, privacy, dorm outing, approval line, dashboard and other completed features.
Build script: scripts/build-update-0.81.00.ps1
Visible version: v0.81.00
