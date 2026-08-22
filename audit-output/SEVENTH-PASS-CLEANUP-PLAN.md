# UEP CODEBASE AUDIT — SEVENTH PASS CLEANUP PLAN

- traced unreachable functions: 59
- STRONG_DELETE_CANDIDATE: 49
- REMOVE_AFTER_REPLACEMENT_PARITY: 10
- MANUAL_REVIEW: 0
- duplicate/override groups: 12

## Strong delete candidates
- tasksMarkup @1289 (UNREACHABLE_NO_HISTORY)
- dormProgramIsHolisticTarget @1902 (UNREACHABLE_NO_HISTORY)
- nightMatrixStatus @2242 (UNREACHABLE_NO_HISTORY)
- subjectsView @2587 (UNREACHABLE_NO_HISTORY)
- inputCenterApplyStudentNo @2899 (UNREACHABLE_NO_HISTORY)
- inputCenterSuggestTarget @2957 (UNREACHABLE_NO_HISTORY)
- outputProgramCardMarkup @3149 (UNREACHABLE_NO_HISTORY)
- subjectsOutputPanel @3180 (UNREACHABLE_NO_HISTORY)
- studentReportsOutputPanel @3220 (UNREACHABLE_NO_HISTORY)
- emptyModule @3459 (UNREACHABLE_NO_HISTORY)
- issueReportButtonMarkup @3901 (UNREACHABLE_NO_HISTORY)
- internalNineGradeReferenceMap @4346 (UNREACHABLE_NO_HISTORY)
- counselRecordLabel @4780 (UNREACHABLE_NO_HISTORY)
- recordAreaPanel @5125 (UNREACHABLE_NO_HISTORY)
- autoInferCareerDatesForClass @5292 (UNREACHABLE_NO_HISTORY)
- dateDistanceDays @5335 (UNREACHABLE_NO_HISTORY)
- careerDateEditor @5428 (UNREACHABLE_NO_HISTORY)
- extractRecordCore @5524 (UNREACHABLE_NO_HISTORY)
- normalizeRecordEnding @5534 (UNREACHABLE_NO_HISTORY)
- recordEvidenceSignals @5540 (UNREACHABLE_NO_HISTORY)
- stripProgramDatesFromRecordText @5923 (UNREACHABLE_NO_HISTORY)
- programTopTabs @6177 (UNREACHABLE_NO_HISTORY)
- fixedTeacherTimetableReference @6958 (UNREACHABLE_NO_HISTORY)
- homeroomWeekMarkup @7114 (UNREACHABLE_NO_HISTORY)
- safeWidget @7168 (UNREACHABLE_NO_HISTORY)
- currentUserOvertimeTasks @7222 (UNREACHABLE_NO_HISTORY)
- dashboardCompactTasksMarkup @7252 (UNREACHABLE_NO_HISTORY)
- dashboardCompactNoticesMarkup @7274 (UNREACHABLE_NO_HISTORY)
- workItemReadByCurrentUser @7955 (UNREACHABLE_NO_HISTORY)
- dashboardTopAlertsMarkup @8013 (UNREACHABLE_NO_HISTORY)
- completionStatusMarkup @8066 (UNREACHABLE_NO_HISTORY)
- openStudentCounselEdit @8261 (UNREACHABLE_NO_HISTORY)
- todayProgramsMarkup @8394 (UNREACHABLE_NO_HISTORY)
- canRevealStudentSensitiveInfo @8434 (UNREACHABLE_NO_HISTORY)
- signalRowsForStudent @8440 (UNREACHABLE_NO_HISTORY)
- openStudentTimetableDrawer @9205 (UNREACHABLE_NO_HISTORY)
- studentActivityOverview @9217 (UNREACHABLE_NO_HISTORY)
- sortUniversitiesByPriority @9355 (UNREACHABLE_NO_HISTORY)
- admissionPairCompatible @9425 (UNREACHABLE_NO_HISTORY)
- studentStatsRankCard @9555 (UNREACHABLE_NO_HISTORY)
- sendProgramEmailNotice @10964 (UNREACHABLE_NO_HISTORY)
- prepareProgramSmsNotice @10972 (UNREACHABLE_NO_HISTORY)
- openProgramAttendanceQr @10977 (UNREACHABLE_NO_HISTORY)
- copyProgramRiroNotice @11022 (UNREACHABLE_NO_HISTORY)
- copyProgramIndividualNotices @11026 (UNREACHABLE_NO_HISTORY)
- copyProgramFamilyLetter @11037 (UNREACHABLE_NO_HISTORY)
- uepCompareSelectionHistory @12356 (UNREACHABLE_HISTORICAL_ONLY)
- uepSchoolGrowthGapSummary @12448 (UNREACHABLE_HISTORICAL_ONLY)
- bindSelectionAnalysis @12593 (UNREACHABLE_HISTORICAL_ONLY)

