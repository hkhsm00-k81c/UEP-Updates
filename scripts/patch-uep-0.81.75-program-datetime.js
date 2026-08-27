const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};

A(/const\s+APP_VERSION\s*=\s*["']0\.81\.74["']\s*;/.test(g),'0.81.74 version marker missing');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.81\.74["']\s*;/,'const APP_VERSION = "0.81.75";');

// Explicit N must always win over any inferred night-study slot.
const nightCall='parseBool(explicitNightLink,';
A(g.includes(nightCall),'night attendance call missing');
g=g.replace(nightCall,'uepNightAttendance08175(explicitNightLink,');

const addon=String.raw`

// __UEP_08175_PROGRAM_DATETIME_FIX__
function uepNightAttendance08175(raw,fallback){
  const t=normalize(raw);
  if(/^(n|no|false|0|아니오|미연계|해당없음)$/i.test(t))return false;
  return parseBool(raw,fallback);
}
function uepSeoulDateKey08175(date){
  if(!(date instanceof Date)||Number.isNaN(date.getTime()))return '';
  return new Date(date.getTime()+9*60*60*1000).toISOString().slice(0,10);
}
function uepSerialDate08175(n){
  if(!Number.isFinite(n)||n<1)return '';
  const ms=Math.round((n-25569)*86400000);
  return new Date(ms).toISOString().slice(0,10);
}
function uepTimeFromFraction08175(n){
  if(!Number.isFinite(n))return '';
  const frac=((n%1)+1)%1;
  const minutes=Math.round(frac*1440)%1440;
  return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
}
function uepProgramDate08175(value){
  if(value==null||value==='')return '';
  if(value instanceof Date)return uepSeoulDateKey08175(value);
  if(typeof value==='number'&&Number.isFinite(value))return uepSerialDate08175(value);
  const text=String(value).trim();if(!text)return '';
  const numeric=Number(text);
  if(Number.isFinite(numeric)&&/^[-+]?\d+(?:\.\d+)?$/.test(text)&&numeric>=1)return uepSerialDate08175(numeric);
  if(/^20\d{2}-\d{2}-\d{2}[T\s].*(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)){
    const d=new Date(text);if(!Number.isNaN(d.getTime()))return uepSeoulDateKey08175(d);
  }
  const normalized=text.replace(/\./g,'-').replace(/\//g,'-');
  const direct=normalized.match(/^(20\d{2})-(\d{1,2})-(\d{1,2})(?:$|[T\s])/);
  if(direct)return direct[1]+'-'+String(Number(direct[2])).padStart(2,'0')+'-'+String(Number(direct[3])).padStart(2,'0');
  const d=new Date(text);return Number.isNaN(d.getTime())?'':uepSeoulDateKey08175(d);
}
function uepProgramTime08175(value){
  if(value==null||value==='')return '';
  if(typeof value==='number'&&Number.isFinite(value))return uepTimeFromFraction08175(value);
  if(value instanceof Date){
    const d=new Date(value.getTime()+9*60*60*1000);
    return String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0');
  }
  const text=String(value).trim();if(!text)return '';
  const direct=text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if(direct)return String(Number(direct[1])).padStart(2,'0')+':'+direct[2];
  const numeric=Number(text);
  if(Number.isFinite(numeric)&&/^[-+]?\d+(?:\.\d+)?$/.test(text))return uepTimeFromFraction08175(numeric);
  if(/^\d{4}-\d{2}-\d{2}[T\s].*(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)){
    const d=new Date(text);if(!Number.isNaN(d.getTime())){const k=new Date(d.getTime()+9*60*60*1000);return String(k.getUTCHours()).padStart(2,'0')+':'+String(k.getUTCMinutes()).padStart(2,'0');}
  }
  const isoLocal=text.match(/^\d{4}-\d{2}-\d{2}[T\s](\d{2}):(\d{2})/);
  if(isoLocal)return isoLocal[1]+':'+isoLocal[2];
  return text;
}
parseProgramDate_=uepProgramDate08175;
formatProgramTime_=uepProgramTime08175;

const __getTodayAfterPrograms08175=typeof getTodayAfterPrograms==='function'?getTodayAfterPrograms:null;
if(__getTodayAfterPrograms08175){
  getTodayAfterPrograms=function(date){
    return (__getTodayAfterPrograms08175(date)||[]).map(p=>p&&p.affectsAttendance===false?{...p,nightSlot:'',attendanceAffect:'none'}:p);
  };
}

// __UEP_08175_RELEASE_NOTES_POPUP__
const UEP_RELEASE_NOTES_08175={version:'0.81.75',title:'프로그램 날짜·시간 및 야간시간표 연계 개선',items:[
  '방과후학교 차시일정과 학생 참여이력에서 날짜가 하루 앞당겨 보이던 현상을 수정했습니다.',
  '여름방학 방과후 차시 시간이 08:40~09:30, 09:40~10:30처럼 실제 시간으로 표시되도록 보완했습니다.',
  '야자연계여부가 N인 방과후 프로그램은 오후자습·야자1·야자2 시간표에 표시되지 않도록 수정했습니다.',
  '구글시트의 날짜·시간이 ISO·숫자 시리얼 등 여러 형태로 들어와도 한국 학교 일정 기준으로 동일하게 처리합니다.'
]};
function uepReleaseNotesKey08175(){return 'uep_release_notes_seen_'+UEP_RELEASE_NOTES_08175.version;}
function uepOpenReleaseNotes08175(force=false){
  try{if(!force&&localStorage.getItem(uepReleaseNotesKey08175())==='Y')return;}catch{}
  if(document.getElementById('uepReleaseNotes08175'))return;
  const layer=document.createElement('div');layer.id='uepReleaseNotes08175';
  layer.style.cssText='position:fixed;inset:0;z-index:9900;background:rgba(15,23,42,.52);display:flex;align-items:center;justify-content:center;padding:24px';
  layer.innerHTML='<div style="width:min(680px,95vw);background:#fff;border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.28);overflow:hidden"><header style="padding:22px 24px 17px;background:#eefaf7;border-bottom:1px solid #d7eee8"><small style="font-weight:900;color:#0f766e;letter-spacing:.08em">UEP UPDATE · v'+escapeHtml(UEP_RELEASE_NOTES_08175.version)+'</small><h3 style="margin:5px 0 0;font-size:22px">'+escapeHtml(UEP_RELEASE_NOTES_08175.title)+'</h3></header><div style="padding:20px 24px"><ul style="margin:0;padding-left:20px;line-height:1.75">'+UEP_RELEASE_NOTES_08175.items.map(x=>'<li>'+escapeHtml(x)+'</li>').join('')+'</ul></div><div style="display:flex;justify-content:flex-end;padding:0 24px 22px"><button type="button" class="btn primary" data-release-notes-ok style="min-width:120px">확인</button></div></div>';
  document.body.appendChild(layer);
  layer.querySelector('[data-release-notes-ok]')?.addEventListener('click',()=>{try{localStorage.setItem(uepReleaseNotesKey08175(),'Y');}catch{}layer.remove();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>uepOpenReleaseNotes08175(false),1500));else setTimeout(()=>uepOpenReleaseNotes08175(false),1500);
`;

g+=addon;
fs.writeFileSync(gFile,g,'utf8');
const out=fs.readFileSync(gFile,'utf8');
for(const marker of ['const APP_VERSION = "0.81.75";','__UEP_08175_PROGRAM_DATETIME_FIX__','uepNightAttendance08175(explicitNightLink,','function uepNightAttendance08175','uepProgramDate08175','uepProgramTime08175','__UEP_08175_RELEASE_NOTES_POPUP__','UEP_RELEASE_NOTES_08175'])A(out.includes(marker),'0.81.75 marker missing: '+marker);
console.log('UEP 0.81.75 program date/time and night linkage patch applied');
