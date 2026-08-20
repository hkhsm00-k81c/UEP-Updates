Publish requested: UEP 0.80.95 Google recovery and approval fixes
Retry requested at: 2026-08-20 16:32 KST
Base: shipped v0.80.94 update package.
Parser repair: PowerShell line 14 failed because JavaScript template-literal ${...} text was stored inside a PowerShell double-quoted string. Replaced both OAuth search strings with literal here-strings so PowerShell does not parse JavaScript interpolation.
Preserve confirmed working features: quick-open lunch/dinner full menu and grade-stat privacy behavior; preserve 0.80.94 outing teacher editor/save and selection-history merge/current validation.
Google homeroom connection: clear stale user OAuth state automatically when refresh/token exchange returns invalid_client or invalid_grant, refetch policy client ID, and require one clean re-approval instead of looping on the same broken saved token.
Approval line: apply compact layout to the actual approval-explorer / approval-nav-row / approval-detail runtime structure.
Verification gate: fail build if preserved meal/privacy/outing/selection markers or repaired Google/approval markers are missing.
Visible version: v0.80.95
