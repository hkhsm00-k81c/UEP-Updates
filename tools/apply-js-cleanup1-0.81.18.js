const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const files=['resources/app/gyomuon.js','resources/app/electron/main.cjs','resources/app/electron/google-data.cjs'];
const names=['calendarTitleFromRow','dateFromYmd','emptyModule','formatTaskCompletedAt','getReadonlySheetsAuth','internalNineGradeReferenceMap','parseSchoolCalendarMatrix','sheetNameFromRange','sortUniversitiesByPriority','workItemReadByCurrentUser'];
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
const texts=new Map(files.map(rel=>[rel,fs.readFileSync(path.join(root,rel),'utf8')]));
const report=[];
for(const name of names){
  const hits=[];
  for(const rel of files){const span=findFunction(texts.get(rel),name);if(span)hits.push({rel,span});}
  if(hits.length!==1)throw new Error(`${name}: expected one declaration across runtime files, found ${hits.length}`);
  const {rel,span}=hits[0]; let text=texts.get(rel);
  let totalRefs=0; for(const t of texts.values())totalRefs+=(t.match(new RegExp('\\b'+esc(name)+'\\b','g'))||[]).length;
  if(totalRefs!==1)throw new Error(`${name}: expected exactly one identifier occurrence across runtime before removal, got ${totalRefs}`);
  const removed=text.slice(span.start,span.end); text=text.slice(0,span.start)+text.slice(span.end); texts.set(rel,text);
  report.push({file:rel,name,removedChars:removed.length});
}
for(const name of names){let refs=0;for(const t of texts.values())refs+=(t.match(new RegExp('\\b'+esc(name)+'\\b','g'))||[]).length;if(refs)throw new Error(`${name}: residual reference remains (${refs})`);}
for(const [rel,text] of texts)fs.writeFileSync(path.join(root,rel),text,'utf8');
fs.mkdirSync('cleanup1-output',{recursive:true});
fs.writeFileSync('cleanup1-output/cleanup1-report.json',JSON.stringify(report,null,2),'utf8');
console.log(JSON.stringify(report,null,2));
