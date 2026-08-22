# UEP CSS CLEANUP PHASE 3 — STRUCTURAL SAFETY

## Remaining duplicate selector groups
- .input-method-row: rules=3, earlierOnly=border-bottom|padding|overflow-x, conflicts=1, MANUAL_VISUAL_REVIEW
- .input-method-row>b: rules=3, earlierOnly=font-size|color|white-space, conflicts=3, MANUAL_VISUAL_REVIEW
- .input-center-compact-setup: rules=5, earlierOnly=margin-top|display|grid-template-columns|gap|align-items|width, conflicts=4, MANUAL_VISUAL_REVIEW
- .input-center-compact-setup label: rules=3, earlierOnly=font-size|font-weight|color|display|gap, conflicts=5, MANUAL_VISUAL_REVIEW
- .input-center-compact-setup label.grow: rules=4, earlierOnly=flex-basis|flex, conflicts=0, SAFE_MOVE_TO_FINAL
- .communication-grid: rules=2, earlierOnly=display|gap, conflicts=1, MANUAL_VISUAL_REVIEW
- .dashboard-report-program-row: rules=3, earlierOnly=gap|display|align-items|column-gap|min-height|width|box-sizing, conflicts=4, MANUAL_VISUAL_REVIEW
- .dashboard-report-student-detail .history-summary: rules=2, earlierOnly=display|gap|width|box-sizing, conflicts=4, MANUAL_VISUAL_REVIEW
- .dashboard-report-program-row>.btn.compact: rules=2, earlierOnly=min-width|box-sizing|text-align, conflicts=0, SAFE_MOVE_TO_FINAL
- .growth-axis-grid: rules=2, earlierOnly=display|gap, conflicts=2, MANUAL_VISUAL_REVIEW
- .growth-sdg-grid: rules=2, earlierOnly=display|gap|margin-top, conflicts=3, MANUAL_VISUAL_REVIEW
- .growth-sdg-detail article: rules=2, earlierOnly=display|flex-direction|gap|margin|border-radius|background, conflicts=5, MANUAL_VISUAL_REVIEW
- .dorm-outing-editor-grid: rules=2, earlierOnly=display|gap, conflicts=0, SAFE_MOVE_TO_FINAL
- .dorm-outing-editor-grid .wide: rules=2, earlierOnly=-, conflicts=0, SAFE_COLLAPSE
- .neis-record-validator>header: rules=2, earlierOnly=display|justify-content|align-items|gap, conflicts=3, MANUAL_VISUAL_REVIEW
- .neis-summary: rules=2, earlierOnly=display|gap, conflicts=2, MANUAL_VISUAL_REVIEW
- .neis-summary em: rules=2, earlierOnly=align-self|font-style|color|font-size, conflicts=2, MANUAL_VISUAL_REVIEW
- .selection-hero: rules=2, earlierOnly=display|justify-content|gap|padding|border-radius|background, conflicts=6, MANUAL_VISUAL_REVIEW
- .selection-section>header: rules=2, earlierOnly=display|justify-content|gap, conflicts=3, MANUAL_VISUAL_REVIEW
- .selection-section select: rules=2, earlierOnly=padding|border|border-radius, conflicts=3, MANUAL_VISUAL_REVIEW
- .selection-roster-head,.selection-roster article: rules=2, earlierOnly=display|gap|align-items|padding, conflicts=4, MANUAL_VISUAL_REVIEW
- .curriculum-filter-bar .record-class-cards: rules=3, earlierOnly=flex|order|display|gap, conflicts=4, MANUAL_VISUAL_REVIEW
- .term-picker-cards: rules=2, earlierOnly=display|gap|margin, conflicts=3, MANUAL_VISUAL_REVIEW
- .subject-card-grid: rules=2, earlierOnly=display|gap, conflicts=2, MANUAL_VISUAL_REVIEW
- .neis-decision-actions: rules=2, earlierOnly=gap|margin-top, conflicts=0, SAFE_MOVE_TO_FINAL
- .curriculum-term-grid-four: rules=3, earlierOnly=display|gap|align-items, conflicts=3, MANUAL_VISUAL_REVIEW
- .roster-six-columns .selection-roster-head,.roster-six-columns article: rules=2, earlierOnly=display|align-items|gap, conflicts=2, MANUAL_VISUAL_REVIEW
- .neis-rule-list article: rules=2, earlierOnly=display|gap, conflicts=2, MANUAL_VISUAL_REVIEW

## Unused selector trace
- .input-title-field: literal=0, classList=0, template=0, query=0, STRONG_UNUSED_CANDIDATE
- .growth-guide-details: literal=0, classList=0, template=0, query=0, STRONG_UNUSED_CANDIDATE
- .growth-sdg-legend: literal=0, classList=0, template=0, query=0, STRONG_UNUSED_CANDIDATE
- .selection-hero: literal=0, classList=0, template=0, query=0, STRONG_UNUSED_CANDIDATE
- .selection-subject-summary: literal=0, classList=0, template=0, query=0, STRONG_UNUSED_CANDIDATE
- .selection-kpi-grid: literal=0, classList=0, template=0, query=0, STRONG_UNUSED_CANDIDATE
- .selection-section: literal=0, classList=0, template=0, query=0, STRONG_UNUSED_CANDIDATE
- .selection-error-group: literal=0, classList=0, template=0, query=0, STRONG_UNUSED_CANDIDATE
- .selection-message-list: literal=0, classList=0, template=0, query=0, STRONG_UNUSED_CANDIDATE
- .sdgs-page: literal=0, classList=0, template=0, query=0, STRONG_UNUSED_CANDIDATE

## Rule
- SAFE_MOVE_TO_FINAL means no intervening rule declares an earlier-only property; it is a conservative candidate for structural collapse.
- MANUAL_VISUAL_REVIEW is not auto-modified.
- STRONG_UNUSED_CANDIDATE is still not deleted automatically; dynamic DOM generation outside literal scans may exist.