const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const out=path.resolve(process.argv[3]||'audit/uep-08286-menu-focus.txt');
function read(p){return fs.readFileSync(p,'utf8');}
function rel(p){return path.relative(root,p).replace(/\\/g,'/');}
function clean(s){return s.replace(/\r/g,'').replace(/\u0000/g,'');}
function around(text,needle,before=900,after=1800){const i=text.indexOf(needle);if(i<0)return null;const a=Math.max(0,i-before),b=Math.min(text.length,i+needle.length+after);return {i,s:text.slice(a,b)};}
function allTextFiles(dir,arr=[]){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(e.name==='node_modules'||e.name==='.git')continue;
    const p=path.join(dir,e.name);
    if(e.isDirectory())allTextFiles(p,arr);
    else if(/\.(?:js|cjs|mjs|json|html|css)$/i.test(e.name))arr.push(p);
  }
  return arr;
}
const gy=path.join(root,'gyomuon.js');
const main=path.join(root,'electron','main.cjs');
const pkg=JSON.parse(read(path.join(root,'package.json')));
if(!fs.existsSync(gy)||!fs.existsSync(main))throw new Error('required app source missing');
const g=read(gy),m=read(main);
let report=['UEP v0.82.86 TARGETED MENU/ROUTING AUDIT','Source: actual Release asset UEP-update.zip',`package.version=${pkg.version}`];
function add(title,text,needle,b=900,a=1800){const hit=around(text,needle,b,a);report.push(`\n===== ${title} =====`);if(!hit){report.push('NOT FOUND');return;}report.push(`char=${hit.i}`);report.push(clean(hit.s));}
add('GYOMUON allowedPages',g,'const allowedPages = new Set(',300,1200);
add('GYOMUON navigate function',g,'function navigate(',500,6500);
add('GYOMUON render function',g,'function render(',500,5000);
add('GYOMUON data-page event binding',g,'[data-page]',800,2600);
add('MAIN openExternal',m,'openExternal',1200,3000);
add('MAIN shell.openExternal',m,'shell.openExternal',1200,3000);
report.push('\n===== FILES CONTAINING data-page / nav / sidebar =====');
for(const f of allTextFiles(root)){
  let t;try{t=read(f)}catch{continue}
  const keys=['data-page','nav-item','sidebar'];const hits=keys.filter(k=>t.includes(k));
  if(hits.length)report.push(`${rel(f)} :: ${hits.join(', ')}`);
}
report.push('\n===== EXACT MENU MARKUP SNIPPETS =====');
let emitted=0;
for(const f of allTextFiles(root)){
  if(emitted>=12)break;
  let t;try{t=read(f)}catch{continue}
  for(const needle of ['data-page="dashboard"',"data-page='dashboard'",'data-page="students"',"data-page='students'",'>대시보드<','>학생정보<']){
    if(emitted>=12)break;
    const h=around(t,needle,1000,3500);if(!h)continue;
    report.push(`\n--- ${rel(f)} needle=${needle} char=${h.i} ---`);report.push(clean(h.s));emitted++;
  }
}
report.push('\n===== BOARD / ELECTRONIC BOARD REFERENCES =====');
let boardCount=0;
for(const f of allTextFiles(root)){
  if(boardCount>=20)break;
  let t;try{t=read(f)}catch{continue}
  for(const needle of ['전자칠판','schoolBoard','board','kiosk']){
    if(boardCount>=20)break;
    const h=around(t,needle,500,1200);if(!h)continue;
    report.push(`\n--- ${rel(f)} needle=${needle} char=${h.i} ---`);report.push(clean(h.s));boardCount++;
  }
}
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,report.join('\n'),'utf8');
console.log(`wrote ${out} (${fs.statSync(out).size} bytes)`);