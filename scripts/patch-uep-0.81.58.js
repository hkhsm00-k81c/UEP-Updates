const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const gFile=path.resolve(appRoot,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}

g=g.replace(/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/,'const APP_VERSION = "0.81.58";');

// 1) Google Sheets 날짜가 UTC ISO 문자열(예: 전날 15:00Z)로 전달될 때
// 문자열 앞 10자를 먼저 채택하지 말고 Asia/Seoul 날짜로 변환합니다.
const dateAnchor=`  const full=text.match(/(20\\d{2})[^0-9]+(\\d{1,2})[^0-9]+(\\d{1,2})/);`;
assert(g.includes(dateAnchor),'uepComparableDate full-date anchor not found');
const dateFix=`  if(/^20\\d{2}-\\d{2}-\\d{2}T/.test(text)){
    const iso=new Date(text);
    if(!Number.isNaN(iso.getTime())){
      const kst=new Date(iso.getTime()+9*60*60*1000);
      return \`${'${kst.getUTCFullYear()}'}-${'${String(kst.getUTCMonth()+1).padStart(2,\'0\')}'}-${'${String(kst.getUTCDate()).padStart(2,\'0\')}'}\`;
    }
  }
${dateAnchor}`;
g=g.replace(dateAnchor,dateFix);

// 2) 2학년 예술 선택은 1학기와 2학기 동일 계열을 유지해야 합니다.
// 기존 중앙 검증 결과에 음악<->미술 교차 선택 오류를 추가합니다.
const curriculumMarker='// __UEP_08113_RESTORED_CURRICULUM_SDGS_BODY__';
assert(g.includes(curriculumMarker),'curriculum marker not found');
const artFix=`// __UEP_08158_ART_CONTINUITY__
const __uepSelectionDataset08158=uepSelectionDataset;
uepSelectionDataset=function(){
  const base=__uepSelectionDataset08158();
  const rows=Array.isArray(base?.rows)?base.rows:[];
  const errors=[...(Array.isArray(base?.errors)?base.errors:[])];
  rows.forEach(row=>{
    const student=row?.__student;if(!student)return;
    const t21=uepSelectionTermSubjects(row,'2-1');
    const t22=uepSelectionTermSubjects(row,'2-2');
    const first=t21.includes('음악 연주와 창작')?'음악':(t21.includes('미술 창작')?'미술':'');
    const second=t22.includes('음악과 미디어')?'음악':(t22.includes('미술과 매체')?'미술':'');
    if(first&&second&&first!==second&&!errors.some(e=>e?.student?.id===student.id&&e?.type==='예술계열 연계오류')){
      errors.push({student,type:'예술계열 연계오류',term:'2-1→2-2',severity:'오류',status:'확인 필요',subject:'예술 선택',detail:\`2학년 예술 선택 계열 불일치: 1학기 ${'${first}'} → 2학기 ${'${second}'} (동일 계열 선택 필요)\`});
    }
  });
  return {...base,errors};
};
${curriculumMarker}`;
g=g.replace(curriculumMarker,artFix);

assert(g.includes('const APP_VERSION = "0.81.58";'),'version marker');
assert(g.includes('__UEP_08158_ART_CONTINUITY__'),'art continuity marker');
assert(g.includes("iso.getTime()+9*60*60*1000"),'KST date marker');
fs.writeFileSync(gFile,g,'utf8');
console.log('UEP 0.81.58 selection continuity + KST attendance date patch applied');
