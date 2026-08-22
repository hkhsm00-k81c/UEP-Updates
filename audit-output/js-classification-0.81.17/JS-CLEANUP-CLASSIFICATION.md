# UEP 0.81.17 JS Cleanup Classification

> Audit/classification only. No production runtime source is modified. SAFE_DELETE_CANDIDATE still requires candidate-build smoke verification before deletion.

## Classification totals

- duplicate KEEP_REQUIRED: 14
- duplicate CONSOLIDATE_CANDIDATE: 11
- duplicate NEEDS_RUNTIME_TRACE: 2
- unused KEEP_REQUIRED: 0
- unused SAFE_DELETE_CANDIDATE: 38
- unused NEEDS_RUNTIME_TRACE: 29
- performance candidates: 10

## Duplicate consolidation candidates

- **enhance** — gyomuon.js:1151873 | gyomuon.js:1164148
- **expectedSchoolPeriods** — gyomuon.js:650707 | main.cjs:106487
- **findPopupRoot** — gyomuon.js:1140195 | gyomuon.js:1143101
- **neisDateToLocalDate** — gyomuon.js:650423 | main.cjs:106184
- **normalizeSelectionTerm** — google-data.cjs:104672 | google-data.cjs:51207
- **sdgsDashboard** — gyomuon.js:532165 | gyomuon.js:1156178
- **slotRange** — gyomuon.js:168588 | google-data.cjs:39199
- **uepStudentApplicationDetail** — gyomuon.js:1183931 | gyomuon.js:1194784
- **uepStudentApplicationView** — gyomuon.js:1185645 | gyomuon.js:1196187
- **uepSubjectApplicationView** — gyomuon.js:1188916 | gyomuon.js:1199513
- **updateStudents** — gyomuon.js:957281 | gyomuon.js:958416

## Static safe-delete candidates

- **accessControlInlineMarkup** — gyomuon.js:380910
- **admissionCutLimit** — gyomuon.js:444317
- **admissionPairCompatible** — gyomuon.js:869099
- **autoInferCareerDatesForClass** — gyomuon.js:504204
- **calendarTitleFromRow** — google-data.cjs:91287
- **canRevealStudentSensitiveInfo** — gyomuon.js:795323
- **completionStatusMarkup** — gyomuon.js:759760
- **copyProgramFamilyLetter** — gyomuon.js:1027790
- **copyProgramIndividualNotices** — gyomuon.js:1026778
- **copyProgramRiroNotice** — gyomuon.js:1026517
- **counselRecordLabel** — gyomuon.js:463781
- **currentUserOvertimeTasks** — gyomuon.js:686782
- **dateDistanceDays** — gyomuon.js:506050
- **dateFromYmd** — main.cjs:102691
- **emptyModule** — gyomuon.js:332644
- **extractRecordCore** — gyomuon.js:517646
- **fixedTeacherTimetableReference** — gyomuon.js:659986
- **formatTaskCompletedAt** — gyomuon.js:650913
- **genericRows** — gyomuon.js:190494
- **getReadonlySheetsAuth** — main.cjs:27012
- **homeroomWeekMarkup** — gyomuon.js:674462
- **internalNineGradeReferenceMap** — gyomuon.js:422272
- **issueReportButtonMarkup** — gyomuon.js:365295
- **nightMatrixStatus** — gyomuon.js:172992
- **normalizeRecordEnding** — gyomuon.js:518221
- **outputProgramCardMarkup** — gyomuon.js:289395
- **parseSchoolCalendarMatrix** — main.cjs:11467
- **safeWidget** — gyomuon.js:678588
- **sdgsEvidenceForGoal** — gyomuon.js:528534
- **sheetNameFromRange** — main.cjs:36554
- **signalRowsForStudent** — gyomuon.js:795470
- **sortUniversitiesByPriority** — gyomuon.js:864952
- **stripProgramDatesFromRecordText** — gyomuon.js:548764
- **subjectsOutputPanel** — gyomuon.js:295942
- **subjectsView** — gyomuon.js:217567
- **tasksMarkup** — gyomuon.js:80610
- **todayProgramsMarkup** — gyomuon.js:792370
- **workItemReadByCurrentUser** — gyomuon.js:746388

## Performance candidates

- **normalizeAdmissionMatchText** (gyomuon.js) score 888: observer/timer pressure warrants lifecycle review
- **escapeHtml** (gyomuon.js) score 679: repeated DOM rebuild/read pattern warrants render caching/diff review
- **inputCenterExportCsv** (gyomuon.js) score 444: observer/timer pressure warrants lifecycle review
- **recordProgramMatchName** (gyomuon.js) score 417: repeated DOM rebuild/read pattern warrants render caching/diff review
- **bindPage** (gyomuon.js) score 352: binding function registers many listeners; inspect repeated invocation/idempotence
- **bindInputCenter** (gyomuon.js) score 77: binding function registers many listeners; inspect repeated invocation/idempotence
- **openStudentDrawer** (gyomuon.js) score 66: repeated DOM rebuild/read pattern warrants render caching/diff review
- **refineGrowthProfile** (gyomuon.js) score 37: repeated DOM rebuild/read pattern warrants render caching/diff review
- **bindSelectionAnalysis** (gyomuon.js) score 24: binding function registers many listeners; inspect repeated invocation/idempotence
- **load** (gyomuon.js) score 12: observer/timer pressure warrants lifecycle review

## Next gate

1. Compare duplicate candidate bodies and call sites before consolidation.
2. Build a non-deploy cleanup candidate containing only static safe-delete candidates.
3. Run syntax + critical-screen anchors + smoke checks.
4. Trace bindPage/bindInputCenter invocation frequency before any event-binding rewrite.