const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app/resources/app';
const out=process.argv[3]||'inspection-08268-university.txt';
const targets=[
  path.join(root,'gyomuon.js'),
  path.join(root,'electron','google-data.cjs')
];
const needles=[
  '오늘의 대학',
  '주요 전형과 선발방식',
  '내신성적 산출방법',
  '모집단위별 수능최저',
  '모집단위별 관련·권장과목',
  '관련·권장과목',
  '운호고 실제 입결'
];
const lines=[];
for(const file of targets){
  lines.push(`===== FILE ${file} =====`);
  if(!fs.existsSync(file)){lines.push('MISSING');continue;}
  const arr=fs.readFileSync(file,'utf8').split(/\r?\n/);
  for(const needle of needles){
    const hits=[];
    for(let i=0;i<arr.length;i++) if(arr[i].includes(needle)) hits.push(i);
    lines.push(`=== NEEDLE ${needle} / HITS ${hits.length} ===`);
    for(const i of hits.slice(0,12)){
      const s=Math.max(0,i-32),e=Math.min(arr.length-1,i+48);
      lines.push(`--- source lines ${s+1}-${e+1}; hit ${i+1} ---`);
      for(let j=s;j<=e;j++) lines.push(`${String(j+1).padStart(6,' ')} | ${arr[j]}`);
    }
  }
}
fs.writeFileSync(out,lines.join('\n'),'utf8');
console.log(`wrote ${out}`);
