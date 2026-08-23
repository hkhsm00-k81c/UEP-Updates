const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const appDir=path.join(appRoot,'resources','app');
const jsFile=path.join(appDir,'gyomuon.js');
const dataFile=path.join(appDir,'electron','google-data.cjs');
let s=fs.readFileSync(jsFile,'utf8');
let d=fs.readFileSync(dataFile,'utf8');

if(!s.includes('const APP_VERSION = "0.81.28";')) throw new Error('0.81.28 runtime anchor missing');
s=s.replace('const APP_VERSION = "0.81.28";','const APP_VERSION = "0.81.29";');

function findFunctionRange(src,name){
  const start=src.indexOf('function '+name+'(');
  if(start<0) throw new Error('function missing: '+name);
  const open=src.indexOf('{',start); if(open<0)throw new Error('brace missing: '+name);
  let depth=0,quote=null,esc=false,line=false,block=false;
  for(let i=open;i<src.length;i++){
    const ch=src[i],nx=src[i+1];
    if(line){if(ch==='\n')line=false;continue;}
    if(block){if(ch==='*'&&nx==='/'){block=false;i++;}continue;}
    if(quote){if(esc){esc=false;continue;}if(ch==='\\'){esc=true;continue;}if(ch===quote)quote=null;continue;}
    if(ch==='/'&&nx==='/'){line=true;i++;continue;} if(ch==='/'&&nx==='*'){block=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;} if(ch==='{')depth++; else if(ch==='}'&&--depth===0)return[start,i+1];
  }
  throw new Error('function end missing: '+name);
}
function replaceFunction(src,name,code){const [a,b]=findFunctionRange(src,name);return src.slice(0,a)+code+src.slice(b);}
function insertAfter(src,needle,text){const i=src.indexOf(needle);if(i<0)throw new Error('anchor missing: '+needle);return src.slice(0,i+needle.length)+text+src.slice(i+needle.length);}

// 0.81.29: School Read cache must carry the new central curriculum/block/rule sheets.
if(!d.includes('"18_학교교육과정DB"')){
  d=insertAfter(d,'  "06_선택과목이력": "\'06_선택과목이력\'!A1:AI1000",','\n  "18_학교교육과정DB": "\'18_학교교육과정DB\'!A1:Z1000",\n  "19_선택과목블록DB": "\'19_선택과목블록DB\'!A1:T1000",');
}
if(!d.includes('"41_선택과목규칙"')){
  d=insertAfter(d,'  "40_학사외출규칙": "\'40_학사외출규칙\'!A1:X1000",','\n  "41_선택과목규칙": "\'41_선택과목규칙\'!A1:Q1000",');
}
if(!d.includes('schoolCurriculumRows: rowsFrom("18_학교교육과정DB")')){
  d=insertAfter(d,'    selectionStudentRows: rowsFrom("06_선택과목이력"),','\n    schoolCurriculumRows: rowsFrom("18_학교교육과정DB"),\n    selectionBlocks: rowsFrom("19_선택과목블록DB"),\n    selectionRules: rowsFrom("41_선택과목규칙"),');
}

