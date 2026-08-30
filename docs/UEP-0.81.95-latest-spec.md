# UEP 0.81.95 Latest Specification / Handoff

Updated: 2026-08-30
Branch: candidate/0.81.95-selection-normalizer

## 1. Authoritative data flow

- Source: 기본정보연결시트 `06_선택과목이력`
- Rules: 규칙로그시트 `41_선택과목규칙`
- Output 1: 데이터처리시트 `51_선택과목오류_정규화`
- Output 2: 데이터처리시트 `52_선택과목현황_정규화`

UEP must itself perform the normalization. Apps Script is not the authority for 51/52 in the target architecture.

### 51_선택과목오류_정규화

`06_선택과목이력`을 학생별로 읽고 `41_선택과목규칙`을 적용하여 오류를 생성한다.

- 미선택 오류
- 과다선택 오류
- 선택군 중복선택 오류
- 학기간 동일과목 중복
- 계열 연계 오류
- 과학 위계 오류
- 폐강과목 신청오류
- 한 학생에게 복수 오류가 있으면 1행 1오류 구조로 펼친다.

51에 현재 남아 있는 기존 데이터는 과거 데이터처리시트 Apps Script가 만든 결과물이다. 현재 UEP 0.81.95가 쓴 결과라고 간주하지 않는다. UEP가 정상화되면 51은 UEP가 새 결과로 재생성/교체하는 대상이다.

### 52_선택과목현황_정규화

`06_선택과목이력`을 기준으로 과목별 신청 현황을 생성한다.

- 학기 / 과목
- 신청인원
- 예상분반
- 문과 / 이과 / 미분류 구성
- 평균 / 중앙값 / 등급 분포
- 과학 위계 과목의 선수과목 기준 최대풀, 이전학기 동일교과 선택, 현재 선택가능인원, 정상신청, 위계오류, 미선택
- 개설기준 및 자동판정 / 관리자결정

현재 UEP 화면의 과목별 카드에서는 신청인원, 예상분반, 성적분포 등이 계산되어 보이므로 현황 계산 데이터 자체는 UEP 내부에서 생성되고 있음이 확인되었다. 하지만 52 시트 A4 이후에는 아직 저장되지 않는다.

## 2. 0.81.95 candidate build structure

Official baseline: `0.81.94`

Candidate patch order:

1. `patch-uep-08195-selection-normalizer.js`
2. `patch-uep-08195-selection-priorterm-fix.js`
3. `patch-uep-08195-selection-output.js`
4. `patch-uep-08195-selection-finalize.js`
5. `patch-uep-08195-selection-finalize-writefix.js`

A later diagnostic patch was temporarily added after these steps to trace persistence. That diagnostic build caused a regression and must NOT be treated as a valid functional candidate.

## 3. Verified findings

- Normalizer code creates `data.errors`.
- Normalizer code creates `data.selectionStatusRows=[...summary.values()]`.
- Renderer output code converts these into 51/52 rows.
- Main-process persistence code targets `51_선택과목오류_정규화` and `52_선택과목현황_정규화` directly.
- A previous persistence implementation used `getReadonlySheetsAuth()`; candidate code was changed to prefer writable Sheets auth.
- Separate sheet-write probe and real 0.81.95 selection candidate are different build paths. Probe success/failure must not be used as evidence that the real candidate persistence path ran.

## 4. Current regression / stop point

Latest diagnostic test build based on commit `e4696ac` is NOT acceptable as a working build.

Observed regression after running that diagnostic build:

- `교육과정 편성표` opens normally.
- `학생신청` button does not work.
- `문이과 교차오류` button does not work.
- `과목별 신청현황` button does not work.
- Intended diagnostic toast did not appear.

Interpretation: the renderer-side diagnostic / wrapper chain interfered with the shared selection-dataset function path before the diagnostic itself completed. Therefore no further functional conclusions should be drawn from that build.

## 5. Next-session rule

Do NOT continue by stacking more renderer wrappers or by making another blind diagnostic build.

Next work should start by restoring the last candidate state where the three selection cards/buttons still worked, then isolate persistence without replacing/wrapping the selection UI function chain.

Preferred next approach:

- Preserve existing working selection UI and `uepSelectionDataset` call flow.
- Remove the persistence diagnostic wrapper added in the latest test build.
- Keep 06 → 41 → 51/52 calculation logic unchanged.
- Trigger persistence from an already-existing stable post-refresh / data-sync point, or add main-process-only diagnostics that cannot break renderer click handlers.
- Record only counts/results: source row count, error row count, status row count, persist invocation, Sheets response/error.
- Do not clear 51/52 unless complete valid output arrays have been built.
- Verify 51 by current timestamp/new output, not by the presence of old Apps Script rows.
- Verify 52 by row 4+ population.
- No UI changes.
- No unrelated UEP changes.

## 6. User-facing functional requirement

Final target remains:

`06_선택과목이력` → `41_선택과목규칙` → UEP internal normalization → `51_선택과목오류_정규화` + `52_선택과목현황_정규화`

This must work automatically inside UEP, with the selection UI remaining unchanged and functional.
