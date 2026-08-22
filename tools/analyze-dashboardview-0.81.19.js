const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
const text=fs.readFileSync(file,'utf8');
function extract(name){const sig=`function ${name}(`;const s=text.indexOf(sig);if(s<0)throw new Error(`${name} not found`);const b=text.indexOf('{',s);let d=1,q=null,com=null;for(let i=b+1;i<text.length;i++){const c=text[i],n=text[i+1];if(com==='line'){if(c==='\n')com=null;continue}if(com==='block'){if(c==='*'&&n==='/'){com=null;i++}continue}if(q){if(c==='\\'){i++;continue}if(c===q)q=null;continue}if(c==='/'&&n==='/'){com='line';i++;continue}if(c==='/'&&n==='*'){com='block';i++;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')d++;else if(c==='}'&&--d===0)return text.slice(s,i+1)}throw new Error('unterminated')}
const body=extract('dashboardView');
const chains=[...body.matchAll(/([A-Za-z_$][\w$\.\[\]'"()]+)\.(filter|map|sort)\s*\(/g)].map(m=>({base:m[1],op:m[2],index:m.index}));
const baseCounts={};for(const c of chains)baseCounts[c.base]=(baseCounts[c.base]||0)+1;
const repeated=Object.entries(baseCounts).filter(([,n])=>n>1).map(([base,count])=>({base,count}));
const lines=body.split(/\r?\n/);const hits=[];for(let i=0;i<lines.length;i++){if(/\.(filter|map|sort)\s*\(/.test(lines[i]))hits.push({line:i+1,code:lines[i].trim(),context:lines.slice(Math.max(0,i-2),Math.min(lines.length,i+3)).map((x,j)=>`${Math.max(0,i-2)+j+1}: ${x}`).join('\n')});}
const report={functionChars:body.length,chains,hits,repeatedBases:repeated,decision:repeated.length?'REVIEW_MEMOIZATION':'NO_OBVIOUS_REPEAT'};
fs.mkdirSync('performance-phase12-output',{recursive:true});fs.writeFileSync('performance-phase12-output/dashboardview-analysis.json',JSON.stringify(report,null,2));
let md='# dashboardView repetition analysis\n\n';md+=`Decision: ${report.decision}\n\n`;for(const h of hits)md+=`## line ${h.line}\n\n\`\`\`js\n${h.context}\n\`\`\`\n\n`;fs.writeFileSync('performance-phase12-output/DASHBOARDVIEW-ANALYSIS.md',md);console.log(JSON.stringify(report,null,2));