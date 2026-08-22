const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const outDir=process.argv[3]||'audit-output';
const gPath=path.join(appRoot,'resources/app/gyomuon.js');
const g=fs.readFileSync(gPath,'utf8');
const lines=g.split(/\r?\n/);
function parseCsv(text){
  const rows=[]; let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(q&&text[i+1]==='"'){cur+='"';i++;}else q=!q;}
    else if(c===','&&!q){row.push(cur);cur='';}
    else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cur);cur='';if(row.some(x=>x!==''))rows.push(row);row=[];}
    else cur+=c;
  }
  if(cur||row.length){row.push(cur);rows.push(row)}
  if(!rows.length)return [];
  const hdr=rows[0];
  return rows.slice(1).map(a=>Object.fromEntries(hdr.map((h,i)=>[h,a[i]??''])));
}
function csv(rows,fields){return [fields.join(','),...rows.map(r=>fields.map(f=>'"'+String(r[f]??'').replaceAll('"','""')+'"').join(','))].join('\n')}
function offsetForLine(line){let off=0;for(let i=1;i<line;i++)off+=lines[i-1].length+1;return off}
function tokens(s){return new Set([...s.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)].map(m=>m[1]))}
function inferPage(name){
  const n=name.toLowerCase();
  if(/dashboard|task|notice|meal/.test(n))return ['dashboard','대시보드 관련 기능 확인'];
  if(/student|counsel|sensitive|signal/.test(n))return ['students','학생정보 관련 기능 확인'];
  if(/record|career|sdgs/.test(n))return ['records','생활기록부 관련 기능 확인'];
  if(/program|sms|email|riro|family/.test(n))return ['programs','프로그램 관련 기능 확인'];
  if(/timetable|homeroom|schedule/.test(n))return ['timetable','시간표·학교일정 관련 기능 확인'];
  if(/admission|universit|grade|rank/.test(n))return ['admissions','입시·성적 관련 기능 확인'];
  if(/dorm|night|attendance/.test(n))return ['attendance','기숙·출결 관련 기능 확인'];
  if(/output/.test(n))return ['outputs','출력센터 관련 기능 확인'];
  if(/subject/.test(n))return ['subjects','교과 관련 기능 확인'];
  return ['manual-review','연결 화면 수동 확인'];
}

const dupRows=parseCsv(fs.readFileSync(path.join(outDir,'third-pass-duplicates.csv'),'utf8'));
const groups=new Map();
for(const r of dupRows){if(!groups.has(r.name))groups.set(r.name,[]);groups.get(r.name).push(r)}
const diffs=[];
for(const [name,rows] of groups){
  rows.sort((a,b)=>Number(a.line)-Number(b.line));
  if(rows.length<2)continue;
  const final=rows[rows.length-1];
  const finalBody=g.slice(offsetForLine(Number(final.line)),offsetForLine(Number(final.line))+Number(final.chars));
  const finalTokens=tokens(finalBody);
  for(const old of rows.slice(0,-1)){
    const oldBody=g.slice(offsetForLine(Number(old.line)),offsetForLine(Number(old.line))+Number(old.chars));
    const oldTokens=tokens(oldBody);
    const onlyOld=[...oldTokens].filter(x=>!finalTokens.has(x)).sort();
    const onlyNew=[...finalTokens].filter(x=>!oldTokens.has(x)).sort();
    diffs.push({name,kind:String(old.class||'').includes('FLATTEN')?'FLATTEN':'SHADOW',oldKind:old.kind,finalKind:final.kind,oldLine:old.line,newLine:final.line,oldChars:old.chars,newChars:final.chars,oldHash:old.hash,newHash:final.hash,oldOnlyCount:onlyOld.length,newOnlyCount:onlyNew.length,oldOnly:onlyOld.slice(0,120).join(' '),newOnly:onlyNew.slice(0,120).join(' ')});
  }
}
fs.writeFileSync(path.join(outDir,'fifth-pass-function-diffs.csv'),csv(diffs,['name','kind','oldKind','finalKind','oldLine','newLine','oldChars','newChars','oldHash','newHash','oldOnlyCount','newOnlyCount','oldOnly','newOnly']),'utf8');

