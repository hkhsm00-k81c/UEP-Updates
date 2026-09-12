const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const out=path.resolve(process.argv[3]||'audit/uep-08286-menu-focus.txt');
const files=[
  path.join(root,'gyomuon.js'),
  path.join(root,'electron','main.cjs')
];
function read(p){return fs.readFileSync(p,'utf8');}
function rel(p){return path.relative(root,p).replace(/\\/g,'/');}
function esc(s){return s.replace(/\r/g,'').replace(/\u0000/g,'');}
function snippets(text,needle,radius=1000,max=8){
  const found=[]; let from=0;
  while(found.length<max){
    const i=text.indexOf(needle,from); if(i<0)break;
    const a=Math.max(0,i-radius), b=Math.min(text.length,i+needle.length+radius);
    found.push({i,a,b,s:text.slice(a,b)}); from=i+needle.length;
  }
  return found;
}
let report=[];
report.push('UEP v0.82.86 focused menu/routing audit');
report.push('Source: actual Release asset UEP-update.zip');
const pkg=JSON.parse(read(path.join(root,'package.json')));
report.push(`package.version=${pkg.version}`);
const patterns=['대시보드','학생정보','프로그램','생활기록부','입시','대입','전자칠판','data-page','nav-item','sidebar','menu-item','setPage','showPage','navigate','route','openExternal','shell.openExternal','window.open','location.href'];
for(const file of files){
  if(!fs.existsSync(file))throw new Error('missing '+file);
  const text=read(file);
  report.push(`\n===== FILE ${rel(file)} bytes=${Buffer.byteLength(text)} =====`);
  for(const pat of patterns){
    const hits=snippets(text,pat);
    if(!hits.length)continue;
    report.push(`\n--- ${pat} hits=${hits.length}${hits.length===8?' (capped)':''} ---`);
    hits.forEach((h,n)=>{
      report.push(`\n[${n+1}] char=${h.i} range=${h.a}-${h.b}`);
      report.push(esc(h.s));
    });
  }
}
// Also list app text filenames that contain likely board/menu terms, without dumping whole files.
const exts=new Set(['.js','.cjs','.mjs','.json','.html','.css']);
function walk(d,arr=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,arr);else if(exts.has(path.extname(e.name).toLowerCase()))arr.push(p);}return arr;}
report.push('\n===== FILE HIT SUMMARY =====');
for(const f of walk(root)){
  let t; try{t=read(f)}catch{continue}
  const hs=['전자칠판','board','kiosk','display','NFC','data-page','nav-item'].filter(x=>t.includes(x));
  if(hs.length)report.push(`${rel(f)} :: ${hs.join(', ')}`);
}
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,report.join('\n'),'utf8');
console.log(`wrote ${out} (${fs.statSync(out).size} bytes)`);