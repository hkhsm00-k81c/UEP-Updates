const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const sourcePath=path.join(__dirname,'patch-uep-08291-board-db-write.js');
let source=fs.readFileSync(sourcePath,'utf8');
const broken="host.innerHTML=boards.map(b=>`<article class=\"board-summary-card\"><span>${b['BoardID']||''}</span><strong>${b['설치위치']||((b['학년']||'')+'학년 '+(b['반']||'')+'반')}</strong><small>${String(b['사용여부']||'N')==='Y'?'사용중':'미사용'} · 앱 ${b['앱버전']||'-'} · 마지막 ${b['마지막접속']||'-'}</small></article>`).join('');";
const fixed="host.innerHTML=boards.map(b=>'<article class=\"board-summary-card\"><span>'+String(b['BoardID']||'')+'</span><strong>'+String(b['설치위치']||((b['학년']||'')+'학년 '+(b['반']||'')+'반'))+'</strong><small>'+(String(b['사용여부']||'N')==='Y'?'사용중':'미사용')+' · 앱 '+String(b['앱버전']||'-')+' · 마지막 '+String(b['마지막접속']||'-')+'</small></article>').join('');";
if(!source.includes(broken))throw new Error('0.82.91 patch repair target not found');
source=source.replace(broken,fixed);
const temp=path.join(__dirname,'.patch-uep-08291-fixed.cjs');
fs.writeFileSync(temp,source,'utf8');
try{cp.execFileSync(process.execPath,[temp,...process.argv.slice(2)],{stdio:'inherit'});}finally{try{fs.unlinkSync(temp);}catch{}}
