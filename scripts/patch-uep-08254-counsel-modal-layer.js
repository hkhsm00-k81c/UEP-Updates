const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const gp=path.join(root,'gyomuon.js'),pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};
must(/APP_VERSION\s*=\s*["']0\.82\.53["']/.test(g),'0.82.53 base not found');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.53["']/,'APP_VERSION = "0.82.54"').replace(/const CURRENT='0\.82\.53';/g,"const CURRENT='0.82.54';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.54';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}
const old="layer.className='counsel-reason-layer uep-admission-counsel-editor-layer';";
must(g.includes(old),'counsel editor layer anchor not found');
const neu="layer.className='counsel-reason-layer uep-admission-counsel-editor-layer';layer.style.position='fixed';layer.style.inset='0';layer.style.zIndex='2147483000';";
g=g.replace(old,neu);
// keep editor above the Today University modal and its backdrop without changing the parent modal lifecycle.
g=g.replace(/const UEP_08221_RELEASE_NOTES=\[[\s\S]*?\];/,"const UEP_08221_RELEASE_NOTES=['0.82.54 · 상담포인트 편집 팝업 레이어 수정','오늘의 대학 팝업 위에 상담포인트 관리창이 정상 표시되도록 z-order 수정','0.82.53 공간 재배치·권장과목 상태구분·상담포인트 DB 기능 유지'];");
fs.writeFileSync(gp,g);
console.log('patched 0.82.54 counsel modal layer');