const deadRows=parseCsv(fs.readFileSync(path.join(outDir,'fourth-pass-dead-review.csv'),'utf8'));
const candidates=deadRows.filter(r=>r.classification==='SAFE_DELETE_AFTER_SMOKE');
const manual=deadRows.filter(r=>r.classification!=='SAFE_DELETE_AFTER_SMOKE');
const smoke=candidates.map(x=>{const m=inferPage(x.name);return {name:x.name,line:x.line,page:m[0],check:m[1],historyRefs:x.historyRefs||'0'};});
fs.writeFileSync(path.join(outDir,'fifth-pass-smoke-plan.csv'),csv(smoke,['name','line','page','check','historyRefs']),'utf8');

const expectedNames=[...new Set(dupRows.map(r=>r.name))];
const diffNames=[...new Set(diffs.map(r=>r.name))];
const missingDiffNames=expectedNames.filter(n=>!diffNames.includes(n));
const manualSmoke=smoke.filter(s=>s.page==='manual-review');
const report=[];
report.push('# UEP CODEBASE AUDIT — FIFTH PASS DIFF + SMOKE PLAN','');
report.push(`- duplicate/override names expected: ${expectedNames.length}`);
report.push(`- duplicate/override names analyzed: ${diffNames.length}`);
report.push(`- shadow/flatten diff rows: ${diffs.length}`);
report.push(`- fourth-pass dead candidates reviewed: ${deadRows.length}`);
report.push(`- SAFE_DELETE_AFTER_SMOKE from fourth pass: ${candidates.length}`);
report.push(`- KEEP_OR_MANUAL_REVIEW from fourth pass: ${manual.length}`);
report.push(`- smoke candidates mapped: ${smoke.length}`);
report.push(`- manual-review smoke candidates: ${manualSmoke.length}`);
report.push(`- missing diff names: ${missingDiffNames.length}`,'');
report.push('## Function-generation risk');
for(const r of diffs){const risk=Number(r.oldOnlyCount)===0?'LOWER':'REVIEW';report.push(`- ${r.name} ${r.kind}: ${r.oldKind}@${r.oldLine} -> ${r.finalKind}@${r.newLine} | oldOnly=${r.oldOnlyCount} newOnly=${r.newOnlyCount} | ${risk}`);if(Number(r.oldOnlyCount))report.push(`  - old-only tokens: ${r.oldOnly}`)}
report.push('','## Smoke plan by page');
const byPage=new Map();for(const s of smoke){if(!byPage.has(s.page))byPage.set(s.page,[]);byPage.get(s.page).push(s)}
for(const [page,arr] of [...byPage.entries()].sort()){report.push(`- ${page}: ${arr.length}`);for(const s of arr)report.push(`  - ${s.name}: ${s.check} (historyRefs=${s.historyRefs})`)}
if(missingDiffNames.length)report.push('','## MISSING DIFF NAMES',...missingDiffNames.map(n=>'- '+n));
report.push('','## Decision rule','- This pass is fail-closed for duplicate/override coverage and candidate count coverage.','- Smoke mapping is inferred from function responsibility; manual-review is an explicit protected state, not a delete approval.','- Historical references are informational only and do not alter runtime liveness.','- FLATTEN rows are never deleted mechanically; preserve wrapper-added behavior in one canonical implementation.','- No code is deleted in this pass.');
fs.writeFileSync(path.join(outDir,'FIFTH-PASS-DIFF-SMOKE.md'),report.join('\n'),'utf8');

if(expectedNames.length!==12)throw new Error(`Expected 12 duplicate/override names, got ${expectedNames.length}`);
if(diffNames.length!==expectedNames.length)throw new Error(`Incomplete diff coverage: ${diffNames.length}/${expectedNames.length}; missing=${missingDiffNames.join(',')}`);
if(candidates.length===0)throw new Error('Fourth pass produced zero SAFE_DELETE_AFTER_SMOKE candidates; refusing to continue');
if(smoke.length!==candidates.length)throw new Error(`Incomplete smoke coverage: ${smoke.length}/${candidates.length}`);
console.log(`FIFTH PASS COMPLETE names=${diffNames.length}/${expectedNames.length} diffs=${diffs.length} smoke=${smoke.length}/${candidates.length} manualSmoke=${manualSmoke.length}`);