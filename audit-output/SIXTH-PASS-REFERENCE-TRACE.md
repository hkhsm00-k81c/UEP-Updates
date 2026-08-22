# UEP CODEBASE AUDIT — SIXTH PASS REFERENCE TRACE

- candidates traced: 59
- UNREACHABLE_HISTORICAL_ONLY: 3
- UNREACHABLE_NO_HISTORY: 46
- UNREACHABLE_WITH_REPLACEMENT_CANDIDATE: 10

## Unreachable candidates with possible replacement
- dashboardStudentStatusMarkup @7799 -> dashboardStudentStatusCompactMarkup score=0.747 refs=2; history=0
- formatTaskCompletedAt @6860 -> dateKeyLocal score=0.615 refs=2; history=0
- dashboardSelectedDayMarkup @7201 -> calendarSelectedDayMarkup score=0.597 refs=2; history=0
- retryGoogleConnection @9109 -> selectGoogleCredential score=0.586 refs=5; history=0
- admissionCutLimit @4626 -> strictAdmissionCutLimit score=0.571 refs=2; history=0
- openMealDutyDrawer @8453 -> openTodayLunchSupervisorDrawer score=0.534 refs=2; history=0
- accessControlInlineMarkup @4008 -> openAccessControlPanel score=0.525 refs=6; history=0
- sdgsEvidenceForGoal @5697 -> suggestSdgsForRows score=0.500 refs=7; history=0
- schoolScheduleTimetableMarkup @2591 -> calendarSelectedDayMarkup score=0.493 refs=2; history=0
- dashboardTodayLessonsMarkup @7173 -> dashboardPersonalWeekMarkup score=0.455 refs=2; history=0

## Unreachable historical-only
- uepCompareSelectionHistory @12356; historical files=1; scripts\build-update-0.80.79.ps1
- uepSchoolGrowthGapSummary @12448; historical files=1; scripts\build-update-0.80.82.ps1
- bindSelectionAnalysis @12593; historical files=8; scripts\build-update-0.81.15.ps1 | patches\uep-0.81.04-features.js | patches\uep-0.81.05-curriculum-sdgs.js | patches\uep-0.81.06-curriculum-final.js

## Unreachable with no historical reference
- tasksMarkup @1289
- dormProgramIsHolisticTarget @1902
- nightMatrixStatus @2242
- subjectsView @2587
- inputCenterApplyStudentNo @2899
- inputCenterSuggestTarget @2957
- outputProgramCardMarkup @3149
- subjectsOutputPanel @3180
- studentReportsOutputPanel @3220
- emptyModule @3459
- issueReportButtonMarkup @3901
- internalNineGradeReferenceMap @4346
- counselRecordLabel @4780
- recordAreaPanel @5125
- autoInferCareerDatesForClass @5292
- dateDistanceDays @5335
- careerDateEditor @5428
- extractRecordCore @5524
- normalizeRecordEnding @5534
- recordEvidenceSignals @5540
- stripProgramDatesFromRecordText @5923
- programTopTabs @6177
- fixedTeacherTimetableReference @6958
- homeroomWeekMarkup @7114
- safeWidget @7168
- currentUserOvertimeTasks @7222
- dashboardCompactTasksMarkup @7252
- dashboardCompactNoticesMarkup @7274
- workItemReadByCurrentUser @7955
- dashboardTopAlertsMarkup @8013
- completionStatusMarkup @8066
- openStudentCounselEdit @8261
- todayProgramsMarkup @8394
- canRevealStudentSensitiveInfo @8434
- signalRowsForStudent @8440
- openStudentTimetableDrawer @9205
- studentActivityOverview @9217
- sortUniversitiesByPriority @9355
- admissionPairCompatible @9425
- studentStatsRankCard @9555
- sendProgramEmailNotice @10964
- prepareProgramSmsNotice @10972
- openProgramAttendanceQr @10977
- copyProgramRiroNotice @11022
- copyProgramIndividualNotices @11026
- copyProgramFamilyLetter @11037

## Active/dynamic references requiring KEEP

## Safety rule
- No code is deleted in this pass.
- Historical-only means the name exists in scripts/patches but not in active runtime call paths detected by this audit.
- Replacement similarity is advisory only; it does not authorize deletion.
- Any deletion still requires route smoke tests and a flattened canonical runtime first.