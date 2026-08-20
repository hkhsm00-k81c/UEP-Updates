Publish requested: UEP 0.80.92 homeroom Google OAuth client migration recovery - retry
Requested at: 2026-08-20 KST
Base: v0.80.91 stable release
Retry reason: first 0.80.92 build reached the verification phase but the PowerShell regex used only for validation had an unmatched parenthesis. OAuth patch logic itself was not the failing step.
Fix: replace fragile validation regex with exact string checks; keep current policy Desktop OAuth client_id authoritative and clear stale saved OAuth credentials when client IDs differ.
Preserve: 0.80.91 PKCE secretless/read-only Sheets OAuth; 0.80.90 selection/SDGs/privacy; launcher, updater and dashboard recovery.
Visible version: v0.80.92
