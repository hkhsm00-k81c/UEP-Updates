const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app/resources/app';
const out=process.argv[3]||'inspection-08268-university.txt';
const lines=[];
function probe(file,needles,ctx=20){
  lines.push(`===== FILE ${file} =====`);
  if(!fs.existsSync(file)){lines.push('MISSING');return;}
  const arr=fs.readFileSync(file,'utf8').split(/\r?\n/);
  for(const needle of needles){
    const hits=[];for(let i=0;i<arr.length;i++)if(arr[i].includes(needle))hits.push(i);
    lines.push(`=== NEEDLE ${needle} / HITS ${hits.length} ===`);
    for(const i of hits.slice(0,16)){
      const s=Math.max(0,i-ctx),e=Math.min(arr.length-1,i+ctx);
      lines.push(`--- source lines ${s+1}-${e+1}; hit ${i+1} ---`);
      for(let j=s;j<=e;j++) lines.push(`${String(j+1).padStart(6,' ')} | ${arr[j]}`);
    }
  }
}
probe(path.join(root,'gyomuon.js'),[
  'openDashboardUniversityDetail(',
  'const resultHtml=',
  'const calcHtml=',
  'const minHtml=',
  'const courseHtml=',
  'openDashboardAdmissionDialogBase',
  'logo','로고'
],28);
probe(path.join(root,'electron','google-data.cjs'),[
  '55_대학입결DB','57_내신산정DB','58_권장과목DB','56_대학입시마스터','admissionResults','admissionGradeCalcs','admissionRecommendations'
],18);
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(/\.css$/i.test(e.name))out.push(p);}return out;}
for(const css of walk(root))probe(css,['uep-uni-summary-card','uep-uni-min-row','uep-uni-course-section','uep-uni-result-grid','uep-admission-university-detail'],16);
fs.writeFileSync(out,lines.join('\n'),'utf8');
console.log(`wrote ${out}`);
