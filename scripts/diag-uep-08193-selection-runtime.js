const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const g=fs.readFileSync(path.join(root,'resources','app','gyomuon.js'),'utf8');
const out=[];
function range(name){const s=g.indexOf('function '+name+'(');if(s<0)return '';const b=g.indexOf('{',s);let d=0,q=null,e=false;for(let i=b;i<g.length;i++){const c=g[i];if(q){if(e){e=false;continue}if(c==='\\'){e=true;continue}if(c===q)q=null;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')d++;else if(c==='}'&&--d===0)return g.slice(s,i+1)}return ''}
for(const name of ['uepSelectionDataset','bindPage','loadReadonlyCache','loadData','refreshData','connectSheets','loadSheets','readSheet']){const r=range(name);if(r)out.push('\n=== '+name+' ===\n'+r)}
for(const needle of ['script.google.com','readonlyCache=','readonlyCache =','google.script','fetch(','ipcRenderer','sheetId','spreadsheetId','06_선택과목이력','51_선택과목오류_정규화']){let i=0,n=0;while((i=g.indexOf(needle,i))>=0&&n<12){out.push('\n--- '+needle+' @'+i+' ---\n'+g.slice(Math.max(0,i-1200),Math.min(g.length,i+2200)));i+=needle.length;n++}}
fs.writeFileSync(path.join(root,'selection-runtime-diag.txt'),out.join('\n'),'utf8');
console.log('diag written',out.length);