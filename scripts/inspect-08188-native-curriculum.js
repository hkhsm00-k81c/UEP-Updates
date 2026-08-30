const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const out=process.argv[3]||'.github/inspection/08188-native-curriculum.txt';
const g=fs.readFileSync(path.join(root,'resources','app','gyomuon.js'),'utf8');
function extractFunction(name){
  const start=g.indexOf('function '+name+'('); if(start<0)return 'NOT FOUND '+name;
  const brace=g.indexOf('{',start); let d=0, quote=null, esc=false;
  for(let i=brace;i<g.length;i++){
    const c=g[i];
    if(quote){ if(esc){esc=false;continue;} if(c==='\\'){esc=true;continue;} if(c===quote)quote=null; continue; }
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')d++; else if(c==='}'&&--d===0)return g.slice(start,i+1);
  }
  return g.slice(start,start+12000);
}
function contexts(term, radius=2200){
  let pos=0,arr=[],n=0; while((pos=g.indexOf(term,pos))>=0&&n<20){arr.push(`\n--- ${term} #${++n} @${pos} ---\n`+g.slice(Math.max(0,pos-radius),Math.min(g.length,pos+term.length+radius)));pos+=term.length;} return arr.join('\n');
}
let s='UEP 0.81.88 NATIVE CURRICULUM INSPECTION\n\n';
s+='=== uepStudentApplicationView ===\n'+extractFunction('uepStudentApplicationView')+'\n\n';
for(const t of ['data-record-class','data-record-student','data-curriculum-error-only','data-curriculum-error-type','data-curriculum-workspace','data-record-mode="curriculum"','curriculumWorkspaceMode','curriculumErrorOnly','curriculumErrorType','render(\'records\')','setTimeout(releaseNotes,1200)','uepOpenReleaseNotes08174','uepOpenReleaseNotes08177']) s+=contexts(t)+'\n';
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,s,'utf8');
console.log(out);
