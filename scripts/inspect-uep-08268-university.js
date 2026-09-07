const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app/resources/app';
const out=process.argv[3]||'inspection-08268-university.txt';
const targets=[
  path.join(root,'gyomuon.js'),
  path.join(root,'electron','google-data.cjs')
];
const needles=[
  '오늘의 대학','주요 전형과 선발방식','내신성적 산출방법','모집단위별 수능최저','권장과목','관련·권장과목','운호고 실제 입결',
  'university','University','admission','수능최저DB','내신산정DB','권장과목DB','입결DB'
];
const lines=[];
for(const file of targets){
  lines.push(`===== FILE ${file} =====`);
  if(!fs.existsSync(file)){lines.push('MISSING');continue;}
  const text=fs.readFileSync(file,'utf8');
  const arr=text.split(/\r?\n/);
  const hits=[];
  for(let i=0;i<arr.length;i++){
    if(needles.some(n=>arr[i].includes(n))) hits.push(i);
  }
  const ranges=[];
  for(const i of hits){
    const s=Math.max(0,i-18),e=Math.min(arr.length-1,i+28);
    if(ranges.length&&s<=ranges[ranges.length-1][1]+2) ranges[ranges.length-1][1]=Math.max(ranges[ranges.length-1][1],e);
    else ranges.push([s,e]);
  }
  lines.push(`HITS ${hits.length} RANGES ${ranges.length}`);
  for(const [s,e] of ranges){
    lines.push(`--- lines ${s+1}-${e+1} ---`);
    for(let j=s;j<=e;j++) lines.push(`${String(j+1).padStart(6,' ')} | ${arr[j]}`);
  }
}
fs.writeFileSync(out,lines.join('\n'),'utf8');
console.log(`wrote ${out}`);
