const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const targets=['calendarTitleFromRow','dateFromYmd','emptyModule','formatTaskCompletedAt','getReadonlySheetsAuth','internalNineGradeReferenceMap','parseSchoolCalendarMatrix','sheetNameFromRange','sortUniversitiesByPriority','workItemReadByCurrentUser'];
const runtimeFiles=['resources/app/gyomuon.js','resources/app/electron/main.cjs','resources/app/electron/google-data.cjs'];
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function findFunctions(text,name){
  const out=[];
  const re=new RegExp('(^|[;{}]\\s*)function\\s+'+esc(name)+'\\s*\\(','gm');
  let m;
  while((m=re.exec(text))){
    const prefix=m[1]||'';
    const fnStart=m.index+prefix.length;
    const open=text.indexOf('{',fnStart); if(open<0)continue;
    let d=1,q=null,comment=null,end=-1;
    for(let i=open+1;i<text.length;i++){
      const c=text[i],n=text[i+1];
      if(comment==='line'){if(c==='\n')comment=null;continue;}
      if(comment==='block'){if(c==='*'&&n==='/'){comment=null;i++;}continue;}
      if(q){if(c==='\\'){i++;continue;}if(c===q)q=null;continue;}
      if(c==='/'&&n==='/'){comment='line';i++;continue;}
      if(c==='/'&&n==='*'){comment='block';i++;continue;}
      if(c==='"'||c==="'"||c==='`'){q=c;continue;}
      if(c==='{')d++; else if(c==='}'&&--d===0){end=i+1;while(end<text.length&&(text[end]==='\r'||text[end]==='\n'))end++;break;}
    }
    if(end>0)out.push({start:fnStart,end});
  }
  return out;
}
function contexts(text,name){
  const re=new RegExp('\\b'+esc(name)+'\\b','g'); const out=[]; let m;
  while((m=re.exec(text)) && out.length<5){
    const s=Math.max(0,m.index-90),e=Math.min(text.length,m.index+name.length+90);
    out.push(text.slice(s,e).replace(/\s+/g,' '));
  }
  return out;
}
const files=new Map(runtimeFiles.map(rel=>[rel,fs.readFileSync(path.join(root,rel),'utf8')]));
const report=[];
for(const name of targets){
  const declarations=[]; let totalRefs=0; const refContexts=[];
  for(const rel of runtimeFiles){
    const text=files.get(rel);
    const refs=(text.match(new RegExp('\\b'+esc(name)+'\\b','g'))||[]).length;
    totalRefs+=refs;
    if(refs)refContexts.push(...contexts(text,name).map(context=>({file:rel,context})));
    for(const span of findFunctions(text,name))declarations.push({rel,span});
  }
  if(declarations.length!==1 || totalRefs!==1){
    report.push({name,status:'SKIPPED_AMBIGUOUS',declarations:declarations.length,identifierRefs:totalRefs,contexts:refContexts.slice(0,5),removedChars:0});
    continue;
  }
  const {rel,span}=declarations[0];
  let text=files.get(rel);
  const removed=text.slice(span.start,span.end);
  text=text.slice(0,span.start)+text.slice(span.end);
  if(new RegExp('\\b'+esc(name)+'\\b').test(text))throw new Error(`${name}: residual reference remains in ${rel}`);
  files.set(rel,text);
  report.push({name,file:rel,status:'REMOVED',declarations:1,identifierRefs:1,removedChars:removed.length});
}
for(const [rel,text] of files)fs.writeFileSync(path.join(root,rel),text,'utf8');
fs.mkdirSync('cleanup1-output',{recursive:true});
fs.writeFileSync('cleanup1-output/cleanup1-report.json',JSON.stringify(report,null,2),'utf8');
const removed=report.filter(x=>x.status==='REMOVED').length;
const skipped=report.filter(x=>x.status!=='REMOVED').length;
console.log(`cleanup1: removed=${removed}, skipped=${skipped}`);
console.log(JSON.stringify(report,null,2));