## Replacement parity required
- schoolScheduleTimetableMarkup @2591 -> calendarSelectedDayMarkup score=0.493
- accessControlInlineMarkup @4008 -> openAccessControlPanel score=0.525
- admissionCutLimit @4626 -> strictAdmissionCutLimit score=0.571
- sdgsEvidenceForGoal @5697 -> suggestSdgsForRows score=0.500
- formatTaskCompletedAt @6860 -> dateKeyLocal score=0.615
- dashboardTodayLessonsMarkup @7173 -> dashboardPersonalWeekMarkup score=0.455
- dashboardSelectedDayMarkup @7201 -> calendarSelectedDayMarkup score=0.597
- dashboardStudentStatusMarkup @7799 -> dashboardStudentStatusCompactMarkup score=0.747
- openMealDutyDrawer @8453 -> openTodayLunchSupervisorDrawer score=0.534
- retryGoogleConnection @9109 -> selectGoogleCredential score=0.586

## Manual review

## Canonicalization plan
- selectionComparisonsForStudent: FLATTEN, defs=2, MERGE_INTO_CANONICAL, first@3039, final@11895
- selectionComparisonMarkup: FLATTEN, defs=3, MERGE_INTO_CANONICAL, first@3043, final@11988
- selectionErrorHistoryMarkup: FLATTEN, defs=3, MERGE_INTO_CANONICAL, first@3049, final@11998
- sdgsDashboard: SHADOW, defs=2, REMOVE_EARLIER_SHADOW_AFTER_PARITY, first@5729, final@12403
- selectionErrorsForStudent: FLATTEN, defs=2, MERGE_INTO_CANONICAL, first@5954, final@11928
- recordsView: FLATTEN, defs=2, MERGE_INTO_CANONICAL, first@6060, final@12591
- findPopupRoot: SHADOW, defs=2, REMOVE_EARLIER_SHADOW_AFTER_PARITY, first@12072, final@12145
- applyFix: SHADOW, defs=2, REMOVE_EARLIER_SHADOW_AFTER_PARITY, first@12090, final@12168
- uepStudentApplicationDetail: SHADOW, defs=2, REMOVE_EARLIER_SHADOW_AFTER_PARITY, first@12534, final@12574
- uepStudentApplicationView: SHADOW, defs=2, REMOVE_EARLIER_SHADOW_AFTER_PARITY, first@12535, final@12575
- uepSubjectApplicationView: SHADOW, defs=2, REMOVE_EARLIER_SHADOW_AFTER_PARITY, first@12536, final@12577
- uepSelectionDataset: FLATTEN, defs=2, MERGE_INTO_CANONICAL, first@12544, final@12613

## Safety rule
- This pass produces a cleanup plan only. It performs no application-code deletion.
- STRONG_DELETE_CANDIDATE still requires syntax check and route smoke after removal in a separate cleanup branch.
- REMOVE_AFTER_REPLACEMENT_PARITY requires behavioral comparison before deletion.
- FLATTEN groups must preserve all wrapper-added behavior in one canonical implementation before old generations are removed.