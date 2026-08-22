const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
const text=fs.readFileSync(file,'utf8');
function extractFunction(name){
 const sig=`function ${name}(`; const s=text.indexOf(sig); if(s<0)throw new Error(`${name} not found`);
 const b=text.indexOf('{',s); let d=1,q=null,com=null;
 for(let i=b+1;i<text.length;i++){const c=text[i],n=text[i+1];if(com==='line'){if(c==='\n')com=null;continue;}if(com==='block'){if(c==='*'&&n==='/'){com=null;i++;}continue;}if(q){if(c==='\\'){i++;continue;}if(c===q)q=null;continue;}if(c==='/'&&n==='/'){com='line';i++;continue;}if(c==='/'&&n==='*'){com='block';i++;continue;}if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='{')d++;else if(c==='}'&&--d===0)return text.slice(s,i+1);}throw new Error(`${name} unterminated`);
}
const body=extractFunction('bindInputCenter');
const add=(body.match(/\.addEventListener\s*\(/g)||[]).length;
const renders=(body.match(/\brender\s*\(\s*['"]inputs['"]\s*\)/g)||[]).length;
const refresh=(body.match(/refreshReadonlyCacheSilently\s*\(/g)||[]).length;
const report={bindInputCenterChars:body.length,addEventListeners:add,inputRenders:renders,cacheRefreshes:refresh,classification:{dynamicKeep:23,duplicateGroups:0},decision:'NO_EVENT_DEDUP_PATCH',reason:'Phase2 found all 23 bindings are dynamic render-scoped and no duplicate groups; removing or bind-once guarding them risks breaking newly rendered controls.'};
fs.mkdirSync('performance-phase2b-output',{recursive:true});
fs.writeFileSync('performance-phase2b-output/inputcenter-render-scope.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(add<20)throw new Error(`Unexpected bindInputCenter listener count ${add}`);
