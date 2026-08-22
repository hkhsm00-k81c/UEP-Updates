# UEP CODEBASE AUDIT — THIRD PASS CLASSIFICATION

- duplicate names: 12 (26 sites)
- SAFE_DELETE dead candidates: 59
- dynamic-reference review: 0
- wrapper chains: 3
- observer/interval/RAF sites: 44

## Duplicate/override classification
- selectionComparisonsForStudent: FLATTEN_OVERRIDE_CHAIN / declaration@3039#d664d3b3ac05 | assignment@11895#7cf504d5f30a
- selectionComparisonMarkup: FLATTEN_OVERRIDE_CHAIN / declaration@3043#29f0c6d20a7a | assignment@11917#1f952b0d9063 | assignment@11988#081de4675525
- selectionErrorHistoryMarkup: FLATTEN_OVERRIDE_CHAIN / declaration@3049#5b3fc155871e | assignment@11933#66e0e4dd3448 | assignment@11998#276c394154a8
- sdgsDashboard: SAFE_DELETE_SHADOWED_DECL / declaration@5729#f5db4609cdd6 | declaration@12403#fdbb9da5b771
- selectionErrorsForStudent: FLATTEN_OVERRIDE_CHAIN / declaration@5954#fd5979f1cf04 | assignment@11928#1c8a4e54d981
- recordsView: FLATTEN_OVERRIDE_CHAIN / declaration@6060#70fd17a139cb | assignment@12591#e18fea3de1d0
- findPopupRoot: SAFE_DELETE_SHADOWED_DECL / declaration@12072#ede9477d6fa9 | declaration@12145#de11fb576e10
- applyFix: SAFE_DELETE_SHADOWED_DECL / declaration@12090#204af6369ffd | declaration@12168#eb1070e89e87
- uepStudentApplicationDetail: SAFE_DELETE_SHADOWED_DECL / declaration@12534#690394466029 | declaration@12574#1798d252d034
- uepStudentApplicationView: SAFE_DELETE_SHADOWED_DECL / declaration@12535#d9f5375d4562 | declaration@12575#015010c9c55d
- uepSubjectApplicationView: SAFE_DELETE_SHADOWED_DECL / declaration@12536#577af7103041 | declaration@12577#4a3a021a404c
- uepSelectionDataset: FLATTEN_OVERRIDE_CHAIN / declaration@12544#db113dea9137 | assignment@12613#6aee51295509

## Wrapper chains
- selectionErrorHistoryMarkup <- prior @ 11998: FLATTEN_OVERRIDE_CHAIN
- recordsView <- __uepRecordsBefore08106 @ 12591: FLATTEN_OVERRIDE_CHAIN
- uepSelectionDataset <- __uepSelectionDatasetRaw08113 @ 12613: FLATTEN_OVERRIDE_CHAIN

## First SAFE_DELETE candidates
- tasksMarkup @ 1288 (334 chars)
- dormProgramIsHolisticTarget @ 1901 (146 chars)
- nightMatrixStatus @ 2241 (2108 chars)
- subjectsView @ 2586 (532 chars)
- schoolScheduleTimetableMarkup @ 2590 (1725 chars)
- inputCenterApplyStudentNo @ 2898 (473 chars)
- inputCenterSuggestTarget @ 2956 (786 chars)
- outputProgramCardMarkup @ 3148 (482 chars)
- subjectsOutputPanel @ 3179 (1626 chars)
- studentReportsOutputPanel @ 3219 (1162 chars)
- emptyModule @ 3458 (245 chars)
- issueReportButtonMarkup @ 3900 (129 chars)
- accessControlInlineMarkup @ 4007 (2656 chars)
- internalNineGradeReferenceMap @ 4345 (1224 chars)
- admissionCutLimit @ 4625 (337 chars)
- counselRecordLabel @ 4779 (55 chars)
- recordAreaPanel @ 5124 (1345 chars)
- autoInferCareerDatesForClass @ 5291 (757 chars)
- dateDistanceDays @ 5334 (146 chars)
- careerDateEditor @ 5427 (1543 chars)
- extractRecordCore @ 5523 (575 chars)
- normalizeRecordEnding @ 5533 (219 chars)
- recordEvidenceSignals @ 5539 (718 chars)
- sdgsEvidenceForGoal @ 5696 (293 chars)
- stripProgramDatesFromRecordText @ 5922 (229 chars)
- programTopTabs @ 6176 (308 chars)
- formatTaskCompletedAt @ 6859 (348 chars)
- fixedTeacherTimetableReference @ 6957 (1153 chars)
- homeroomWeekMarkup @ 7113 (258 chars)
- safeWidget @ 7167 (204 chars)
- dashboardTodayLessonsMarkup @ 7172 (1322 chars)
- dashboardSelectedDayMarkup @ 7200 (1182 chars)
- currentUserOvertimeTasks @ 7221 (1232 chars)
- dashboardCompactTasksMarkup @ 7251 (1572 chars)
- dashboardCompactNoticesMarkup @ 7273 (1079 chars)
- dashboardStudentStatusMarkup @ 7798 (2465 chars)
- workItemReadByCurrentUser @ 7954 (135 chars)
- dashboardTopAlertsMarkup @ 8012 (619 chars)
- completionStatusMarkup @ 8065 (882 chars)
- openStudentCounselEdit @ 8260 (631 chars)
- todayProgramsMarkup @ 8393 (1181 chars)
- canRevealStudentSensitiveInfo @ 8433 (149 chars)
- signalRowsForStudent @ 8439 (521 chars)
- openMealDutyDrawer @ 8452 (2118 chars)
- retryGoogleConnection @ 9108 (762 chars)
- openStudentTimetableDrawer @ 9204 (486 chars)
- studentActivityOverview @ 9216 (1475 chars)
- sortUniversitiesByPriority @ 9354 (178 chars)
- admissionPairCompatible @ 9424 (92 chars)
- studentStatsRankCard @ 9554 (809 chars)
- sendProgramEmailNotice @ 10963 (567 chars)
- prepareProgramSmsNotice @ 10971 (386 chars)
- openProgramAttendanceQr @ 10976 (917 chars)
- copyProgramRiroNotice @ 11021 (259 chars)
- copyProgramIndividualNotices @ 11025 (414 chars)
- copyProgramFamilyLetter @ 11036 (194 chars)
- uepCompareSelectionHistory @ 12355 (1272 chars)
- uepSchoolGrowthGapSummary @ 12447 (298 chars)
- bindSelectionAnalysis @ 12592 (2496 chars)

## Safety rule
- Do not delete from production yet.
- SAFE_DELETE_DUPLICATE: remove only earlier identical/shadowed copy after syntax + route regression checks.
- FLATTEN_OVERRIDE_CHAIN: rewrite into one canonical function, preserving behavior from all wrappers.
- SAFE_DELETE_CANDIDATE: require repo-wide search including HTML/preload/main before removal.
- PERF: inspect lifecycle and cleanup for each observer/timer before changing.