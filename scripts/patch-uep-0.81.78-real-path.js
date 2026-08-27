'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve('work/resources/app'),jsPath=path.join(root,'gyomuon.js'),mainPath=path.join(root,'electron/main.cjs'),dataPath=path.join(root,'electron/google-data.cjs'),pkgPath=path.join(root,'package.json');
let js=fs.readFileSync(jsPath,'utf8'),main=fs.readFileSync(mainPath,'utf8'),data=fs.readFileSync(dataPath,'utf8');
if(!js.includes('const APP_VERSION = "0.81.77";'))throw new Error('0.81.77 baseline missing');
js=js.replace('const APP_VERSION = "0.81.77";','const APP_VERSION = "0.81.78";');
const replacements=[
 ['programs.filter(program=>program.affectsAttendance).forEach(program=>{','programs.filter(program=>programHasNightStudyImpact(program)).forEach(program=>{'],
 ['programs.some(program=>program.affectsAttendance&&programRunsOn(program,day))','programs.some(program=>programHasNightStudyImpact(program)&&programRunsOn(program,day))'],
 ['group.affectsAttendance=Boolean(group.affectsAttendance||program.affectsAttendance);','group.affectsAttendance=Boolean(group.affectsAttendance||programHasNightStudyImpact(program));'],
 ['return isAfter&&pday===dayKey&&!/취소|휴강|결강/.test(String(program.status||program.operationState||""));','return isAfter&&programHasNightStudyImpact(program)&&pday===dayKey&&!/취소|휴강|결강/.test(String(program.status||program.operationState||""));']
];
for(const [from,to] of replacements){if(!js.includes(from))throw new Error('renderer anchor missing: '+from);js=js.replace(from,to);}
js+=`\n// __UEP_08178_REAL_DATA_PATH_RECOVERY__\nconst UEP_RELEASE_NOTES_08178={version:'0.81.78',title:'UEP 0.81.78 실제 데이터 경로 복구',items:['학사외출의 금요일 퇴소·일요일 입소 날짜를 원본 일정과 일치시켰습니다.','여름방학 방과후 운영일·차시일·수업시간을 기본정보연결시트 값과 일치시켰습니다.','학생 참여이력의 여름방학 방과후 기간을 동일한 원본 일정으로 표시합니다.','야자연계=N인 방과후 수업은 오후자습·야자1·야자2에 표시하지 않습니다.']};\n`;
const oldReturn='  return result.valueRanges||[];';
if(!main.includes(oldReturn))throw new Error('School Read return anchor missing');
main=main.replace(oldReturn,"  const {normalizeSchoolReadBatch}=require('./school-read-normalize.cjs');\n  return normalizeSchoolReadBatch(result.valueRanges||[],ranges);");
data=data.replace('afterSessions.filter(program=>program.affectsAttendance).forEach(program=>{','afterSessions.filter(program=>program.affectsAttendance===true).forEach(program=>{');
const normalizer=`"use strict";
const TARGETS=Object.freeze({"02_학사외출_일자별":{dates:["외출일자","신청일자","운영일","일자","날짜","적용일자"],times:[]},"11_방과후학교":{dates:["운영시작일","시작일","운영종료일","종료일","운영일자"],times:["시작시간","종료시간"]},"12_차시일정":{dates:["실제수업일","운영일자","예정일","원예정일"],times:["시작시각","종료시각","시작시간","종료시간"]}});
function sheetNameFromRange(range){const text=String(range||""),bang=text.indexOf("!");return(bang>=0?text.slice(0,bang):text).replace(/^'/,"").replace(/'$/,"");}
function addCalendarDay(value){const m=String(value??"").trim().match(/^(\\d{4})-(\\d{2})-(\\d{2})(.*)$/);if(!m)return value;const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]+1));return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0")+m[4];}
function restoreSchoolReadTime(value){const m=String(value??"").trim().match(/^(\\d{1,2}):(\\d{2})(?::(\\d{2}))?$/);if(!m||+m[1]>=6)return value;const total=(+m[1]*60 + +m[2]+388)%1440;return String(Math.floor(total/60)).padStart(2,"0")+":"+String(total%60).padStart(2,"0")+(m[3]?":"+m[3]:"");}
function normalizeSchoolReadValueRange(vr,requested){const source=vr&&typeof vr==="object"?vr:{},target=TARGETS[sheetNameFromRange(source.range||requested)];if(!target||!Array.isArray(source.values))return source;const wanted=new Set([...target.dates,...target.times]);let h=null;for(let i=0;i<Math.min(source.values.length,12);i++){const headers=(source.values[i]||[]).map(v=>String(v??"").replace(/\\s+/g,"").trim());if(headers.some(x=>wanted.has(x))){h={i,headers};break;}}if(!h)return source;const dc=new Set(h.headers.map((x,i)=>target.dates.includes(x)?i:-1).filter(i=>i>=0)),tc=new Set(h.headers.map((x,i)=>target.times.includes(x)?i:-1).filter(i=>i>=0));return{...source,values:source.values.map((r,ri)=>!Array.isArray(r)||ri<=h.i?(Array.isArray(r)?r.slice():r):r.map((v,ci)=>dc.has(ci)?addCalendarDay(v):tc.has(ci)?restoreSchoolReadTime(v):v))};}
function normalizeSchoolReadBatch(vrs,ranges){return(Array.isArray(vrs)?vrs:[]).map((vr,i)=>normalizeSchoolReadValueRange(vr,ranges?.[i]));}
module.exports={addCalendarDay,restoreSchoolReadTime,normalizeSchoolReadValueRange,normalizeSchoolReadBatch};\n`;
fs.writeFileSync(path.join(root,'electron/school-read-normalize.cjs'),normalizer);fs.writeFileSync(jsPath,js);fs.writeFileSync(mainPath,main);fs.writeFileSync(dataPath,data);
const pkg=JSON.parse(fs.readFileSync(pkgPath));pkg.version='0.81.78';fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');
console.log('patched UEP 0.81.77 -> 0.81.78 actual data path');
