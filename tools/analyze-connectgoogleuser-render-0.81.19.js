const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
const text=fs.readFileSync(file,'utf8');
function extract(name){const sig=`function ${name}(`;const s=text.indexOf(sig);if(s<0)throw new Error(`${name} not found`);const b=text.indexOf('{',s);let d=1,q=null,com=null;for(let i=b+1;i<text.length;i++){const c=text[i],n=text[i+1];if(com==='line'){if(c==='\n')com=null;continue}if(com==='block'){if(c==='*'&&n==='/'){com=null;i++}continue}if(q){if(c==='\\'){i++;continue}if(c===q)q=null;continue}if(c==='/'&&n==='/'){com='line';i++;continue}if(c==='/'&&n==='*'){com='block';i++;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')d++;else if(c==='}'&&--d===0)return text.slice(s,i+1)}throw new Error('unterminated')}
const body=extract('connectGoogleUser');
const refreshCalls=[...body.matchAll(/refreshReadonlyCacheSilently\s*\(([^)]*)\)/g)].map(m=>m[0]);
const renderCalls=[...body.matchAll(/\brender\s*\(([^)]*)\)/g)].map(m=>m[0]);
const hasRerenderTrue=refreshCalls.some(x=>/rerender\s*:\s*true/.test(x));
const report={refreshCalls,renderCalls,hasRerenderTrue,duplicateCandidate:hasRerenderTrue&&renderCalls.length>0,decision:hasRerenderTrue&&renderCalls.length>0?'VERIFY_REMOVE_EXPLICIT_RENDER':'KEEP'};
fs.mkdirSync('performance-phase9-output',{recursive:true});fs.writeFileSync('performance-phase9-output/connect-google-user-render.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(!report.duplicateCandidate)throw new Error('No duplicate render candidate found');
