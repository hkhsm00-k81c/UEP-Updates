# UEP CSS CLEANUP AUDIT

- CSS chars: 40019
- parsed rule blocks: 361
- duplicate selector groups: 14
- EXACT_DUPLICATE: 0
- OVERRIDE_CONFLICT: 14
- UNUSED_SELECTOR_CANDIDATE: 10

## Exact duplicates

## Override conflicts — merge manually
- .input-method-row [root] x3 lines=6|57|92
- .input-method-row>b [root] x3 lines=7|65|92
- .input-method-row button [root] x2 lines=8|66
- .input-method-row button.active [root] x2 lines=9|81
- .input-center-compact-setup [root] x3 lines=10|23|92
- .input-center-compact-setup label [root] x3 lines=11|30|92
- .input-center-compact-setup label.grow [root] x3 lines=12|31|92
- .dashboard-report-program-row [root] x2 lines=101|108
- .growth-sdg-detail article [root] x2 lines=189|191
- #drawer .approval-nav-row b [root] x2 lines=205|217
- #drawer .approval-nav-row span [root] x2 lines=206|218
- #drawer .approval-detail section b [root] x2 lines=209|222
- #drawer .approval-detail section p [root] x2 lines=210|223
- .curriculum-filter-bar .record-class-cards [root] x2 lines=262|266

## Unused selector candidates
- class input-title-field cssRefs=2
- class growth-guide-details cssRefs=3
- class growth-sdg-legend cssRefs=5
- class selection-hero cssRefs=7
- class selection-subject-summary cssRefs=3
- class selection-kpi-grid cssRefs=6
- class selection-section cssRefs=5
- class selection-error-group cssRefs=5
- class selection-message-list cssRefs=4
- class sdgs-page cssRefs=1

## Safety
- This audit performs no CSS deletion.
- EXACT_DUPLICATE can be considered for consolidation only after visual smoke tests.
- OVERRIDE_CONFLICT must preserve final cascade behavior and media-query context.
- UNUSED_SELECTOR_CANDIDATE means no literal runtime reference was found; dynamic class construction must be checked before removal.