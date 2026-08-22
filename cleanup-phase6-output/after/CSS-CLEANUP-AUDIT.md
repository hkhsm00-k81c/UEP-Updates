# UEP CSS CLEANUP AUDIT

- CSS chars: 35884
- parsed rule blocks: 317
- duplicate selector groups: 6
- EXACT_DUPLICATE: 0
- OVERRIDE_CONFLICT: 6
- UNUSED_SELECTOR_CANDIDATE: 3

## Exact duplicates

## Override conflicts — merge manually
- .input-method-row [root] x3 lines=6|51|97
- .input-method-row>b [root] x3 lines=7|59|97
- .input-center-compact-setup label [root] x3 lines=11|24|94
- .dashboard-report-program-row [root] x2 lines=106|114
- .growth-sdg-detail article [root] x2 lines=202|211
- .curriculum-filter-bar .record-class-cards [root] x2 lines=278|282

## Unused selector candidates
- class selection-kpi-grid cssRefs=1
- class selection-hero cssRefs=1
- class selection-section cssRefs=2

## Safety
- This audit performs no CSS deletion.
- EXACT_DUPLICATE can be considered for consolidation only after visual smoke tests.
- OVERRIDE_CONFLICT must preserve final cascade behavior and media-query context.
- UNUSED_SELECTOR_CANDIDATE means no literal runtime reference was found; dynamic class construction must be checked before removal.