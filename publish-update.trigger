Publish requested: UEP 0.80.91 Desktop OAuth secretless fix - retry
Requested at: 2026-08-20 KST retry after parser correction
Base: v0.80.90 stable release
Observed on homeroom teacher PC: Google token exchange failed 401 invalid_client - provided client secret is invalid.
Root cause: legacy 0.80.78 patch embedded a client_secret from a different OAuth client while current policy uses a different Desktop OAuth client_id.
Fix: remove legacy client_secret parameters/setters/constants from Desktop OAuth authorization-code and refresh-token exchange; retain current policy client_id, loopback redirect and spreadsheets.readonly scope.
Build-script correction: PowerShell regex literals rewritten with parser-safe single-quoted strings.
Preserve: launcher, automatic updater, dashboard recovery, 0.80.90 selection/SDGs/privacy improvements.
Visible version: v0.80.91
