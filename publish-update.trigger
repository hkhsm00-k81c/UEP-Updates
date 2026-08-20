Publish requested: UEP 0.80.97 direct selection-history loader fix
Requested at: 2026-08-20 23:24 KST
Base: shipped v0.80.96 update package.
Confirmed root cause from shipped 0.80.96: UI reads readonlyCache.subjectSelections, but google-data returns only selectedSubjects; additionally 06_선택과목이력 range stops at row 2000 while the live tab has 5410 rows.
Scope lock: 생활기록부 > 교육과정(선택과목) only. Do not modify meal, privacy, dorm outing, approval line, or Google OAuth.
Fix: read 06_선택과목이력 A1:X6000, use final(Y) direct-migration Liroschool rows only, export the same array as subjectSelections, remove legacy 41_선택과목_오류검토 import, and recalculate requested errors only from those direct rows.
Validation shown only: 문이과 교차지원, 과학과목 위계오류, 학기간 중복과목 오류.
Build script: scripts/build-update-0.80.97.ps1
Visible version: v0.80.97
