# UEP CSS CLEANUP PHASE 3 — BASELINE-ALIGNED STRUCTURAL SAFETY

- baseline duplicate groups: 8
- analyzed duplicate groups: 8

## Actual post-phase2 duplicate selector groups
- .input-method-row: rules=3, earlierOnly=border-bottom|padding|overflow-x, conflicts=1, MANUAL_VISUAL_REVIEW
- .input-method-row>b: rules=3, earlierOnly=font-size|color|white-space, conflicts=3, MANUAL_VISUAL_REVIEW
- .input-center-compact-setup: rules=3, earlierOnly=grid-template-columns|width, conflicts=0, SAFE_MOVE_TO_FINAL
- .input-center-compact-setup label: rules=3, earlierOnly=font-size|font-weight|color|display|gap, conflicts=5, MANUAL_VISUAL_REVIEW
- .input-center-compact-setup label.grow: rules=2, earlierOnly=-, conflicts=0, SAFE_COLLAPSE
- .dashboard-report-program-row: rules=2, earlierOnly=gap, conflicts=1, MANUAL_VISUAL_REVIEW
- .growth-sdg-detail article: rules=2, earlierOnly=display|flex-direction|gap|margin|border-radius|background, conflicts=5, MANUAL_VISUAL_REVIEW
- .curriculum-filter-bar .record-class-cards: rules=2, earlierOnly=flex, conflicts=1, MANUAL_VISUAL_REVIEW

## Unused selector trace
- .input-title-field: literal=0, classList=0, template=0, query=0, innerHtml=0, STRONG_UNUSED_CANDIDATE
- .growth-guide-details: literal=0, classList=0, template=0, query=0, innerHtml=0, STRONG_UNUSED_CANDIDATE
- .growth-sdg-legend: literal=0, classList=0, template=0, query=0, innerHtml=0, STRONG_UNUSED_CANDIDATE
- .selection-hero: literal=0, classList=0, template=0, query=0, innerHtml=0, STRONG_UNUSED_CANDIDATE
- .selection-subject-summary: literal=0, classList=0, template=0, query=0, innerHtml=0, STRONG_UNUSED_CANDIDATE
- .selection-kpi-grid: literal=0, classList=0, template=0, query=0, innerHtml=0, STRONG_UNUSED_CANDIDATE
- .selection-section: literal=0, classList=0, template=0, query=0, innerHtml=0, STRONG_UNUSED_CANDIDATE
- .selection-error-group: literal=0, classList=0, template=0, query=0, innerHtml=0, STRONG_UNUSED_CANDIDATE
- .selection-message-list: literal=0, classList=0, template=0, query=0, innerHtml=0, STRONG_UNUSED_CANDIDATE
- .sdgs-page: literal=0, classList=0, template=0, query=0, innerHtml=0, STRONG_UNUSED_CANDIDATE

## Rule
- The only merge candidates analyzed are selectors emitted by the actual post-phase2 CSS audit.
- SAFE_MOVE_TO_FINAL / SAFE_COLLAPSE are candidates only; MANUAL_VISUAL_REVIEW is never auto-modified.
- STRONG_UNUSED_CANDIDATE is not deleted automatically.