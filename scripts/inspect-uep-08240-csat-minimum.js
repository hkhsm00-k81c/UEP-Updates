const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const base=path.join(root,'resources','app');
const needles=['admissionMinimums','54_수능최저DB','수능최저원문','등급합기준','반영영역수','탐구반영과목수','영어별도기준'];
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()){if(!['node_modules'].includes(e.name))walk(p,out);}else if(/\.(js|cjs|mjs)$/.test(e.name))out.push(p);}return out;}
for(const file of walk(base)){
  let g;try{g=fs.readFileSync(file,'utf8')}catch{continue}
  const hits=needles.filter(n=>g.includes(n)); if(!hits.length)continue;
  console.log(`\n\n######## FILE ${path.relative(base,file)} | ${hits.join(', ')} ########`);
  for(const n of hits){let i=0,hit=0;while((i=g.indexOf(n,i))>=0){hit++;const s=Math.max(0,i-3500),e=Math.min(g.length,i+6500);console.log(`\n===== ${n} #${hit} @${i} =====\n${g.slice(s,e)}\n`);i+=n.length;if(hit>=15)break;}}
}
