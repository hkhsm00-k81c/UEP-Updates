Publish requested: UEP 0.80.92 homeroom Google OAuth client migration recovery
Requested at: 2026-08-20 KST
Base: v0.80.91 stable release
Observed: homeroom teacher PCs can retain google-user-oauth credentials created with an older OAuth client_id, causing repeated Google connection failures even after application code is updated.
Fix: current uep-policy Desktop OAuth client_id is authoritative. If a stored OAuth token belongs to a different client_id, delete the stale user OAuth credential and request one clean Google approval. Never prefer saved client_id over current policy.
Preserve: 0.80.91 PKCE secretless/read-only Sheets OAuth; 0.80.90 selection/SDGs/privacy; launcher, updater and dashboard recovery.
Visible version: v0.80.92
