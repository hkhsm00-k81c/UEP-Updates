# UEP 0.81.17 JS Cleanup Classification Gate

This branch is audit-only. Production runtime files are not modified.

## Baseline
- function definitions: 1256
- duplicate function names: 27
- potential-unused candidates: 67
- render/data hotspots: 44
- event listeners: 239
- DOM writes: 155
- MutationObserver creations: 9

## Classification order
1. Duplicate names: distinguish harmless local callback names from true duplicate feature definitions.
2. Potential-unused: cross-check dynamic invocation, window/global exports, inline HTML handlers, IPC/API entry points, and generated markup references.
3. Render hotspots: prioritize repeated binding, repeated full DOM rebuilds, and repeated data reads.
4. Assign one of: KEEP_REQUIRED / CONSOLIDATE_CANDIDATE / SAFE_DELETE_CANDIDATE / PERFORMANCE_CANDIDATE / NEEDS_RUNTIME_TRACE.

## Priority duplicate review
Feature-level duplicates first:
- applyFix
- findPopupRoot
- sdgsDashboard
- uepStudentApplicationDetail
- uepStudentApplicationView
- uepSubjectApplicationView
- updateStudents
- normalizeSelectionTerm
- neisDateToLocalDate
- expectedSchoolPeriods

Generic local callback names such as close/add/run/find/match/render are not deletion candidates merely because their names repeat.

## Priority unused review
Treat all 67 as candidates only. High-risk feature entry points requiring dynamic/global checks include:
- bindSelectionAnalysis
- openMealDutyDrawer
- openProgramAttendanceQr
- openStudentCounselEdit
- openStudentHubOverlay
- openStudentTimetableDrawer
- retryGoogleConnection
- sendProgramEmailNotice
- prepareProgramSmsNotice
- uepCompareSelectionHistory
- uepSchoolGrowthGapSummary

## Performance priority
Start with bindPage and bindInputCenter for repeated listener/binding behavior, then inspect the highest-scoring render/data functions. Do not optimize normalizeAdmissionMatchText or escapeHtml solely from static score; their high score may reflect broad textual content rather than runtime cost.

## Safety gate
No production deletion or consolidation until each candidate has call/reference evidence and the resulting candidate build passes syntax, critical-screen anchors, and smoke verification.
