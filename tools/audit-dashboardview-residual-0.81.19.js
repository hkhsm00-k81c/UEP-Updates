const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
const text=fs.readFileSync(file,'utf8');
function extract(name){const sig=`function ${name}(`;const s=text.indexOf(sig);if(s<0)throw new Error(`${name} not found`);const b=text.indexOf('{',s);let d=1,q=null,com=null;for(let i=b+1;i<text.length;i++){const c=text[i],n=text[i+1];if(com==='line'){if(c==='\n')com=null;continue}if(com==='block'){if(c==='*'&&n==='/'){com=null;i++}continue}if(q){if(c==='\\'){i++;continue}if(c===q)q=null;continue}if(c==='/'&&n==='/'){com='line';i++;continue}if(c==='/'&&n==='*'){com='block';i++;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')d++;else if(c==='}'&&--d===0)return text.slice(s,i+1)}throw new Error('unterminated')}
const body=extract('dashboardView');
const calls=[...body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]).filter(n=>!['if','for','while','switch','catch','function','return'].includes(n));
const counts={};for(const n of calls)counts[n]=(counts[n]||0)+1;
const repeatedCalls=Object.entries(counts).filter(([,c])=>c>1).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count}));
const stateReads=[...body.matchAll(/\b(localStorage\.getItem|JSON\.parse|dashboard[A-Za-z0-9_$]+|readonlyCache\?\.[A-Za-z0-9_$]+)/g)].map(m=>m[0]);
const stateCounts={};for(const s of stateReads)stateCounts[s]=(stateCounts[s]||0)+1;
const repeatedState=Object.entries(stateCounts).filter(([,c])=>c>1).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count}));
const arrayOps=[...body.matchAll(/\.(filter|map|sort|reduce|find|some|every)\s*\(/g)].map(m=>m[1]);
const report={functionChars:body.length,repeatedCalls,repeatedState,arrayOpsCount:arrayOps.length,decision:(repeatedCalls.length||repeatedState.length)?'REVIEW_RESIDUAL_DUPLICATION':'NO_OBVIOUS_RESIDUAL_DUPLICATION'};
fs.mkdirSync('performance-phase15-output',{recursive:true});
fs.writeFileSync('performance-phase15-output/dashboardview-residual.json',JSON.stringify(report,null,2));
let md='# dashboardView Phase15 residual audit\n\n';md+=`Decision: ${report.decision}\n\n## Repeated calls\n`;for(const r of repeatedCalls)md+=`- ${r.name}: ${r.count}\n`;md+='\n## Repeated state reads\n';for(const r of repeatedState)md+=`- ${r.name}: ${r.count}\n`;md+=`\nArray operations remaining: ${arrayOps.length}\n`;fs.writeFileSync('performance-phase15-output/DASHBOARDVIEW-RESIDUAL.md',md);console.log(JSON.stringify(report,null,2));
