# UEP CSS CLEANUP PHASE 5 — DEEP RUNTIME TRACE

- runtime text files scanned: 15
- repository/history text files scanned: 157

## Unused selector candidates
- .input-title-field: runtimeRefs=0, historyRefs=4, componentRefs=2073, classAttr=0, selectorApi=0, classList=0, STRONG_UNUSED_RUNTIME
- .growth-guide-details: runtimeRefs=0, historyRefs=9, componentRefs=604, classAttr=0, selectorApi=0, classList=0, STRONG_UNUSED_RUNTIME
- .growth-sdg-legend: runtimeRefs=0, historyRefs=14, componentRefs=353, classAttr=0, selectorApi=0, classList=0, STRONG_UNUSED_RUNTIME
- .selection-hero: runtimeRefs=0, historyRefs=17, componentRefs=402, classAttr=0, selectorApi=0, classList=0, STRONG_UNUSED_RUNTIME
- .selection-subject-summary: runtimeRefs=0, historyRefs=9, componentRefs=1274, classAttr=0, selectorApi=0, classList=0, STRONG_UNUSED_RUNTIME
- .selection-kpi-grid: runtimeRefs=0, historyRefs=15, componentRefs=3121, classAttr=0, selectorApi=0, classList=0, STRONG_UNUSED_RUNTIME
- .selection-section: runtimeRefs=0, historyRefs=15, componentRefs=1099, classAttr=0, selectorApi=0, classList=0, STRONG_UNUSED_RUNTIME
- .selection-error-group: runtimeRefs=0, historyRefs=13, componentRefs=1585, classAttr=0, selectorApi=0, classList=0, STRONG_UNUSED_RUNTIME
- .selection-message-list: runtimeRefs=0, historyRefs=11, componentRefs=946, classAttr=0, selectorApi=0, classList=0, STRONG_UNUSED_RUNTIME
- .sdgs-page: runtimeRefs=0, historyRefs=4, componentRefs=716, classAttr=0, selectorApi=0, classList=0, STRONG_UNUSED_RUNTIME

## Remaining override selectors
- .input-method-row: rules=3, earlierOnly=border-bottom|padding|overflow-x, conflicts=1, VISUAL_REVIEW_REQUIRED
- .input-method-row>b: rules=3, earlierOnly=font-size|color|white-space, conflicts=3, VISUAL_REVIEW_REQUIRED
- .input-center-compact-setup label: rules=3, earlierOnly=font-size|font-weight|color|display|gap, conflicts=5, VISUAL_REVIEW_REQUIRED
- .dashboard-report-program-row: rules=2, earlierOnly=gap, conflicts=1, VISUAL_REVIEW_REQUIRED
- .growth-sdg-detail article: rules=2, earlierOnly=display|flex-direction|gap|margin|border-radius|background, conflicts=5, VISUAL_REVIEW_REQUIRED
- .curriculum-filter-bar .record-class-cards: rules=2, earlierOnly=flex, conflicts=1, VISUAL_REVIEW_REQUIRED

## Safety
- No CSS is deleted or modified by phase5.
- Runtime references are scanned across every text-like file under app/resources/app except gyomuon.css itself.
- Repository/history references are reported separately and do not count as runtime use.
- VISUAL_REVIEW_REQUIRED selectors are not auto-merged.