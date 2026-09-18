# UEP 배포 절차 (release.yml / rollback.yml)

앱은 이 저장소의 `uep-version.json`·`uep-policy.json`을 읽어 더 높은 버전이 있으면
`downloadUrl`의 `UEP-update.zip`을 받아(sha256 검증) 자동 업데이트합니다.
zip = Electron 실행파일 전체 + `resources/app`(소스). 릴리스 워크플로는 직전 릴리스 zip의
실행파일 뼈대를 그대로 쓰고 `resources/app`만 `UEP-Source`의 `app/resources/app`으로 교체합니다.

## 준비 (한 번만)
- `UEP-Updates` → Settings → Secrets and variables → Actions → `UEP_SOURCE_READ_TOKEN`
  : `UEP-Source` 저장소만, 권한 **Contents: Read-only** 인 Fine-grained token.

## 새 버전 배포
1. `UEP-Source`에서 코드 수정 → 노트북 실행파일로 검증 → 버전 올리기
   (`app/resources/app/package.json`의 `version`, `gyomuon.js`의 `const APP_VERSION="…"`) → push
2. Actions → **Release UEP from source** → Run workflow
   - version: 올린 버전, mode: **candidate**, source_ref: 브랜치, base_version: 직전 정식 버전
   - 결과: 프리릴리스 `v<버전>-candidate` (자동 업데이트 대상 아님)
3. candidate zip을 노트북에 풀어 실제 실행 검증
4. 같은 워크플로를 mode: **stable** 로 실행
   - candidate와 `resources/app` 내용이 동일해야 통과 → 정식 릴리스 `v<버전>` + 지시서 갱신
   - 이 시점부터 사용자 PC가 업데이트를 받음

## 되돌리기
Actions → **Rollback updater to a previous release** → version: 되돌릴 정식 버전(예: 0.83.06)
- 지시서만 이전 릴리스로 되돌립니다. **아직 업데이트하지 않은 PC**는 문제 버전을 받지 않게 됩니다.
- 앱은 자기보다 낮은 버전으로는 내려가지 않으므로, **이미 문제 버전을 받은 PC**를 되돌리려면
  이전 내용으로 더 높은 번호(예: 0.83.08)를 다시 배포해야 합니다.

## 워크플로가 중단하는 경우
같은 버전 정식 릴리스가 이미 있음 · 입력 버전과 package.json/APP_VERSION 불일치 · JS 문법 오류 ·
필수 파일 누락 · `.bak` 잔존 · 직전 zip sha256 불일치 · (stable) candidate가 없거나 내용이 다름
