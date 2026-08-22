const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
const text=fs.readFileSync(file,'utf8');
const patterns={render:/\brender\s*\(/g,cacheRefresh:/refreshReadonlyCacheSilently\s*\(/g,loadData:/\bloadData\s*\(/g,setInterval:/\bsetInterval\s*\(/g,setTimeout:/\bsetTimeout\s*\(/g,mutationObserver:/new\s+MutationObserver\s*\(/g,queryAll:/querySelectorAll\s*\(/g};
const counts={};for(const [k,r] of Object.entries(patterns))counts[k]=(text.match(r)||[]).length;
const funcs=[];const re=/function\s+([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{/g;let m;
while((m=re.exec(text))){let i=text.indexOf('{',m.index),d=1,q=null,com=null,end=-1;for(let j=i+1;j<text.length;j++){const c=text[j],n=text[j+1];if(com==='line'){if(c==='\n')com=null;continue}if(com==='block'){if(c==='*'&&n==='/'){com=null;j++}continue}if(q){if(c==='\\'){j++;continue}if(c===q)q=null;continue}if(c==='/'&&n==='/'){com='line';j++;continue}if(c==='/'&&n==='*'){com='block';j++;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')d++;else if(c==='}'&&--d===0){end=j;break}}if(end<0)continue;const b=text.slice(m.index,end+1);const score=(b.match(/\brender\s*\(/g)||[]).length*5+(b.match(/refreshReadonlyCacheSilently\s*\(/g)||[]).length*7+(b.match(/querySelectorAll\s*\(/g)||[]).length*2+(b.match(/setInterval\s*\(/g)||[]).length*4+(b.match(/new\s+MutationObserver/g)||[]).length*6;if(score)funcs.push({name:m[1],chars:b.length,score,renders:(b.match(/\brender\s*\(/g)||[]).length,cacheRefreshes:(b.match(/refreshReadonlyCacheSilently\s*\(/g)||[]).length,queryAll:(b.match(/querySelectorAll\s*\(/g)||[]).length,timers:(b.match(/setInterval\s*\(/g)||[]).length,observers:(b.match(/new\s+MutationObserver/g)||[]).length});re.lastIndex=end+1}
funcs.sort((a,b)=>b.score-a.score||b.chars-a.chars);
const report={counts,topHotspots:funcs.slice(0,25),note:'Static prioritization only; no production code modified.'};
fs.mkdirSync('performance-phase3-output',{recursive:true});fs.writeFileSync('performance-phase3-output/render-refresh-hotspots.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
