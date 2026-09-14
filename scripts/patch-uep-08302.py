#!/usr/bin/env python3
import json
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1]).resolve()
pkg_path = root / 'package.json'
gyo_path = root / 'gyomuon.js'

pkg = json.loads(pkg_path.read_text(encoding='utf-8'))
if pkg.get('version') != '0.83.01':
    raise SystemExit(f"unexpected baseline package version: {pkg.get('version')}")
pkg['version'] = '0.83.02'
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

gyo = gyo_path.read_text(encoding='utf-8')
old = 'const APP_VERSION="0.83.00"; /* UEP_08300_STABLE_ROLLBACK */'
new = 'const APP_VERSION="0.83.02"; /* UEP_08302_VERSION_SYNC */'
if old not in gyo:
    raise SystemExit('APP_VERSION 0.83.00 anchor not found')
gyo = gyo.replace(old, new, 1)

marker = '/* __UEP_08302_STABILITY_RELEASE_NOTES__ */'
if marker not in gyo:
    popup = r'''

/* __UEP_08302_STABILITY_RELEASE_NOTES__ */
(function(){
  const VERSION='0.83.02';
  const KEY='uep:release-notes:'+VERSION;
  function close(layer){
    try{localStorage.setItem(KEY,'shown');localStorage.setItem('uep.updateNotes.lastShownVersion',VERSION);}catch(_){ }
    layer.remove();
  }
  function show(){
    try{if(String(APP_VERSION)!==VERSION||localStorage.getItem(KEY)==='shown')return;}catch(_){if(String(APP_VERSION)!==VERSION)return;}
    if(!document.body||document.getElementById('uep-release-08302'))return;
    document.querySelectorAll('.uep-release-overlay,.uep-release-notes-layer,[id^="uepUpdateNotes"]').forEach(el=>el.remove());
    const layer=document.createElement('div');
    layer.id='uep-release-08302';
    layer.className='uep-release-overlay';
    layer.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.83.02 안정화 업데이트</h2><ul><li>실제 설치 버전과 상단 버전 표시를 0.83.02 하나의 기준으로 맞췄습니다.</li><li>업데이트 완료 후 최초 실행 시 이번 버전 수정사항 팝업이 1회 표시됩니다.</li><li>전자칠판 관리 메뉴의 복수 대상·특별실 제어·화면 조회 기능을 회귀검사에 포함했습니다.</li><li>기존 학생·성적·프로그램·입시 데이터 흐름과 전자칠판 저장 구조는 변경하지 않습니다.</li></ul><button type="button">확인</button></div>';
    layer.querySelector('button').onclick=()=>close(layer);
    document.body.appendChild(layer);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
})();
'''
    gyo += popup

gyo_path.write_text(gyo, encoding='utf-8')
print('PATCH_OK 0.83.02')
