const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
const text=fs.readFileSync(file,'utf8');
function extractFunction(name){const sig=`function ${name}(`;const s=text.indexOf(sig);if(s<0)throw new Error(`${name} not found`);const b=text.indexOf('{',s);let d=1,q=null,com=null;for(let i=b+1;i<text.length;i++){const c=text[i],n=text[i+1];if(com==='line'){if(c==='\n')com=null;continue}if(com==='block'){if(c==='*'&&n==='/'){com=null;i++}continue}if(q){if(c==='\\'){i++;continue}if(c===q)q=null;continue}if(c==='/'&&n==='/'){com='line';i++;continue}if(c==='/'&&n==='*'){com='block';i++;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')d++;else if(c==='}'&&--d===0)return {start:s,body:text.slice(s,i+1)}}throw new Error(`${name} unterminated`)}
const {body}=extractFunction('bindSelectionAnalysis');
const lines=body.split(/\r?\n/);
const rows=[];
for(let i=0;i<lines.length;i++){if(/\brender\s*\(/.test(lines[i])){const from=Math.max(0,i-2),to=Math.min(lines.length,i+3);rows.push({line:i+1,source:lines[i].trim(),context:lines.slice(from,to).map(x=>x.trim()).join(' | ')});}}
const normalized=rows.map(r=>({line:r.line,source:r.source,kind:/addEventListener/.test(r.context)?'event-handler':/await\b/.test(r.context)?'post-async':'inline-flow',context:r.context}));
const adjacent=[];for(let i=1;i<normalized.length;i++){if(normalized[i].line-normalized[i-1].line<=3)adjacent.push([normalized[i-1].line,normalized[i].line]);}
const report={functionChars:body.length,renderCalls:rows.length,rows:normalized,adjacentRenderPairs:adjacent,decisionHint:adjacent.length?'REVIEW_ADJACENT_RENDER_PAIRS':'NO_OBVIOUS_ADJACENT_DUPLICATES'};
fs.mkdirSync('performance-phase5-output',{recursive:true});
fs.writeFileSync('performance-phase5-output/bindselectionanalysis.json',JSON.stringify(report,null,2));
let md=`# bindSelectionAnalysis Phase5 Analysis\n\nRender calls: ${rows.length}\n\n`;
for(const r of normalized)md+=`- line ${r.line}: ${r.kind} — \`${r.source.replace(/`/g,"'")}\`\n`;
md+=`\nAdjacent render pairs: ${adjacent.length?adjacent.map(x=>x.join('→')).join(', '):'none'}\n`;
fs.writeFileSync('performance-phase5-output/BINDSELECTIONANALYSIS.md',md);
console.log(JSON.stringify(report,null,2));
if(rows.length<1)throw new Error('No render calls found in bindSelectionAnalysis');
console.log(`Observed ${rows.length} render calls; continuing with observed runtime shape.`);