const support=`function uepSelectionNorm08129(v){return String(v??'').normalize('NFKC').replace(/\\s+/g,'').replace(/\\*/g,'').trim();}
function uepSelectionActiveRow08129(row){const st=String(row?.__student?.status||row?.__student?.enrollmentStatus||row?.['학적상태']||'재학').trim();return !st||st==='재학'||st==='재학생';}
function uepSelectionBlocks08129(){return (readonlyCache?.selectionBlocks||[]).filter(r=>String(r?.['활성']||'Y').toUpperCase()!=='N'&&r?.['학년']&&r?.['학기']);}
function uepSelectionRules08129(){return (readonlyCache?.selectionRules||[]).filter(r=>String(r?.['활성']||'Y').toUpperCase()!=='N');}
function uepSelectionRuleSource08129(){return uepSelectionBlocks08129().length&&uepSelectionRules08129().length?'연결시트 18·19 / 규칙로그 41':'규칙시트 연결 확인 필요';}
function uepSelectionFamily08129(block){const area=String(block?.['영역']||block?.['선택군명']||'');if(/예술/.test(area))return'ART';if(/정보|외국어|한문/.test(area))return'INFO';return'MAIN';}
function uepSelectionBlockTerm08129(block){const g=String(block?.['학년']||'').replace(/\\.0$/,''),sem=String(block?.['학기']||'').replace(/\\.0$/,'');return g&&sem?g+'-'+sem:'';}
function uepSelectionRowGroup08129(row,block){const term=uepSelectionBlockTerm08129(block),family=uepSelectionFamily08129(block),pick=Number(block?.['선택수']||String(block?.['선택방식']||'').match(/\\d+/)?.[0]||0);let keys=[];if(family==='INFO')keys=[term+' 정보·외국어'];else if(family==='ART')keys=[term+' 예술'];else keys=Object.keys(row||{}).filter(k=>k.startsWith(term+' 선택')).sort((a,b)=>Number(a.match(/\\d+$/)?.[0]||0)-Number(b.match(/\\d+$/)?.[0]||0));const subjects=keys.map(k=>String(row?.[k]||'').trim()).filter(Boolean);return{id:String(block?.['선택블록ID']||block?.['블록번호']||term+'-'+family),family,label:String(block?.['영역']||block?.['선택블록ID']||'선택군'),pick:Number.isFinite(pick)?pick:0,term,subjects,block};}
function uepSelectionTermGroups08129(row,term){const blocks=uepSelectionBlocks08129().filter(b=>uepSelectionBlockTerm08129(b)===term);if(blocks.length)return blocks.map(b=>uepSelectionRowGroup08129(row,b));return uepSelectionTermGroups08128(row,term);}
function uepSelectionSubjectsInTerm08129(row,term){return uepSelectionTermGroups08129(row,term).flatMap(g=>g.subjects||[]);}
function uepSelectionCurriculumGroup08129(subject){const n=uepSelectionNorm08129(subject),hit=(readonlyCache?.schoolCurriculumRows||[]).find(r=>uepSelectionNorm08129(r?.['과목명'])===n);return String(hit?.['교과군']||'');}
function uepSelectionExpectedLink08129(rule){return{from:String(rule?.['선수과목']||'').trim(),to:String(rule?.['후속·심화과목']||'').trim(),toTerm:String(rule?.['연계학기']||'').trim(),type:String(rule?.['오류유형']||'계열연계 오류').trim()};}
function uepSelectionErrors08129(row){
  if(!uepSelectionActiveRow08129(row))return[];
  const errors=[],terms=['2-1','2-2','3-1','3-2'],groups=terms.flatMap(t=>uepSelectionTermGroups08129(row,t));
  const rules=uepSelectionRules08129();
  const push=e=>errors.push({...e,subjects:(e.subjects||[]).filter(Boolean)});
  for(const g of groups){const actual=(g.subjects||[]).length,pick=Number(g.pick||0);if(pick&&actual<pick)push({type:'미선택 오류',term:g.term,terms:[g.term],subjects:g.subjects,detail:g.label+'에서 '+pick+'과목 선택이 필요합니다. (현재 '+actual+'과목)',blockId:g.id});if(pick&&actual>pick)push({type:'과다선택 오류',term:g.term,terms:[g.term],subjects:g.subjects,detail:g.label+'은 '+pick+'과목만 선택해야 합니다. (현재 '+actual+'과목)',blockId:g.id});const seen=new Map();for(const x of g.subjects||[]){const n=uepSelectionNorm08129(x);seen.set(n,(seen.get(n)||0)+1);}const dup=[...seen.entries()].filter(([,c])=>c>1).map(([n])=>(g.subjects||[]).find(x=>uepSelectionNorm08129(x)===n));if(dup.length)push({type:'선택군 중복선택 오류',term:g.term,terms:[g.term],subjects:dup,detail:g.label+' 안에서 같은 과목이 중복 선택되었습니다.',blockId:g.id});}
  const submitted=String(row?.['제출상태']||'').trim();if(/미제출|미신청/.test(submitted)&&!errors.some(e=>e.type==='미선택 오류'))push({type:'미선택 오류',term:'전체',terms:terms,subjects:[],detail:'수강신청이 제출되지 않았습니다.'});
  const bySubject=new Map();for(const term of terms)for(const subject of uepSelectionSubjectsInTerm08129(row,term)){const n=uepSelectionNorm08129(subject);if(!bySubject.has(n))bySubject.set(n,[]);bySubject.get(n).push({term,subject});}if(rules.some(r=>String(r?.['규칙ID']||'').includes('CHK-2026-DUP')||String(r?.['규칙명']||'').includes('학기간 동일과목'))){for(const items of bySubject.values())if(new Set(items.map(x=>x.term)).size>1)push({type:'학기간 동일과목 중복',term:items.map(x=>x.term).join(' · '),terms:[...new Set(items.map(x=>x.term))],subjects:[items[0].subject],detail:items[0].subject+' 과목이 여러 학기에 중복 신청되었습니다.'});}
  const crossOn=rules.some(r=>String(r?.['오류유형']||'').includes('문·이과 교차'));if(crossOn){for(const term of ['2-1','2-2']){const main=groups.find(g=>g.term===term&&g.family==='MAIN');if(!main)continue;const social=(main.subjects||[]).filter(x=>/사회/.test(uepSelectionCurriculumGroup08129(x))),science=(main.subjects||[]).filter(x=>/과학/.test(uepSelectionCurriculumGroup08129(x)));if(social.length&&science.length)push({type:'문·이과 교차오류',term,terms:[term],subjects:[...social,...science],detail:'같은 선택군에서 사회·과학 계열이 함께 선택되어 상담 확인이 필요합니다.',blockId:main.id});}}
  for(const rule of rules.filter(r=>String(r?.['규칙유형']||'')==='계열연계')){const spec=uepSelectionExpectedLink08129(rule),rawTerm=String(rule?.['학기']||''),fromTerm=rawTerm.split(/→|->/)[0].trim(),toTerm=spec.toTerm||rawTerm.split(/→|->/)[1]?.trim();if(!fromTerm||!toTerm||!spec.from||!spec.to)continue;const source=uepSelectionSubjectsInTerm08129(row,fromTerm),target=uepSelectionSubjectsInTerm08129(row,toTerm);const hasFrom=source.some(x=>uepSelectionNorm08129(x)===uepSelectionNorm08129(spec.from));if(!hasFrom)continue;const hasTo=target.some(x=>uepSelectionNorm08129(x)===uepSelectionNorm08129(spec.to));if(hasTo)continue;const family=String(rule?.['연계선택군ID']||rule?.['선택군ID']||'').toUpperCase();const tg=groups.find(g=>g.term===toTerm&&g.family===family);if(tg?.subjects?.length)push({type:spec.type,term:fromTerm+' → '+toTerm,terms:[fromTerm,toTerm],subjects:[spec.from,...tg.subjects],detail:spec.from+' 선택은 '+toTerm+'에서 '+spec.to+' 계열로 이어져야 합니다.'});}
  for(const rule of rules.filter(r=>String(r?.['규칙유형']||'')==='과학위계')){const rawTerm=String(rule?.['학기']||''),parts=rawTerm.split(/→|->/).map(x=>x.trim()),fromTerm=parts[0],toTerm=String(rule?.['연계학기']||parts[1]||'').trim(),basic=String(rule?.['선수과목']||'').trim(),advanced=String(rule?.['후속·심화과목']||'').split('|').map(x=>x.trim()).filter(Boolean);if(!fromTerm||!toTerm||!basic||!advanced.length)continue;const source=uepSelectionSubjectsInTerm08129(row,fromTerm),target=uepSelectionSubjectsInTerm08129(row,toTerm);const hit=target.filter(x=>advanced.some(a=>uepSelectionNorm08129(a)===uepSelectionNorm08129(x)));if(hit.length&&!source.some(x=>uepSelectionNorm08129(x)===uepSelectionNorm08129(basic)))push({type:String(rule?.['오류유형']||'과학과목 위계오류'),term:fromTerm+' → '+toTerm,terms:[toTerm],subjects:hit,detail:hit.join(' · ')+' 선택 전 '+basic+' 선이수 여부를 확인해야 합니다.'});}
  const uniq=new Set();return errors.filter(e=>{const k=[e.type,e.term,e.detail].join('|');if(uniq.has(k))return false;uniq.add(k);return true;});
}`;

