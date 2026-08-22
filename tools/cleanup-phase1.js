const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const outDir=process.argv[3]||'cleanup-output';
fs.mkdirSync(outDir,{recursive:true});
const gPath=path.join(appRoot,'resources/app/gyomuon.js');
let g=fs.readFileSync(gPath,'utf8');
const beforeBytes=Buffer.byteLength(g,'utf8');
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function findFunction(src,name){
  const re=new RegExp('(?:^|\\n)([ \\t]*)(?:async\\s+)?function\\s+'+esc(name)+'\\s*\\([^)]*\\)\\s*\\{','g');
  const ms=[...src.matchAll(re)];
  if(ms.length!==1)throw new Error(`${name}: expected exactly one declaration, got ${ms.length}`);
  const m=ms[0];
  let start=m.index+(m[0][0]==='\n'?1:0);
  const brace=src.indexOf('{',start);let depth=0,q=null,escape=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i];
    if(escape){escape=false;continue}
    if(q){if(c==='\\'){escape=true;continue}if(c===q)q=null;continue}
    if(c==='"'||c==="'"||c==='`'){q=c;continue}
    if(c==='{')depth++;
    else if(c==='}'&&--depth===0){let end=i+1;while(end<src.length&&(src[end]==='\r'||src[end]==='\n'))end++;return {start,end,text:src.slice(start,end)};}
  }
  throw new Error(`${name}: unclosed function body`);
}
const targets=['uepCompareSelectionHistory','uepSchoolGrowthGapSummary','bindSelectionAnalysis','emptyModule','issueReportButtonMarkup'];
const removed=[];
for(const name of targets){
  const loc=findFunction(g,name);
  removed.push({name,chars:loc.end-loc.start});
  g=g.slice(0,loc.start)+g.slice(loc.end);
  const remaining=(g.match(new RegExp('\\b'+esc(name)+'\\b','g'))||[]).length;
  if(remaining!==0)throw new Error(`${name}: references remain after removal (${remaining})`);
}
fs.writeFileSync(gPath,g,'utf8');
const afterBytes=Buffer.byteLength(g,'utf8');
const mustRemain=['recordsView','sdgsDashboard','uepSelectionDataset','uepStudentApplicationDetail','uepStudentApplicationView','uepSubjectApplicationView','uepActiveSelectionRows','uepSelectionTermSubjects','uepStudentGradeAverage','uepExpectedGrade','uepMountRecordbookValidator'];
for(const name of mustRemain){if(!(new RegExp('\\b'+esc(name)+'\\b')).test(g))throw new Error(`critical symbol missing after cleanup: ${name}`)}
const report=['# UEP CLEANUP PHASE 1','',`- removed functions: ${removed.length}`,`- bytes before: ${beforeBytes}`,`- bytes after: ${afterBytes}`,`- bytes removed: ${beforeBytes-afterBytes}`,'','## Removed'];
for(const r of removed)report.push(`- ${r.name}: ${r.chars} chars`);
report.push('','## Preserved critical symbols',...mustRemain.map(x=>'- '+x),'','## Safety','- This cleanup is applied only to a reconstructed runtime in the cleanup branch workflow.','- No production release or updater policy is changed.');
fs.writeFileSync(path.join(outDir,'CLEANUP-PHASE1.md'),report.join('\n'),'utf8');
console.log(`CLEANUP PHASE1 COMPLETE removed=${removed.length} bytes=${beforeBytes-afterBytes}`);