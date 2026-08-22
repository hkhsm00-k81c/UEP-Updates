const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const targets=['admissionCutLimit','admissionPairCompatible','autoInferCareerDatesForClass','dateDistanceDays','extractRecordCore','fixedTeacherTimetableReference','genericRows','nightMatrixStatus','normalizeRecordEnding','sdgsEvidenceForGoal'];
const runtimeFiles=['resources/app/gyomuon.js','resources/app/electron/main.cjs','resources/app/electron/google-data.cjs'];
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function findFunction(text,name){
  const re=new RegExp('(^|[;{}]\\s*)function\\s+'+esc(name)+'\\s*\\(','gm');
  const m=re.exec(text); if(!m)return null;
  const prefix=m[1]||'';
  const fnStart=m.index+prefix.length;
  const open=text.indexOf('{',fnStart); if(open<0)return null;
  let d=1,q=null,comment=null;
  for(let i=open+1;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(comment==='line'){if(c==='\n')comment=null;continue;}
    if(comment==='block'){if(c==='*'&&n==='/'){comment=null;i++;}continue;}
    if(q){if(c==='\\'){i++;continue;}if(c===q)q=null;continue;}
    if(c==='/'&&n==='/'){comment='line';i++;continue;}
    if(c==='/'&&n==='*'){comment='block';i++;continue;}
    if(c==='"'||c==="'"||c==='`'){q=c;continue;}
    if(c==='{')d++; else if(c==='}'&&--d===0){let end=i+1;while(end<text.length&&(text[end]==='\r'||text[end]==='\n'))end++;return {start:fnStart,end};}
  }
  return null;
}
function contexts(text,name){
  const out=[]; const re=new RegExp('\\b'+esc(name)+'\\b','g'); let m;
  while((m=re.exec(text))&&out.length<3){out.push(text.slice(Math.max(0,m.index-90),Math.min(text.length,m.index+name.length+90)).replace(/\s+/g,' '));}
  return out;
}
const files=new Map(runtimeFiles.map(rel=>[rel,fs.readFileSync(path.join(root,rel),'utf8')]));
const report=[];
for(const name of targets){
  const hits=[]; let totalRefs=0; const ctx=[];
  for(const rel of runtimeFiles){
    const text=files.get(rel);
    const refs=(text.match(new RegExp('\\b'+esc(name)+'\\b','g'))||[]).length;
    totalRefs+=refs;
    if(refs)ctx.push(...contexts(text,name).map(context=>({file:rel,context})));
    const span=findFunction(text,name); if(span)hits.push({rel,span});
  }
  if(hits.length!==1 || totalRefs!==1){
    report.push({name,status:'SKIPPED_AMBIGUOUS',declarations:hits.length,identifierRefs:totalRefs,contexts:ctx,removedChars:0});
    continue;
  }
  const {rel,span}=hits[0]; let text=files.get(rel);
  const removed=text.slice(span.start,span.end);
  text=text.slice(0,span.start)+text.slice(span.end);
  if(new RegExp('\\b'+esc(name)+'\\b').test(text)){
    report.push({name,status:'SKIPPED_RESIDUAL',file:rel,declarations:1,identifierRefs:totalRefs,removedChars:0});
    continue;
  }
  files.set(rel,text);
  report.push({name,file:rel,status:'REMOVED',declarations:1,identifierRefs:1,removedChars:removed.length});
}
for(const [rel,text] of files)fs.writeFileSync(path.join(root,rel),text,'utf8');
fs.mkdirSync('cleanup2-output',{recursive:true});
fs.writeFileSync('cleanup2-output/cleanup2-report.json',JSON.stringify(report,null,2),'utf8');
console.log(JSON.stringify(report,null,2));
