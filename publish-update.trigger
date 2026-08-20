Publish requested: UEP 0.80.96 ONE-POINT curriculum selection-history fix
Requested at: 2026-08-20 23:05 KST
Base: shipped v0.80.95 update package.
Important correction: publish workflow itself is now switched from 0.80.95 to 0.80.96. Earlier trigger alone could not build 0.80.96 because the workflow still called the 0.80.95 script.
Scope lock: 생활기록부 > 교육과정(선택과목) only. Do not modify meal, privacy, dorm outing, approval line, or Google OAuth.
Single source of truth: 기본정보연결시트 06_선택과목이력 -> readonlyCache.subjectSelections only. This is the directly migrated Liroschool application record.
Remove from curriculum UI/data path: legacy pre-application comparison, Google Form comparison, comparison/history panels, selectedSubjects fallback/merge.
Display: current student selection subjects from subjectSelections across all grades/terms including grade 3.
Validation shown only against this direct-migration data: 문이과 교차지원, 과학과목 위계오류, 학기간 중복과목 오류.
Build script: scripts/build-update-0.80.96.ps1
Visible version: v0.80.96
