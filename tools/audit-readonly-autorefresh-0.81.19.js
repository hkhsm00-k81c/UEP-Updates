const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
const text=fs.readFileSync(file,'utf8');
function extractFunction(name){const sig=`function ${name}(`;const s=text.indexOf(sig);if(s<0)throw new Error(`${name} not found`);const b=text.indexOf('{',s);let d=1,q=null,com=null;for(let i=b+1;i<text.length;i++){const c=text[i],n=text[i+1];if(com==='line'){if(c==='\n')com=null;continue}if(com==='block'){if(c==='*'&&n==='/'){com=null;i++}continue}if(q){if(c==='\\'){i++;continue}if(c===q)q=null;continue}if(c==='/'&&n==='/'){com='line';i++;continue}if(c==='/'&&n==='*'){com='block';i++;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')d++;else if(c==='}'&&--d===0)return text.slice(s,i+1)}throw new Error(`${name} unterminated`)}
const body=extractFunction('startReadonlyAutoRefresh');
const setIntervals=[...body.matchAll(/setInterval\s*\(([^,]+),\s*([^)]+)\)/g)].map(m=>({callback:m[1].trim(),delay:m[2].trim()}));
const clearIntervals=(body.match(/clearInterval\s*\(/g)||[]).length;
const refreshCalls=(body.match(/refreshReadonlyCacheSilently\s*\(/g)||[]).length;
const guards={existingHandle:/if\s*\([^)]*(?:readonly|refresh|interval|timer)[^)]*\)/i.test(body),visibility:/document\.hidden|visibilityState/.test(body),activePage:/activePage|currentPage|page===|page\s*==/.test(body)};
const handleAssignments=[...body.matchAll(/([A-Za-z0-9_$]+)\s*=\s*setInterval/g)].map(m=>m[1]);
const allSetIntervals=(text.match(/setInterval\s*\(/g)||[]).length;
const allClearIntervals=(text.match(/clearInterval\s*\(/g)||[]).length;
const report={body,bodyChars:body.length,setIntervals,clearIntervals,refreshCalls,guards,handleAssignments,global:{setIntervals:allSetIntervals,clearIntervals:allClearIntervals},risk:{duplicateTimer:setIntervals.length>0&&!guards.existingHandle,backgroundRefresh:refreshCalls>0&&!guards.visibility,alwaysRefresh:refreshCalls>0&&!guards.activePage}};
fs.mkdirSync('performance-phase6-output',{recursive:true});fs.writeFileSync('performance-phase6-output/readonly-autorefresh.json',JSON.stringify(report,null,2));
let md='# startReadonlyAutoRefresh Audit\n\n';md+=`setInterval: ${setIntervals.length}\nclearInterval: ${clearIntervals}\ncache refresh calls: ${refreshCalls}\nexisting timer guard: ${guards.existingHandle}\nvisibility guard: ${guards.visibility}\nactive-page guard: ${guards.activePage}\n\nRisk: ${JSON.stringify(report.risk)}\n\n\`\`\`js\n${body}\n\`\`\`\n`;fs.writeFileSync('performance-phase6-output/READONLY-AUTOREFRESH.md',md);console.log(JSON.stringify(report,null,2));
