# UEP 0.81.17 JS / Rendering Audit

> Static audit only. No runtime source file is modified. Potential-unused findings are candidates, not deletion approval.

- analyzed files: 3
- analyzed JS chars: 1,489,616
- named function definitions: 1256
- duplicate function names: 27
- potential unused functions: 67
- render/data hotspots: 44
- repeated event-listener patterns: 3
- MutationObserver creations: 9
- addEventListener calls: 239
- DOM write operations: 155

## Top render/data hotspots

| function | file | score | DOM writes | DOM reads | events | observers | timers | data calls |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| normalizeAdmissionMatchText | gyomuon.js | 888 | 45 | 116 | 129 | 2 | 12 | 1 |
| escapeHtml | gyomuon.js | 679 | 50 | 68 | 95 | 0 | 4 | 0 |
| inputCenterExportCsv | gyomuon.js | 444 | 30 | 70 | 46 | 0 | 8 | 0 |
| recordProgramMatchName | gyomuon.js | 417 | 47 | 34 | 36 | 0 | 3 | 0 |
| bindPage | gyomuon.js | 352 | 12 | 42 | 68 | 0 | 2 | 0 |
| bindInputCenter | gyomuon.js | 77 | 0 | 1 | 25 | 0 | 0 | 0 |
| openStudentDrawer | gyomuon.js | 66 | 3 | 12 | 9 | 0 | 0 | 0 |
| runAdmissionQuery | gyomuon.js | 50 | 10 | 0 | 0 | 0 | 0 | 0 |
| openAutoDeadlineBasicDialog | gyomuon.js | 39 | 1 | 8 | 6 | 0 | 0 | 0 |
| refineGrowth090 | gyomuon.js | 37 | 1 | 16 | 0 | 0 | 0 | 0 |
| refineGrowthProfile | gyomuon.js | 37 | 3 | 11 | 0 | 0 | 0 | 0 |
| runScoreQuery | gyomuon.js | 35 | 7 | 0 | 0 | 0 | 0 | 0 |
| renderSetupWizard | gyomuon.js | 34 | 1 | 1 | 9 | 0 | 0 | 0 |
| openAfterschoolProgramDrawer | gyomuon.js | 32 | 1 | 0 | 9 | 0 | 0 | 0 |
| openAccessControlPanel | gyomuon.js | 32 | 1 | 9 | 3 | 0 | 0 | 0 |
| openSourceReference | gyomuon.js | 29 | 5 | 2 | 0 | 0 | 0 | 0 |
| openStudentGuidanceDialog | gyomuon.js | 28 | 2 | 8 | 0 | 0 | 1 | 0 |
| openDormOutingTeacherEditor | gyomuon.js | 25 | 1 | 10 | 0 | 0 | 0 | 0 |
| openCounselSidePanel | gyomuon.js | 24 | 1 | 8 | 1 | 0 | 0 | 0 |
| bindSelectionAnalysis | gyomuon.js | 24 | 0 | 0 | 8 | 0 | 0 | 0 |
| openDormReportOverlay | gyomuon.js | 24 | 1 | 5 | 3 | 0 | 0 | 0 |
| openDormOutingDrawer | gyomuon.js | 23 | 1 | 0 | 6 | 0 | 0 | 0 |
| openStudentSignalDialog | gyomuon.js | 23 | 2 | 5 | 1 | 0 | 0 | 0 |
| openHomeroomWeekDrawer | gyomuon.js | 23 | 1 | 0 | 6 | 0 | 0 | 0 |
| openIssueReportDialog | gyomuon.js | 23 | 1 | 8 | 0 | 0 | 1 | 0 |

## Duplicate function names

- **close** × 6 — gyomuon.js:57523 | gyomuon.js:377498 | gyomuon.js:645360 | gyomuon.js:779295 | gyomuon.js:783018 | gyomuon.js:1086626
- **add** × 5 — gyomuon.js:438151 | gyomuon.js:486169 | gyomuon.js:1156986 | gyomuon.js:1202416 | main.cjs:46697
- **matches** × 3 — gyomuon.js:850623 | gyomuon.js:875641 | gyomuon.js:894710
- **run** × 3 — gyomuon.js:952328 | gyomuon.js:969670 | gyomuon.js:1139402
- **applyFix** × 2 — gyomuon.js:1140892 | gyomuon.js:1143940
- **deleteDormRule** × 2 — gyomuon.js:124384 | main.cjs:60256
- **enhance** × 2 — gyomuon.js:1151873 | gyomuon.js:1164148
- **esc** × 2 — gyomuon.js:1134067 | gyomuon.js:1170076
- **expectedSchoolPeriods** × 2 — gyomuon.js:650707 | main.cjs:106487
- **find** × 2 — gyomuon.js:225784 | gyomuon.js:419911
- **findPopupRoot** × 2 — gyomuon.js:1140195 | gyomuon.js:1143101
- **finish** × 2 — gyomuon.js:1000195 | main.cjs:81177
- **label** × 2 — gyomuon.js:135102 | gyomuon.js:621674
- **match** × 2 — gyomuon.js:795611 | gyomuon.js:852098
- **neisDateToLocalDate** × 2 — gyomuon.js:650423 | main.cjs:106184
- **normalizeSelectionTerm** × 2 — google-data.cjs:104672 | google-data.cjs:51207
- **opt** × 2 — gyomuon.js:116903 | gyomuon.js:770891
- **push** × 2 — gyomuon.js:618438 | main.cjs:155621
- **q** × 2 — gyomuon.js:271257 | main.cjs:152022
- **render** × 2 — gyomuon.js:68074 | gyomuon.js:1175953
- **rows** × 2 — gyomuon.js:1090565 | gyomuon.js:1110721
- **sdgsDashboard** × 2 — gyomuon.js:532165 | gyomuon.js:1156178
- **slotRange** × 2 — gyomuon.js:168588 | google-data.cjs:39199
- **uepStudentApplicationDetail** × 2 — gyomuon.js:1183931 | gyomuon.js:1194784
- **uepStudentApplicationView** × 2 — gyomuon.js:1185645 | gyomuon.js:1196187
- **uepSubjectApplicationView** × 2 — gyomuon.js:1188916 | gyomuon.js:1199513
- **updateStudents** × 2 — gyomuon.js:957281 | gyomuon.js:958416

## Next gate

1. Cross-check potential-unused functions for dynamic invocation / window exports.
2. Trace top render hotspots for repeated DOM rebuilds and repeated data reads.
3. Only after smoke verification, create a separate cleanup candidate branch.