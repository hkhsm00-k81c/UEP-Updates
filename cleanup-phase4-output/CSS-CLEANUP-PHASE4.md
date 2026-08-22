# UEP CSS CLEANUP PHASE 4

- chars before: 38971
- chars after: 38971
- chars removed: 0

## Safe structural merges
- .input-center-compact-setup label.grow: SKIP_LT2, rules 1 -> 1, effectiveProps=0
- .dashboard-report-program-row>.btn.compact: SKIP_LT2, rules 1 -> 1, effectiveProps=0
- .dorm-outing-editor-grid: SKIP_LT2, rules 0 -> 0, effectiveProps=0
- .dorm-outing-editor-grid .wide: SKIP_LT2, rules 0 -> 0, effectiveProps=0
- .neis-decision-actions: SKIP_LT2, rules 0 -> 0, effectiveProps=0

## Safety
- Only selectors classified SAFE_MOVE_TO_FINAL or SAFE_COLLAPSE in phase3 are touched.
- Effective declaration map for every target selector is asserted identical before/after.
- No MANUAL_VISUAL_REVIEW selector is modified.