// Install support before the restored curriculum marker so it is available to all views.
if(!s.includes('function uepSelectionErrors08129(')){
  const marker='// __UEP_08113_RESTORED_CURRICULUM_SDGS_BODY__';const at=s.indexOf(marker);if(at<0)throw new Error('curriculum marker missing');s=s.slice(0,at)+support+'\n'+s.slice(at);
}
const wrapper=`function uepSelectionErrors08105(row){return uepSelectionErrors08129(row);}`;
s=replaceFunction(s,'uepSelectionErrors08105',wrapper);
const groupsWrapper=`function uepSelectionTermGroups08128(row,term){const blocks=(readonlyCache?.selectionBlocks||[]).filter(b=>{const g=String(b?.['학년']||'').replace(/\\.0$/,''),sem=String(b?.['학기']||'').replace(/\\.0$/,'');return g+'-'+sem===term&&String(b?.['활성']||'Y').toUpperCase()!=='N';});if(!blocks.length){const keys=Object.keys(row||{}).filter(k=>k.startsWith(term+' '));const vals=rx=>keys.filter(k=>rx.test(k)).map(k=>String(row[k]||'').trim()).filter(Boolean);const out=[];const main=vals(/선택\\d+/);out.push({id:'MAIN',family:'MAIN',label:'주요 선택군',pick:term==='2-1'||term==='2-2'?3:term==='3-1'?5:term==='3-2'?7:0,term,subjects:main});const info=vals(/정보·외국어/);out.push({id:'INFO',family:'INFO',label:'정보·제2외국어',pick:1,term,subjects:info});const art=vals(/예술/);if(term==='2-1'||term==='2-2')out.push({id:'ART',family:'ART',label:'음악·미술',pick:1,term,subjects:art});return out;}return blocks.map(b=>uepSelectionRowGroup08129(row,b));}`;
s=replaceFunction(s,'uepSelectionTermGroups08128',groupsWrapper);

