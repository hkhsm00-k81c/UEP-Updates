# UEP CODEBASE AUDIT — FOURTH PASS SAFE CLASSIFICATION

- dead candidates reviewed: 59
- SAFE_DELETE_AFTER_SMOKE: 59
- KEEP_OR_MANUAL_REVIEW: 0
- shadowed declaration groups: 6

## Shadowed declarations
- applyFix: #1 line 12091 hash 4845405b7bf8 chars 2042 last=False | #2 line 12169 hash 479f51b94762 chars 2357 last=True
- findPopupRoot: #1 line 12073 hash 9f7a7cc420d0 chars 2739 last=False | #2 line 12146 hash 932a40d3aa78 chars 3196 last=True
- sdgsDashboard: #1 line 5730 hash fb638d52b797 chars 6017 last=False | #2 line 12404 hash 4ec5af72f559 chars 7653 last=True
- uepStudentApplicationDetail: #1 line 12535 hash 136b2cd1e01c chars 8919 last=False | #2 line 12575 hash c6b8324f8323 chars 9777 last=True
- uepStudentApplicationView: #1 line 12536 hash 266e6cd0c681 chars 7205 last=False | #2 line 12576 hash f03c660eb5bc chars 8374 last=True
- uepSubjectApplicationView: #1 line 12537 hash e503bdc55fba chars 3934 last=False | #2 line 12578 hash 2dc52cd03d10 chars 5048 last=True

## SAFE_DELETE_AFTER_SMOKE
- tasksMarkup @ 1289 runtimeRefs=1 historyRefs=0
- dormProgramIsHolisticTarget @ 1902 runtimeRefs=1 historyRefs=0
- nightMatrixStatus @ 2242 runtimeRefs=1 historyRefs=0
- subjectsView @ 2587 runtimeRefs=1 historyRefs=0
- schoolScheduleTimetableMarkup @ 2591 runtimeRefs=1 historyRefs=0
- inputCenterApplyStudentNo @ 2899 runtimeRefs=1 historyRefs=0
- inputCenterSuggestTarget @ 2957 runtimeRefs=1 historyRefs=0
- outputProgramCardMarkup @ 3149 runtimeRefs=1 historyRefs=0
- subjectsOutputPanel @ 3180 runtimeRefs=1 historyRefs=0
- studentReportsOutputPanel @ 3220 runtimeRefs=1 historyRefs=0
- emptyModule @ 3459 runtimeRefs=1 historyRefs=0
- issueReportButtonMarkup @ 3901 runtimeRefs=1 historyRefs=0
- accessControlInlineMarkup @ 4008 runtimeRefs=1 historyRefs=0
- internalNineGradeReferenceMap @ 4346 runtimeRefs=1 historyRefs=0
- admissionCutLimit @ 4626 runtimeRefs=1 historyRefs=0
- counselRecordLabel @ 4780 runtimeRefs=1 historyRefs=0
- recordAreaPanel @ 5125 runtimeRefs=1 historyRefs=0
- autoInferCareerDatesForClass @ 5292 runtimeRefs=1 historyRefs=0
- dateDistanceDays @ 5335 runtimeRefs=1 historyRefs=0
- careerDateEditor @ 5428 runtimeRefs=1 historyRefs=0
- extractRecordCore @ 5524 runtimeRefs=1 historyRefs=0
- normalizeRecordEnding @ 5534 runtimeRefs=1 historyRefs=0
- recordEvidenceSignals @ 5540 runtimeRefs=1 historyRefs=0
- sdgsEvidenceForGoal @ 5697 runtimeRefs=1 historyRefs=0
- stripProgramDatesFromRecordText @ 5923 runtimeRefs=1 historyRefs=0
- programTopTabs @ 6177 runtimeRefs=1 historyRefs=0
- formatTaskCompletedAt @ 6860 runtimeRefs=1 historyRefs=0
- fixedTeacherTimetableReference @ 6958 runtimeRefs=1 historyRefs=0
- homeroomWeekMarkup @ 7114 runtimeRefs=1 historyRefs=0
- safeWidget @ 7168 runtimeRefs=1 historyRefs=0
- dashboardTodayLessonsMarkup @ 7173 runtimeRefs=1 historyRefs=0
- dashboardSelectedDayMarkup @ 7201 runtimeRefs=1 historyRefs=0
- currentUserOvertimeTasks @ 7222 runtimeRefs=1 historyRefs=0
- dashboardCompactTasksMarkup @ 7252 runtimeRefs=1 historyRefs=0
- dashboardCompactNoticesMarkup @ 7274 runtimeRefs=1 historyRefs=0
- dashboardStudentStatusMarkup @ 7799 runtimeRefs=1 historyRefs=0
- workItemReadByCurrentUser @ 7955 runtimeRefs=1 historyRefs=0
- dashboardTopAlertsMarkup @ 8013 runtimeRefs=1 historyRefs=0
- completionStatusMarkup @ 8066 runtimeRefs=1 historyRefs=0
- openStudentCounselEdit @ 8261 runtimeRefs=1 historyRefs=0
- todayProgramsMarkup @ 8394 runtimeRefs=1 historyRefs=0
- canRevealStudentSensitiveInfo @ 8434 runtimeRefs=1 historyRefs=0
- signalRowsForStudent @ 8440 runtimeRefs=1 historyRefs=0
- openMealDutyDrawer @ 8453 runtimeRefs=1 historyRefs=0
- retryGoogleConnection @ 9109 runtimeRefs=1 historyRefs=0
- openStudentTimetableDrawer @ 9205 runtimeRefs=1 historyRefs=0
- studentActivityOverview @ 9217 runtimeRefs=1 historyRefs=0
- sortUniversitiesByPriority @ 9355 runtimeRefs=1 historyRefs=0
- admissionPairCompatible @ 9425 runtimeRefs=1 historyRefs=0
- studentStatsRankCard @ 9555 runtimeRefs=1 historyRefs=0
- sendProgramEmailNotice @ 10964 runtimeRefs=1 historyRefs=0
- prepareProgramSmsNotice @ 10972 runtimeRefs=1 historyRefs=0
- openProgramAttendanceQr @ 10977 runtimeRefs=1 historyRefs=0
- copyProgramRiroNotice @ 11022 runtimeRefs=1 historyRefs=0
- copyProgramIndividualNotices @ 11026 runtimeRefs=1 historyRefs=0
- copyProgramFamilyLetter @ 11037 runtimeRefs=1 historyRefs=0
- uepCompareSelectionHistory @ 12356 runtimeRefs=1 historyRefs=2
- uepSchoolGrowthGapSummary @ 12448 runtimeRefs=1 historyRefs=1
- bindSelectionAnalysis @ 12593 runtimeRefs=1 historyRefs=11

## KEEP_OR_MANUAL_REVIEW

## Rule
- Audit tools and workflows are excluded from liveness classification to prevent self-contamination.
- Historical scripts/patches are tracked as historyRefs only and do not keep a runtime function alive.
- No production deletion in this pass.
- SAFE_DELETE_AFTER_SMOKE still requires route/function smoke verification before removal.
