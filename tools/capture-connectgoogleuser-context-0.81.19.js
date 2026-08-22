const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
const text=fs.readFileSync(file,'utf8');
function extract(name){const sig=`function ${name}(`;const s=text.indexOf(sig);if(s<0)throw new Error(`${name} not found`);const b=text.indexOf('{',s);let d=1,q=null,com=null;for(let i=b+1;i<text.length;i++){const c=text[i],n=text[i+1];if(com==='line'){if(c==='\n')com=null;continue}if(com==='block'){if(c==='*'&&n==='/'){com=null;i++}continue}if(q){if(c==='\\'){i++;continue}if(c===q)q=null;continue}if(c==='/'&&n==='/'){com='line';i++;continue}if(c==='/'&&n==='*'){com='block';i++;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')d++;else if(c==='}'&&--d===0)return text.slice(s,i+1)}throw new Error('unterminated')}
const body=extract('connectGoogleUser');
const lines=body.split(/\r?\n/);
const hits=[];
for(let i=0;i<lines.length;i++) if(/refreshReadonlyCacheSilently\s*\(|\brender\s*\(/.test(lines[i])) hits.push({line:i+1,code:lines[i].trim(),context:lines.slice(Math.max(0,i-3),Math.min(lines.length,i+4)).map((x,j)=>`${Math.max(0,i-3)+j+1}: ${x}`).join('\n')});
const report={functionChars:body.length,hits};
fs.mkdirSync('performance-phase10-output',{recursive:true});
fs.writeFileSync('performance-phase10-output/connect-google-user-context.json',JSON.stringify(report,null,2));
let md='# connectGoogleUser render context\n\n';for(const h of hits)md+=`## line ${h.line}\n\n\`\`\`js\n${h.context}\n\`\`\`\n\n`;
fs.writeFileSync('performance-phase10-output/CONNECT-GOOGLE-USER-CONTEXT.md',md);
console.log(JSON.stringify(report,null,2));
if(hits.length<2)throw new Error('Expected refresh and render context hits');