const subjectGroup=`function uepSubjectGroup08128(subject){const group=uepSelectionCurriculumGroup08129(subject);if(/국어|영어|수학/.test(group))return'국·영·수';if(/사회/.test(group))return'사회';if(/과학/.test(group))return'과학';if(/예술|체육/.test(group))return'음·미·체';if(/정보|제2외국어|한문|기술/.test(group))return'중국어·일본어·정보';const x=String(subject||'');if(/국어|문학|독서|수학|미적분|기하|영어/.test(x))return'국·영·수';if(/사회|세계사|윤리|지리|정치|경제/.test(x))return'사회';if(/물리|화학|생명|지구|과학/.test(x))return'과학';if(/음악|미술|체육|스포츠/.test(x))return'음·미·체';return'중국어·일본어·정보';}`;
s=replaceFunction(s,'uepSubjectGroup08128',subjectGroup);

// Class/personal dataset must exclude withdrawn/transferred inactive students from counseling error counts.
s=s.replace('const data=uepSelectionDataset(),allRows=data.rows,mode=recordQueryMode===\'student\'?\'student\':\'class\';','const data=uepSelectionDataset(),allRows=data.rows.filter(uepSelectionActiveRow08129),mode=recordQueryMode===\'student\'?\'student\':\'class\';');
// Show source-of-truth indicator in personal detail.
s=s.replace("'<section class=\"curriculum-student-detail\"><header><div><small>'+escapeHtml(student.studentNo)+' · '+escapeHtml(className)+'반</small><h3>'+escapeHtml(student.name)+' 학생신청</h3></div>'+uepSelectionErrorLabel(errors)+'</header>'+career+alert", "'<section class=\"curriculum-student-detail\"><header><div><small>'+escapeHtml(student.studentNo)+' · '+escapeHtml(className)+'반</small><h3>'+escapeHtml(student.name)+' 학생신청</h3><em class=\"selection-rule-source\">검증기준 · '+escapeHtml(uepSelectionRuleSource08129())+'</em></div>'+uepSelectionErrorLabel(errors)+'</header>'+career+alert");

// Add a small source badge style without changing the established layout.
const cssFile=fs.existsSync(path.join(appDir,'gyomuon.css'))?path.join(appDir,'gyomuon.css'):path.join(appDir,'style.css');
let c=fs.readFileSync(cssFile,'utf8');
if(!c.includes('.selection-rule-source'))c+='\n.selection-rule-source{display:block;margin-top:4px;font-size:11px;font-style:normal;opacity:.68}.selection-missing{border:1px dashed rgba(220,80,60,.45);padding:8px 10px;border-radius:8px}\n';

fs.writeFileSync(jsFile,s,'utf8');
fs.writeFileSync(dataFile,d,'utf8');
fs.writeFileSync(cssFile,c,'utf8');
console.log('UEP 0.81.29 selection sheet-rule patch applied');
