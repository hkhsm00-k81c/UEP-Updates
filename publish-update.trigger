Publish requested: UEP 0.80.97 direct selection-history loader fix
Requested at: 2026-08-20 23:34 KST
Retry reason: prior build passed the legacy error-block replacement but failed on the whitespace-sensitive selectedSubjects fallback block. The build now replaces that section using stable literal boundaries from 'const confirmedSubjects = legacySelectedSubjectRows.filter' to the existing '// 0.80.81:' marker.
Base: shipped v0.80.96 update package.
Scope lock: 생활기록부 > 교육과정(선택과목) only. Do not modify meal, privacy, dorm outing, approval line, or Google OAuth.
Fix: read 06_선택과목이력 A1:X6000, use final(Y) direct-migration Liroschool rows only, export the exact same array as subjectSelections, remove legacy 41_선택과목_오류검토 import, and recalculate requested errors only from those direct rows.
Validation shown only: 문이과 교차지원, 과학과목 위계오류, 학기간 중복과목 오류.
Build script: scripts/build-update-0.80.97.ps1
Visible version: v0.80.97
