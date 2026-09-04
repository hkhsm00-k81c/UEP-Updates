const fs=require('fs'),path=require('path');
const g=fs.readFileSync(path.join(process.argv[2]||'app','resources','app','gyomuon.js'),'utf8');
function func(name){const s=g.indexOf('function '+name+'(');if(s<0)return console.log('NO '+name);let b=g.indexOf('{',s),d=0,e=b;for(;e<g.length;e++){if(g[e]==='{')d++;else if(g[e]==='}'&&--d===0){e++;break;}}console.log('\n### '+name+' ###\n'+g.slice(s,e));}
func('uep08223UniversityRegions');
func('uep08223TodayNav');
func('openDashboardUniversityDetail');
for(const n of ['uep-uni-result-card','uep-uni-summary-section','uep-uni-admission-card']){let i=g.indexOf(n);console.log('\n### '+n+' ###\n'+g.slice(Math.max(0,i-1600),Math.min(g.length,i+2600)));}
