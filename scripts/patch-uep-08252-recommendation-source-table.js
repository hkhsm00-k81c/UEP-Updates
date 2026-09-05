const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const gp=path.join(root,'gyomuon.js'),pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};
must(/APP_VERSION\s*=\s*["']0\.82\.51["']/.test(g),'0.82.51 base not found');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.51["']/,'APP_VERSION = "0.82.52"').replace(/const CURRENT='0\.82\.51';/g,"const CURRENT='0.82.52';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.52';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}
const old="const courseHtml=recommendations.length?recommendations.slice(0,18).map(r=>{const kind=String(r['구분']||'권장과목').trim()||'권장과목';const subjects=String(r['과목']||'').trim();const original=String(r['원문']||'').trim();const value=original||subjects||'공식 자료에 별도 과목 제시 없음';return '<div class=\"uep-uni-detail-line uep-uni-recommend-line\"><b>'+escapeHtml(kind)+'</b><span>'+escapeHtml(value)+(subjects&&original&&subjects!==original?'<small>'+escapeHtml(subjects)+'</small>':'')+'</span></div>';}).join(''):'<div class=\"uep-uni-detail-pending\"><b>공식 권장과목 자료 미연결</b><span>58_권장과목DB에 공식 원문이 연결된 대학만 표시합니다.</span></div>';";
must(g.includes(old),'old recommendation renderer not found');
const neu="const courseHtml=recommendations.length?recommendations.slice(0,60).map(r=>{const kind=String(r['구분']||'관련 교과').trim()||'관련 교과';const unit=String(r['모집단위/계열']||'전체').trim()||'전체';const subjects=String(r['과목']||'').trim();const original=String(r['원문']||'').trim();const isMissing=/미제시/.test(kind)||/별도 제시 없음/.test(subjects+original);const value=subjects||original||'공식 자료에 별도 과목 제시 없음';return '<div class=\"uep-uni-min-row uep-uni-recommend-source-row\"><b>'+escapeHtml(unit)+'</b><span><small>'+escapeHtml(kind)+'</small><br>'+escapeHtml(value)+(original&&subjects&&original!==subjects&&!original.includes(subjects)?'<small>'+escapeHtml(original)+'</small>':'')+(isMissing?'<small>공식 자료 기준</small>':'')+'</span></div>';}).join(''):'<div class=\"uep-uni-detail-pending\"><b>공식 권장과목 자료 미연결</b><span>58_권장과목DB에 공식 원문이 연결된 대학만 표시합니다.</span></div>';";
g=g.replace(old,neu);
g=g.replace('<div class="uep-uni-course-inline"><b>권장과목</b>'+"'+courseHtml+'"+'</div>','<div class="uep-uni-course-inline"><b>모집단위별 관련·권장과목</b>'+"'+courseHtml+'"+'</div>');
// Shared release notes: describe the correction, not another data rewrite.
g=g.replace(/const UEP_08221_RELEASE_NOTES=\[[\s\S]*?\];/,"const UEP_08221_RELEASE_NOTES=['0.82.52 · 권장과목 표시를 58_DB 원문 구조로 수정','모집단위/계열과 관련 교과를 같은 행에서 직접 표시','충북대 등 대학별 전공 연계 자료의 학과-교과 대응관계가 UEP에서 보이도록 수정'];");
fs.writeFileSync(gp,g);
console.log('patched 0.82.52 recommendation source table');
