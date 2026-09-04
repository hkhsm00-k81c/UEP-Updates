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

const minRe=/const minHtml=minimums\.length\?[\s\S]*?:'<div class=\\\"uep-uni-detail-pending\\\"><b>모집단위별 기준 검증중<\/b><span>공식 원문 숫자가 확인된 기준만 표시합니다\.<\/span><\/div>';\s*/;
must(minRe.test(g),'minimum renderer not found');
g=g.replace(minRe,()=>"const minHtml=minimums.length?minimums.slice(0,18).map(r=>{const unit=String(r['모집단위']||'모집단위').trim(),type=String(r['전형유형']||'').trim(),track=String(r['전형명']||'').trim(),meta=(type&&track&&type!==track)?type+' · '+track:(track||type);return '<div class=\\\"uep-uni-min-row\\\"><b>'+escapeHtml(unit)+'</b><span>'+(meta?'<small>'+escapeHtml(meta)+'</small>':'')+'<em>'+escapeHtml(r['수능최저원문']||'')+'</em></span></div>';}).join(''):'<div class=\\\"uep-uni-detail-pending\\\"><b>모집단위별 기준 검증중</b><span>공식 원문 숫자가 확인된 기준만 표시합니다.</span></div>';\n  ");

g+=`\n/* UEP_08245_ADAPTIVE */\n(function(){const s=document.createElement('style');s.textContent='.uep-uni-admission-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))!important;gap:12px!important}.uep-uni-summary-section{grid-template-columns:minmax(360px,.42fr) minmax(0,.58fr)!important}.uep-uni-detail-line{grid-template-columns:120px minmax(0,1fr)!important}.uep-uni-detail-line>b{white-space:nowrap!important}.uep-uni-minimum-card .uep-uni-detail-stack{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px 12px!important}.uep-uni-min-row{display:grid!important;grid-template-columns:minmax(120px,.42fr) minmax(0,.58fr)!important;gap:8px!important;padding:9px 10px!important;border:1px solid #e6edf5!important;border-radius:10px!important}.uep-uni-min-row span{display:flex!important;flex-direction:column!important;gap:3px!important}.uep-uni-min-row small{font-weight:700!important;color:#27618f!important}.uep-uni-min-row em{font-style:normal!important}.uep-uni-course-inline{margin-top:10px!important;padding-top:10px!important}@media(max-width:1180px){.uep-uni-summary-section{grid-template-columns:1fr!important}}@media(max-width:820px){.uep-uni-minimum-card .uep-uni-detail-stack{grid-template-columns:1fr!important}}';document.head.appendChild(s);})();\n`;
must(g.includes('UEP_08245_ADAPTIVE'),'adaptive css missing');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.45 patch PASS');
