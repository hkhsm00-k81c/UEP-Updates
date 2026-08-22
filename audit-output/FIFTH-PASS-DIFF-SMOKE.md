# UEP CODEBASE AUDIT — FIFTH PASS DIFF + SMOKE PLAN

- shadow/flatten diff rows: 4
- smoke candidates: 0

## Function-generation risk
- findPopupRoot SHADOW: old@12073 -> final@12146 | oldOnly=19 newOnly=12 | REVIEW
  - old-only tokens: X a aria b button buttons close closest dialog exactTitleNode getAttribute hasClose label modal popup role some t toLowerCase
- applyFix SHADOW: old@12091 -> final@12169 | oldOnly=10 newOnly=24 | REVIEW
  - old-only tokens: borderRadius borderTopWidth children clientHeight for i let parentElement rr textNodes
- selectionComparisonsForStudent FLATTEN: old@3040 -> final@11896 | oldOnly=6 newOnly=41 | REVIEW
  - old-only tokens: String id readonlyCache selectionComparisons studentId studentNo
- selectionErrorsForStudent FLATTEN: old@5955 -> final@11929 | oldOnly=11 newOnly=8 | REVIEW
  - old-only tokens: Set String allowed has id new readonlyCache selectionSubjectErrors studentId studentNo trim

## Smoke plan by page

## Decision rule
- oldOnly=0 for a shadowed declaration: earlier generation is a strong delete candidate after syntax + route smoke.
- oldOnly>0: inspect whether those old-only tokens are behavior or merely local names before removal.
- FLATTEN rows are never deleted mechanically; preserve wrapper-added behavior in one canonical implementation.
- Smoke candidates are not deleted in this pass.