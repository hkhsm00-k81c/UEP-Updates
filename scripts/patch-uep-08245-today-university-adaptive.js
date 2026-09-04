const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app',gp=path.join(root,'resources','app','gyomuon.js'),pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};
must(/APP_VERSION\s*=\s*["']0\.82\.44["']/.test(g),'0.82.44 base not found');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.44["']/,'APP_VERSION = "0.82.45"').replace(/const CURRENT='0\.82\.44';/g,"const CURRENT='0.82.45';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.45';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}

const admissionRe=/const admissionHtml=admissions\.length\?[\s\S]*?:'<p>대학별 전형구조 자료를 연결 중입니다\.<\/p>';\s*/;
must(admissionRe.test(g),'admission renderer not found');
g=g.replace(admissionRe,()=>"const admissionHtml=admissions.length?admissions.slice(0,18).flatMap(r=>{const raw=String(r['전형명']||r['전형유형']||r['대전형']||'전형명 확인').trim();const names=raw.includes('·')?raw.split('·').map(v=>v.trim()).filter(Boolean):[raw];return names.map(name=>'<article class=\\\"uep-uni-admission-card\\\"><div class=\\\"uep-uni-badges\\\">'+uep08223UniversityBadges(r)+'</div><h4>'+escapeHtml(name)+'</h4><p>'+escapeHtml(r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r))+'</p></article>');}).join(''):'<p>대학별 전형구조 자료를 연결 중입니다.</p>';\n  ");

must(g.includes('const minHtml=minimums.length?'),'existing minimum renderer missing');
g+=`\n/* UEP_08245_ADAPTIVE */\n(function(){const s=document.createElement('style');s.textContent='.uep-uni-admission-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))!important;gap:12px!important}.uep-uni-summary-section{grid-template-columns:minmax(390px,.4fr) minmax(0,.6fr)!important}.uep-uni-detail-line{grid-template-columns:132px minmax(0,1fr)!important;column-gap:10px!important}.uep-uni-detail-line>b{white-space:nowrap!important}.uep-uni-minimum-card .uep-uni-detail-stack{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px 12px!important}.uep-uni-min-row{display:grid!important;grid-template-columns:minmax(120px,.42fr) minmax(0,.58fr)!important;align-items:start!important;gap:8px!important;padding:9px 10px!important;border:1px solid #e6edf5!important;border-radius:10px!important;background:#fbfdff!important}.uep-uni-min-row>b{line-height:1.35!important}.uep-uni-min-row span{min-width:0!important;line-height:1.35!important}.uep-uni-course-inline{margin-top:10px!important;padding-top:10px!important}@media(max-width:1180px){.uep-uni-summary-section{grid-template-columns:1fr!important}.uep-uni-minimum-card .uep-uni-detail-stack{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:820px){.uep-uni-minimum-card .uep-uni-detail-stack{grid-template-columns:1fr!important}}';document.head.appendChild(s);})();\n`;
must(g.includes('UEP_08245_ADAPTIVE'),'adaptive css missing');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.45 patch PASS');
