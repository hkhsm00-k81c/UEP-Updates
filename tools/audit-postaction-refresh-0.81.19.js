const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
const text=fs.readFileSync(file,'utf8');
function extract(name){const sig=`function ${name}(`;const s=text.indexOf(sig);if(s<0)throw new Error(`${name} not found`);const b=text.indexOf('{',s);let d=1,q=null,com=null;for(let i=b+1;i<text.length;i++){const c=text[i],n=text[i+1];if(com==='line'){if(c==='\n')com=null;continue}if(com==='block'){if(c==='*'&&n==='/'){com=null;i++}continue}if(q){if(c==='\\'){i++;continue}if(c===q)q=null;continue}if(c==='/'&&n==='/'){com='line';i++;continue}if(c==='/'&&n==='*'){com='block';i++;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')d++;else if(c==='}'&&--d===0)return text.slice(s,i+1)}throw new Error(`${name} unterminated`)}
const names=['inputCenterSave','inputCenterApply','connectGoogleUser'];
const out={};
for(const name of names){const body=extract(name);const refresh=[...body.matchAll(/refreshReadonlyCacheSilently\s*\(([^)]*)\)/g)].map(m=>m[0]);const renders=[...body.matchAll(/\brender\s*\(([^)]*)\)/g)].map(m=>m[0]);const forceTrue=refresh.filter(x=>/force\s*:\s*true/.test(x)).length;const rerenderTrue=refresh.filter(x=>/rerender\s*:\s*true/.test(x)).length;out[name]={chars:body.length,refreshCalls:refresh.length,renderCalls:renders.length,forceTrue,rerenderTrue,refresh,renders,hasAwait:/\bawait\b/.test(body),hasSave:/save/i.test(body),hasApply:/apply/i.test(body)};}
const report={functions:out,decision:'AUDIT_ONLY',note:'No production code modified. Review refresh+render overlap and force/rerender flags before patching.'};
fs.mkdirSync('performance-phase8-output',{recursive:true});
fs.writeFileSync('performance-phase8-output/postaction-refresh.json',JSON.stringify(report,null,2));
let md='# UEP 0.81.19 Phase8 Post-action Refresh Audit\n\n';for(const [n,v] of Object.entries(out)){md+=`## ${n}\n- refresh calls: ${v.refreshCalls}\n- render calls: ${v.renderCalls}\n- force:true: ${v.forceTrue}\n- rerender:true: ${v.rerenderTrue}\n- async: ${v.hasAwait}\n\n`;}
fs.writeFileSync('performance-phase8-output/POSTACTION-REFRESH.md',md);
console.log(JSON.stringify(report,null,2));
