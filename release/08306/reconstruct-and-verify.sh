#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
PAYLOAD="$(cd "$(dirname "$0")" && pwd)"

check_sha() {
  local target="$1" expected="$2"
  local actual
  actual="$(sha256sum "$ROOT/$target" | awk '{print $1}')"
  test "$actual" = "$expected" || { echo "SHA mismatch: $target $actual" >&2; exit 1; }
  echo "PASS $target $actual"
}

apply_patch_payload() {
  local payload="$1" target="$2" expected="$3"
  test -f "$PAYLOAD/$payload"
  base64 -d "$PAYLOAD/$payload" | gzip -dc | patch -d "$ROOT" -p1 --forward --batch
  check_sha "$target" "$expected"
}

apply_full_payload() {
  local payload="$1" target="$2" expected="$3"
  test -f "$PAYLOAD/$payload"
  base64 -d "$PAYLOAD/$payload" | gzip -dc > "$ROOT/$target"
  check_sha "$target" "$expected"
}

apply_split_full_payload() {
  local prefix="$1" target="$2" expected="$3"
  shopt -s nullglob
  local parts=("$PAYLOAD/$prefix".part.*)
  test "${#parts[@]}" -gt 0 || { echo "Missing split payload: $prefix.part.*" >&2; exit 1; }
  cat "${parts[@]}" | base64 -d | gzip -dc > "$ROOT/$target"
  check_sha "$target" "$expected"
}

apply_patch_payload gyomuon.js.patch.gz.b64 gyomuon.js b4c99f388965d785199a0ab0f2c11f3ebc5b51be2971e3824c0588691104157b
apply_patch_payload main.cjs.patch.gz.b64 electron/main.cjs fd5e26ce3a16f5c76f30148e34bd9dbbe393de03689277462e7ef88af82eac35
apply_full_payload gyomuon.css.full.gz.b64 gyomuon.css 125f4aa3a526affd64f8bf412c5f87e0d02ddc4f624267b381d870a9b23b696e
apply_split_full_payload uep-runtime-v07649.css uep-runtime-v07649.css f7ee3e5c4e809afff0cb817fcb48fa8ca927f0d79fd319637bb088ca169fe75c

node --check "$ROOT/gyomuon.js"
node --check "$ROOT/electron/main.cjs"
node --check "$ROOT/electron/preload.cjs"

echo 'SOURCE PATCH GATE PASS'
