const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const targets=['calendarTitleFromRow','dateFromYmd','emptyModule','formatTaskCompletedAt','getReadonlySheetsAuth','internalNineGradeReferenceMap','parseSchoolCalendarMatrix','sheetNameFromRange','sortUniversitiesByPriority','workItemReadByCurrentUser'];
const runtimeFiles=['resources/app/gyomuon.js','resources/app/electron/main.cjs','resources/app/electron/google-data.cjs'];
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function findFunction(text,name){
  const re=new RegExp('\\bfunction\\s+'+esc(name)+'\\s*\\(','g');
  const m=re.exec(text); if(!m)return null;
  const open=text.indexOf('{',m.index); if(open<0)return null;
  let d=1,q=null,comment=null;
  for(let i=open+1;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(comment==='line'){if(c==='\n')comment=null;continue;}
    if(comment==='block'){if(c==='*'&&n==='/'){comment=null;i++;}continue;}
    if(q){if(c==='\\'){i++;continue;}if(c===q)q=null;continue;}
    if(c==='/'&&n==='/'){comment='line';i++;continue;}
    if(c==='/'&&n==='*'){comment='block';i++;continue;}
    if(c==='"'||c==="'"||c==='`'){q=c;continue;}
    if(c==='{')d++; else if(c==='}'&&--d===0){let end=i+1;while(end<text.length&&(text[end]==='\r'||text[end]==='\n'))end++;return {start:m.index,end};}
  }
  return null;
}
const files=new Map(runtimeFiles.map(rel=>[rel,fs.readFileSync(path.join(root,rel),'utf8')]));
const report=[];
for(const name of targets){
  const hits=[];
  let totalRefs=0;
  for(const rel of runtimeFiles){
    const text=files.get(rel);
    totalRefs+=(text.match(new RegExp('\\b'+esc(name)+'\\b','g'))||[]).length;
    const span=findFunction(text,name);
    if(span)hits.push({rel,span});
  }
  if(hits.length===0){
    if(totalRefs!==0)throw new Error(`${name}: no declaration but ${totalRefs} residual identifier reference(s) found`);
    report.push({name,status:'ALREADY_ABSENT',removedChars:0});
    continue;
  }
  if(hits.length!==1)throw new Error(`${name}: expected at most one declaration across runtime files, found ${hits.length}`);
  if(totalRefs!==1)throw new Error(`${name}: expected exactly one identifier occurrence before removal, got ${totalRefs}`);
  const {rel,span}=hits[0];
  let text=files.get(rel);
  const removed=text.slice(span.start,span.end);
  text=text.slice(0,span.start)+text.slice(span.end);
  if(new RegExp('\\b'+esc(name)+'\\b').test(text))throw new Error(`${name}: residual reference remains in ${rel}`);
  files.set(rel,text);
  report.push({name,file:rel,status:'REMOVED',removedChars:removed.length});
}
for(const [rel,text] of files)fs.writeFileSync(path.join(root,rel),text,'utf8');
fs.mkdirSync('cleanup1-output',{recursive:true});
fs.writeFileSync('cleanup1-output/cleanup1-report.json',JSON.stringify(report,null,2),'utf8');
console.log(JSON.stringify(report,null,2));
