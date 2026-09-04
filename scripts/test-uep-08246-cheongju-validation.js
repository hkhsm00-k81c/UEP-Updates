const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app',gp=path.join(root,'resources','app','gyomuon.js'),pp=path.join(root,'resources','app','package.json');
const g=fs.readFileSync(gp,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};
must(/APP_VERSION\s*=\s*["']0\.82\.46["']/.test(g),'APP_VERSION 0.82.46 missing');
must(g.includes('UEP_08245_ADAPTIVE'),'0.82.45 layout regression');
must(g.includes('UEP_08246_CHEONGJU_VALIDATED'),'0.82.46 marker missing');
must(g.includes("raw.includes('·')?raw.split('·')"),'middle-dot track presentation missing');
must(!g.includes("raw.includes('/')?raw.split('/')"),'slash must not be split');
must(g.includes("badges.push('<span>'+escapeHtml(major)+'</span>')"),'major admission badge missing');
must(g.includes("badges.push('<span>최저 일부</span>')"),'partial minimum badge missing');
must(g.includes("badges.push('<span>최저 없음</span>')"),'no-minimum badge missing');
must(g.includes("if(/면접/.test(method))"),'interview badge must be per track');
must(g.includes('const minHtml=minimums.length?'),'minimum renderer missing');
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));must(p.version==='0.82.46','package version mismatch');}
console.log('UEP 0.82.46 validation PASS');
