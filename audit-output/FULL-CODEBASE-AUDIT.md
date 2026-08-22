# UEP FULL CODEBASE AUDIT

이 보고서는 특정 버전 통과검사가 아니라 저장소 전체 패치 이력 + 최종 실행코드를 대상으로 한 정적 전수검사입니다.

- 저장소 분석 파일: 98
- Build scripts: 53
- Patch markers: 10 / 최종 runtime 미존재: 5
- HIGH findings: 17
- MEDIUM findings: 47
- Workflows: 25 / inspect-audit-probe: 16

## Runtime metrics
- addEventListener: 239
- onclickAssignments: 345
- mutationObserver: 9
- requestAnimationFrame: 29
- queueMicrotask: 0
- setTimeout: 41
- setInterval: 6
- renderCalls: 237
- documentQueryAll: 18
- fullSectionScans: 0

## High-risk findings
- [renderer] duplicate-function-declaration — applyFix × 2: 같은 함수명이 여러 번 선언됨
- [renderer] duplicate-function-declaration — findPopupRoot × 2: 같은 함수명이 여러 번 선언됨
- [renderer] duplicate-function-declaration — sdgsDashboard × 2: 같은 함수명이 여러 번 선언됨
- [renderer] duplicate-function-declaration — uepStudentApplicationDetail × 2: 같은 함수명이 여러 번 선언됨
- [renderer] duplicate-function-declaration — uepStudentApplicationView × 2: 같은 함수명이 여러 번 선언됨
- [renderer] duplicate-function-declaration — uepSubjectApplicationView × 2: 같은 함수명이 여러 번 선언됨
- [renderer] function-override — recordsView × 1: 기존 함수 뒤에서 재대입/override 가능
- [renderer] function-override — selectionComparisonMarkup × 2: 기존 함수 뒤에서 재대입/override 가능
- [renderer] function-override — selectionComparisonsForStudent × 1: 기존 함수 뒤에서 재대입/override 가능
- [renderer] function-override — selectionErrorHistoryMarkup × 2: 기존 함수 뒤에서 재대입/override 가능
- [renderer] function-override — selectionErrorsForStudent × 1: 기존 함수 뒤에서 재대입/override 가능
- [renderer] function-override — uepSelectionDataset × 1: 기존 함수 뒤에서 재대입/override 가능
- [renderer] runtime-metric — mutationObserver × 9: 전체 실행코드 발생 횟수
- [renderer] runtime-metric — setInterval × 6: 전체 실행코드 발생 횟수
- [renderer] wrapper-chain — recordsView × 1: captured as __uepRecordsBefore08106
- [renderer] wrapper-chain — selectionErrorHistoryMarkup × 1: captured as prior
- [renderer] wrapper-chain — uepSelectionDataset × 1: captured as __uepSelectionDatasetRaw08113

## Duplicate function declarations
- uepSubjectApplicationView: 2 declarations
- sdgsDashboard: 2 declarations
- findPopupRoot: 2 declarations
- uepStudentApplicationDetail: 2 declarations
- uepStudentApplicationView: 2 declarations
- applyFix: 2 declarations

## Frequent full render targets
- records: 36
- inputs: 26
- dashboard: 21
- students: 20
- attendance: 17
- outputs: 16
- settings: 13
- programs: 12
- scores: 5
- work: 5
- admissions: 4
- dorm: 4
- timetable: 3
- calendar: 1

## Next classification rule
- SAFE_DELETE: 호출/참조 0 + 후행 대체 구현 확인
- MERGE: 동일 책임 함수가 2개 이상 존재하고 둘 다 참조됨
- REGRESSION: 과거 기능 signature가 있었으나 최종 runtime에 없음
- PERF: 반복 render/listener/timer/observer 또는 전체자료 반복계산
- KEEP: 현재 단일 구현이며 실제 route/event/data path에서 참조됨
