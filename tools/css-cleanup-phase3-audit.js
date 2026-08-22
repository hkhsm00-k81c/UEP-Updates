const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const outDir=process.argv[3]||'cleanup-phase3-output';
fs.mkdirSync(outDir,{recursive:true});
const cssPath=path.join(appRoot,'resources/app/gyomuon.css');
const jsPath=path.join(appRoot,'resources/app/gyomuon.js');
const htmlPath=path.join(appRoot,'resources/app/index.html');
const css=fs.readFileSync(cssPath,'utf8');
const js=fs.existsSync(jsPath)?fs.readFileSync(jsPath,'utf8'):'';
const html=fs.existsSync(htmlPath)?fs.readFileSync(htmlPath,'utf8'):'';

function parseDecls(body){
  const out=[];
  for(const raw of body.split(';')){
    const i=raw.indexOf(':'); if(i<0) continue;
    const prop=raw.slice(0,i).trim(); const val=raw.slice(i+1).trim();
    if(prop) out.push({prop,val});
  }
  return out;
}
function rules(text){
  const out=[]; const re=/([^{}@]+)\{([^{}]*)\}/g; let m;
  while((m=re.exec(text))){
    const selector=m[1].trim(); if(!selector||selector.includes('@')) continue;
    out.push({selector,body:m[2],start:m.index,end:re.lastIndex,decls:parseDecls(m[2])});
  }
  return out;
}
const all=rules(css);
const groups=new Map();
for(const r of all){if(!groups.has(r.selector))groups.set(r.selector,[]);groups.get(r.selector).push(r)}
const remaining=[...groups.entries()].filter(([,arr])=>arr.length>1);
const results=[];
for(const [selector,arr] of remaining){
  const final=arr[arr.length-1];
  const finalProps=new Set(final.decls.map(d=>d.prop));
  const earlierOnly=new Set();
  for(const r of arr.slice(0,-1)) for(const d of r.decls) if(!finalProps.has(d.prop)) earlierOnly.add(d.prop);
  const betweenRules=all.filter(r=>r.start>arr[0].end && r.start<final.start && r.selector!==selector);
  const conflicts=[];
  for(const prop of earlierOnly){
    const hitters=betweenRules.filter(r=>r.decls.some(d=>d.prop===prop));
    if(hitters.length) conflicts.push({prop,selectors:[...new Set(hitters.map(h=>h.selector))].slice(0,20).join(' | ')});
  }
  const classification=earlierOnly.size===0?'SAFE_COLLAPSE':(conflicts.length===0?'SAFE_MOVE_TO_FINAL':'MANUAL_VISUAL_REVIEW');
  results.push({selector,rules:arr.length,earlierOnly:[...earlierOnly].join('|'),conflictCount:conflicts.length,conflicts:conflicts.map(c=>c.prop+':'+c.selectors).join(' || '),classification});
}

const unused=['input-title-field','growth-guide-details','growth-sdg-legend','selection-hero','selection-subject-summary','selection-kpi-grid','selection-section','selection-error-group','selection-message-list','sdgs-page'];
const unusedTrace=[];
for(const name of unused){
  const esc=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const literal=(js.match(new RegExp(esc,'g'))||[]).length+(html.match(new RegExp(esc,'g'))||[]).length;
  const classList=(js.match(new RegExp(`classList\\.(?:add|remove|toggle|contains)\\([^\\n]{0,120}[\"']${esc}[\"']`,'g'))||[]).length;
  const template=(js.match(new RegExp('`[^`]{0,200}'+esc+'[^`]{0,200}`','g'))||[]).length;
  const query=(js.match(new RegExp(`querySelector(?:All)?\\([^\\n]{0,120}[\"'][^\"']*\\.${esc}`,'g'))||[]).length;
  unusedTrace.push({name,literal,classList,template,query,classification:(literal+classList+template+query)===0?'STRONG_UNUSED_CANDIDATE':'KEEP_OR_REVIEW'});
}
function csv(rows,fields){return [fields.join(','),...rows.map(r=>fields.map(f=>'"'+String(r[f]??'').replaceAll('"','""')+'"').join(','))].join('\n')}
fs.writeFileSync(path.join(outDir,'css-phase3-merge-safety.csv'),csv(results,['selector','rules','earlierOnly','conflictCount','conflicts','classification']));
fs.writeFileSync(path.join(outDir,'css-phase3-unused-trace.csv'),csv(unusedTrace,['name','literal','classList','template','query','classification']));
const report=['# UEP CSS CLEANUP PHASE 3 — STRUCTURAL SAFETY','','## Remaining duplicate selector groups'];
for(const r of results)report.push(`- ${r.selector}: rules=${r.rules}, earlierOnly=${r.earlierOnly||'-'}, conflicts=${r.conflictCount}, ${r.classification}`);
report.push('','## Unused selector trace');
for(const u of unusedTrace)report.push(`- .${u.name}: literal=${u.literal}, classList=${u.classList}, template=${u.template}, query=${u.query}, ${u.classification}`);
report.push('','## Rule','- SAFE_MOVE_TO_FINAL means no intervening rule declares an earlier-only property; it is a conservative candidate for structural collapse.','- MANUAL_VISUAL_REVIEW is not auto-modified.','- STRONG_UNUSED_CANDIDATE is still not deleted automatically; dynamic DOM generation outside literal scans may exist.');
fs.writeFileSync(path.join(outDir,'CSS-CLEANUP-PHASE3-AUDIT.md'),report.join('\n'));
console.log(`PHASE3 COMPLETE duplicates=${results.length} strongUnused=${unusedTrace.filter(x=>x.classification==='STRONG_UNUSED_CANDIDATE').length}`);