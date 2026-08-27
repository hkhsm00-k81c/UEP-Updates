'use strict';
const fs=require('fs');
const crypto=require('crypto');
const path=require('path');
const root=path.resolve('work/resources/app');
const jsPath=path.join(root,'gyomuon.js');
const pkgPath=path.join(root,'package.json');
const dataPath=path.join(root,'electron/google-data.cjs');

const beforeData=fs.readFileSync(dataPath);
let js=fs.readFileSync(jsPath,'utf8');
if(!js.includes('const APP_VERSION = "0.81.74";'))throw new Error('0.81.74 APP_VERSION anchor missing');
if(js.includes('UEP_08175_PROGRAM_DATETIME_FIX')||js.includes('UEP_08176_AFTER_SCHOOL_LOCAL_FIX'))throw new Error('baseline contaminated by 0.81.75/0.81.76');

js=js.replace('const APP_VERSION = "0.81.74";','const APP_VERSION = "0.81.77";');
const oldNight=`function programHasNightStudyImpact(program) {
  const dates=[program?.date,...(Array.isArray(program?.dates)?program.dates:[])].filter(Boolean);
  if(dates.length&&dates.every(isWednesdayKey)) return false;
  const weekdayText=String(program?.weekdays||program?.weekday||program?.day||"").replace(/\\s/g,"");
  if(weekdayText&&/^(수|수요일)$/.test(weekdayText)) return false;
  return Boolean(program?.affectsAttendance);
}`;
const newNight=`function programHasNightStudyImpact(program) {
  const dates=[program?.date,...(Array.isArray(program?.dates)?program.dates:[])].filter(Boolean);
  if(dates.length&&dates.every(isWednesdayKey)) return false;
  const weekdayText=String(program?.weekdays||program?.weekday||program?.day||"").replace(/\\s/g,"");
  if(weekdayText&&/^(수|수요일)$/.test(weekdayText)) return false;
  // UEP_08177_AFTER_SCHOOL_NIGHT_LINK_ONLY: 문자열 N을 Boolean(N)으로 처리하지 않는다.
  const raw=program?.affectsAttendance??program?.nightLinked??program?.nightLink??program?.['야자연계여부'];
  if(raw===true)return true;
  if(raw===false||raw==null)return false;
  return /^(Y|YES|TRUE|1|예|연계|적용)$/i.test(String(raw).trim());
}`;
if(!js.includes(oldNight))throw new Error('night impact anchor missing');
js=js.replace(oldNight,newNight);
js+=`

// __UEP_08177_STABILITY_RECOVERY__
const UEP_RELEASE_NOTES_08177={version:'0.81.77',title:'UEP 0.81.77 안정화 복구',items:[
  '프로그램 일정 수정 과정에서 발생한 날짜 표시 회귀를 복구했습니다.',
  '학사외출 날짜를 v0.81.74 안정 기준으로 정상화했습니다.',
  '방과후학교 일정의 날짜·시간 처리를 공통 날짜 처리와 분리했습니다.',
  '야자연계되지 않은 방과후 프로그램이 야간시간표에 표시되지 않도록 했습니다.',
  '앱 버전 표시와 업데이트 정보를 0.81.77로 일치시켰습니다.'
]};
function uepReleaseNotesKey08177(){return 'uep_release_notes_seen_'+UEP_RELEASE_NOTES_08177.version;}
function uepOpenReleaseNotes08177(force=false){
  try{if(!force&&localStorage.getItem(uepReleaseNotesKey08177())==='Y')return;}catch{}
  if(document.getElementById('uepReleaseNotes08177'))return;
  const layer=document.createElement('div');layer.id='uepReleaseNotes08177';
  layer.style.cssText='position:fixed;inset:0;z-index:9901;background:rgba(15,23,42,.52);display:flex;align-items:center;justify-content:center;padding:24px';
  layer.innerHTML='<div class="uep-release-dialog-08174"><header><small>UEP UPDATE · v'+escapeHtml(UEP_RELEASE_NOTES_08177.version)+'</small><h3>'+escapeHtml(UEP_RELEASE_NOTES_08177.title)+'</h3></header><div class="body"><ul>'+UEP_RELEASE_NOTES_08177.items.map(x=>'<li>'+escapeHtml(x)+'</li>').join('')+'</ul></div><div class="actions"><button type="button" class="btn primary" data-release-notes-ok>확인</button></div></div>';
  document.body.appendChild(layer);
  layer.querySelector('[data-release-notes-ok]')?.addEventListener('click',()=>{try{localStorage.setItem(uepReleaseNotesKey08177(),'Y');}catch{}layer.remove();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>uepOpenReleaseNotes08177(false),1400));else setTimeout(()=>uepOpenReleaseNotes08177(false),1400);
`;
fs.writeFileSync(jsPath,js,'utf8');
const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));pkg.version='0.81.77';fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n','utf8');
const afterData=fs.readFileSync(dataPath);
if(!beforeData.equals(afterData))throw new Error('common date/data parser changed');
if(/UEP_08175_PROGRAM_DATETIME_FIX|UEP_08176_AFTER_SCHOOL_LOCAL_FIX/.test(js))throw new Error('regression patch leaked');
console.log('patched 0.81.74 -> 0.81.77',crypto.createHash('sha256').update(afterData).digest('hex'));
// metadata promotion retry: read launcher policy from the checked-out repository.
