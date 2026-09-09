# 기본정보 연결시트 입시 중복탭 참조감사 — 2026-09-09

기준 패키지: UEP v0.82.83 Release ZIP

## 1. 전용 입시 로더
- `electron/main.cjs`는 `UEP_ADMISSIONS_SPREADSHEET_ID = 1BHSdaUbOhp9p_9RB0XGgrfOo4wS_Z8Up0ocSCAMYIIk`를 2028 입시DB의 주 원본으로 사용한다.
- 동시에 `UEP_ADMISSIONS_FALLBACK_SPREADSHEET_ID = 1bphoIQ11E2qsc3ksOqrXuO7xqS4CFyH8Dagbld7A1hg`를 기존 기본정보 연결시트 fallback으로 유지한다.
- 전용 로더 대상은 52_대입기초, 53_전형이해, 53A, 53B, 53C, 54, 55, 56, 56A, 57, 58이다.
- 새 입시DB 읽기에 실패하면 기존 기본정보 연결시트의 동일 52~58 탭을 다시 읽도록 되어 있다.

## 2. 캐시 매핑 및 소비 화면
전용 로더는 다음 캐시를 만든다.
- 52 → admissionBasics
- 53 → admissionTypes
- 53A → admissionSubtypes/admissionTypeDetails
- 53B → admissionStructures/admissionTypeUniversities
- 54 → admissionMinimumRows
- 55 → admissionResults
- 56 → universityAdmissions
- 56A → admissionCounselPoints
- 57 → admissionGradeCalcs
- 58 → admissionRecommendations

이 캐시들은 대시보드의 대입기초/전형이해/오늘의 대학, 입시 메뉴의 종합분석/수능최저/대학별 입결, 학생정보의 대학 배지·입시 연계, 학사생 카드의 대학 적합도/입결·수능최저 참고, 상담 관련 입시 연계 경로에서 사용된다. 화면들은 대부분 기본정보 시트를 직접 읽지 않고 위 캐시를 소비한다.

## 3. 56A는 별도 주의
`saveAdmissionCounselPoint()`는 현재 `56A_대학상담포인트DB`를 읽고 저장할 때 전용 `UEP_ADMISSIONS_SPREADSHEET_ID`가 아니라 일반 `UEP_SPREADSHEET_ID`를 사용한다. 동일 `UEP_SPREADSHEET_ID`는 04_학생연락식별정보, 42_급식지도계획, 43_야자감독계획, 45_학생상담기록 등 기본정보 연결시트 계열 저장에도 사용된다. 따라서 56A는 현재 전용 입시DB로 쓰기 경로가 완전히 이관됐다고 볼 수 없다.

## 4. 삭제 판정
현재 v0.82.83에서는 기본정보 연결시트의 52~58 계열 탭을 삭제하면 안 된다.
- 52,53,53A,53B,53C,54,55,56,57,58: 새 입시DB가 주 원본이지만 기존 시트가 fallback으로 남아 있다.
- 56A: fallback뿐 아니라 상담포인트 저장 경로도 일반 UEP_SPREADSHEET_ID를 사용한다.

## 5. 삭제 전 필요한 이관
1. 56A 상담포인트 읽기/쓰기를 `UEP_ADMISSIONS_SPREADSHEET_ID`로 변경한다.
2. 52~58 기존 기본정보 fallback을 제거하고, 새 입시DB 실패 시 마지막 정상 캐시/오류표시 방식으로 전환한다.
3. 회귀검사에서 기본정보 연결시트 ID로 52~58을 읽거나 쓰는 코드가 0건인지 확인한다.
4. 배포 후 종합분석, 수능최저, 대학별 입결, 오늘의 대학, 학생정보, 학사생 카드, 상담 연계를 실제 확인한다.
5. 그 다음 기본정보 연결시트의 중복 입시탭을 삭제한다.

참고: 새 2028 입시DB의 현재 탭에는 59_모집단위DB, 59A_전형별모집단위DB도 존재하지만, v0.82.83의 위 전용 로더 목록에는 아직 포함되어 있지 않다. 새 '대학' 메뉴 개편 시 별도 로더/인덱스로 연결하는 것이 적절하다.
