# UEP FULL CODEBASE AUDIT — SECOND PASS

- 중복/override 대상 함수 위치: 26
- MutationObserver 위치: 9
- setInterval 위치: 6
- 전체 render 위치: 237
- wrapper chain 위치: 3
- 미참조 함수 후보: 59

## Wrapper chains
- selectionErrorHistoryMarkup <- prior @ line 11998
- recordsView <- __uepRecordsBefore08106 @ line 12591
- uepSelectionDataset <- __uepSelectionDatasetRaw08113 @ line 12613

## Duplicate/override function sites
- applyFix / declaration / line 12091 / refs 8
- applyFix / declaration / line 12169 / refs 8
- findPopupRoot / declaration / line 12073 / refs 4
- findPopupRoot / declaration / line 12146 / refs 4
- sdgsDashboard / declaration / line 5730 / refs 3
- sdgsDashboard / declaration / line 12404 / refs 3
- uepStudentApplicationDetail / declaration / line 12535 / refs 4
- uepStudentApplicationDetail / declaration / line 12575 / refs 4
- uepStudentApplicationView / declaration / line 12536 / refs 3
- uepStudentApplicationView / declaration / line 12576 / refs 3
- uepSubjectApplicationView / declaration / line 12537 / refs 3
- uepSubjectApplicationView / declaration / line 12578 / refs 3
- recordsView / declaration / line 6061 / refs 5
- recordsView / assignment / line 12592 / refs 5
- selectionComparisonMarkup / declaration / line 3044 / refs 4
- selectionComparisonMarkup / assignment / line 11918 / refs 4
- selectionComparisonMarkup / assignment / line 11989 / refs 4
- selectionComparisonsForStudent / declaration / line 3040 / refs 8
- selectionComparisonsForStudent / assignment / line 11896 / refs 8
- selectionErrorHistoryMarkup / declaration / line 3050 / refs 5
- selectionErrorHistoryMarkup / assignment / line 11934 / refs 5
- selectionErrorHistoryMarkup / assignment / line 11999 / refs 5
- selectionErrorsForStudent / declaration / line 5955 / refs 13
- selectionErrorsForStudent / assignment / line 11929 / refs 13
- uepSelectionDataset / declaration / line 12545 / refs 7
- uepSelectionDataset / assignment / line 12614 / refs 7
