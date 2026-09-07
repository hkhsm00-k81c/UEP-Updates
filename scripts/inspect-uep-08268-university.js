const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app/resources/app';
const out=process.argv[3]||'inspection-08268-university.txt';
const lines=[];
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else out.push(p);}return out;}
const files=walk(root);
lines.push('===== CSS FILES =====');
for(const css of files.filter(p=>/\.css$/i.test(p))){
  const arr=fs.readFileSync(css,'utf8').split(/\r?\n/);
  const hits=[];
  for(let i=0;i<arr.length;i++) if(/uep-uni-summary-card|uep-uni-min-row|uep-uni-course-section|uep-uni-result-grid|uep-admission-university-detail/.test(arr[i])) hits.push(i);
  if(!hits.length)continue;
  lines.push(`===== FILE ${css} / HITS ${hits.length} =====`);
  const ranges=[];for(const i of hits){const s=Math.max(0,i-12),e=Math.min(arr.length-1,i+18);if(ranges.length&&s<=ranges[ranges.length-1][1]+1)ranges[ranges.length-1][1]=Math.max(ranges[ranges.length-1][1],e);else ranges.push([s,e]);}
  for(const [s,e] of ranges){lines.push(`--- source lines ${s+1}-${e+1} ---`);for(let j=s;j<=e;j++)lines.push(`${String(j+1).padStart(6,' ')} | ${arr[j]}`);}
}
const g=path.join(root,'gyomuon.js');
const arr=fs.readFileSync(g,'utf8').split(/\r?\n/);
lines.push('===== UNIVERSITY LOGO-LIKE FIELDS =====');
for(let i=0;i<arr.length;i++){
  if(/대학.*로고|로고.*대학|university.*logo|logo.*university/i.test(arr[i])){
    const s=Math.max(0,i-8),e=Math.min(arr.length-1,i+12);lines.push(`--- source lines ${s+1}-${e+1}; hit ${i+1} ---`);for(let j=s;j<=e;j++)lines.push(`${String(j+1).padStart(6,' ')} | ${arr[j]}`);
  }
}
fs.writeFileSync(out,lines.join('\n'),'utf8');
console.log(`wrote ${out}`);
