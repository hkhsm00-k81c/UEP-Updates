# UEP 0.81.17 JS Cleanup Phase 1 — Low-risk delete candidates

This is still audit-only. No production runtime file is modified by this commit.

## Selection rule
Only candidates already classified SAFE_DELETE_CANDIDATE and with no static identifier call beyond their own definition, no window/global reference, no inline HTML handler, no string reference, no export reference, and no IPC reference are eligible.

## Phase 1 conservative subset
The first cleanup candidate should remove only low-risk helpers that are neither obvious UI entry points nor major feature renderers:

- calendarTitleFromRow
- dateFromYmd
- emptyModule
- formatTaskCompletedAt
- getReadonlySheetsAuth
- internalNineGradeReferenceMap
- parseSchoolCalendarMatrix
- sheetNameFromRange
- sortUniversitiesByPriority
- workItemReadByCurrentUser

## Explicitly deferred despite SAFE_DELETE_CANDIDATE
The following remain deferred because their names suggest UI markup, permissions, admission logic, student/program rendering, record processing, or feature-domain behavior where runtime-only invocation is plausible:

- accessControlInlineMarkup
- admissionCutLimit
- admissionPairCompatible
- autoInferCareerDatesForClass
- canRevealStudentSensitiveInfo
- completionStatusMarkup
- copyProgramFamilyLetter
- copyProgramIndividualNotices
- copyProgramRiroNotice
- counselRecordLabel
- currentUserOvertimeTasks
- dateDistanceDays
- extractRecordCore
- fixedTeacherTimetableReference
- genericRows
- homeroomWeekMarkup
- issueReportButtonMarkup
- nightMatrixStatus
- normalizeRecordEnding
- outputProgramCardMarkup
- safeWidget
- sdgsEvidenceForGoal
- signalRowsForStudent
- stripProgramDatesFromRecordText
- subjectsOutputPanel
- subjectsView
- tasksMarkup
- todayProgramsMarkup

## Safety gate for next branch
1. Reconstruct exact 0.81.17 runtime.
2. Remove only the 10 functions above.
3. Run node --check on gyomuon.js/main.cjs/google-data.cjs.
4. Re-run critical screen/feature anchor checks.
5. Verify no removed symbol remains referenced in runtime source.
6. Produce a non-deploy candidate artifact and diff report.
7. Do not publish or merge until the candidate workflow is green.
