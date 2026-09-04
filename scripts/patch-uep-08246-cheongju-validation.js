const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app',gp=path.join(root,'resources','app','gyomuon.js'),pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};
must(/APP_VERSION\s*=\s*["']0\.82\.45["']/.test(g),'0.82.45 base not found');
must(g.includes('UEP_08245_ADAPTIVE'),'0.82.45 adaptive marker not found');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.45["']/,'APP_VERSION = "0.82.46"').replace(/const CURRENT='0\.82\.45';/g,"const CURRENT='0.82.46';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.46';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}

const admissionRe=/const admissionHtml=admissions\.length\?[\s\S]*?:'<p>대학별 전형구조 자료를 연결 중입니다\.<\/p>';\s*/;
must(admissionRe.test(g),'admission renderer not found');
const renderer="const admissionHtml=admissions.length?admissions.slice(0,18).flatMap(r=>{const raw=String(r['전형명']||r['전형유형']||r['대전형']||'전형명 확인').trim();const names=raw.includes('·')?raw.split('·').map(v=>v.trim()).filter(Boolean):[raw];const major=String(r['대전형']||r['전형유형']||'').trim();const method=String(r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r)||'').trim();const minimum=String(r['수능최저']||r['수능최저원문']||'').trim();const badges=[];if(major)badges.push('<span>'+escapeHtml(major)+'</span>');if(/면접/.test(method))badges.push('<span>면접</span>');if(minimum){if(/미적용|없음|해당없음/.test(minimum))badges.push('<span>최저 없음</span>');else if(/학과만|일부|특정/.test(minimum))badges.push('<span>최저 일부</span>');else badges.push('<span>최저 O</span>');}return names.map(name=>'<article class=\\\"uep-uni-admission-card\\\"><div class=\\\"uep-uni-badges\\\">'+badges.join('')+'</div><h4>'+escapeHtml(name)+'</h4><p>'+escapeHtml(method)+'</p></article>');}).join(''):'<p>대학별 전형구조 자료를 연결 중입니다.</p>';\n  ";
g=g.replace(admissionRe,()=>renderer);

must(g.includes('const minHtml=minimums.length?'),'minimum renderer missing');
g+='\n/* UEP_08246_CHEONGJU_VALIDATED: 53B track rows + 54 slash semantics + 57 curriculum exception */\n';
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.46 patch PASS');
