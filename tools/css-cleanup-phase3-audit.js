const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const outDir=process.argv[3]||'cleanup-phase3-output';
const baselineCsv=process.argv[4]||path.join(outDir,'baseline','css-duplicate-groups.csv');
fs.mkdirSync(outDir,{recursive:true});
const cssPath=path.join(appRoot,'resources/app/gyomuon.css');
const jsPath=path.join(appRoot,'resources/app/gyomuon.js');
const htmlPath=path.join(appRoot,'resources/app/index.html');
const css=fs.readFileSync(cssPath,'utf8');
const js=fs.existsSync(jsPath)?fs.readFileSync(jsPath,'utf8'):'';
const html=fs.existsSync(htmlPath)?fs.readFileSync(htmlPath,'utf8'):'';

function parseCsv(text){
  const rows=[]; let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(q&&text[i+1]==='"'){cur+='"';i++;}else q=!q;}
    else if(c===','&&!q){row.push(cur);cur='';}
    else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cur);cur='';if(row.some(x=>x!==''))rows.push(row);row=[];}
    else cur+=c;
  }
  if(cur||row.length){row.push(cur);rows.push(row)}
  if(!rows.length)return [];
  const h=rows[0]; return rows.slice(1).map(a=>Object.fromEntries(h.map((k,i)=>[k,a[i]??''])));
}
function parseDecls(body){
  const clean=body.replace(/\/\*[\s\S]*?\*\//g,''); const out=[];
  for(const raw of clean.split(';')){const i=raw.indexOf(':');if(i<0)continue;const prop=raw.slice(0,i).trim();const val=raw.slice(i+1).trim();if(prop)out.push({prop,val});}
  return out;
}
function lineAt(i){return 1+(css.slice(0,i).match(/\n/g)||[]).length}
function scanRules(text){
  const rules=[]; let i=0;
  while(i<text.length){
    while(i<text.length&&/\s/.test(text[i]))i++;
    if(i>=text.length)break;
    if(text.startsWith('/*',i)){const e=text.indexOf('*/',i+2);i=e<0?text.length:e+2;continue;}
    if(text[i]==='@'){
      const open=text.indexOf('{',i),semi=text.indexOf(';',i);
      if(semi>=0&&(open<0||semi<open)){i=semi+1;continue;}
      if(open<0)break;
      let d=1,j=open+1,q=null,comment=false;
      for(;j<text.length&&d;j++){
        if(comment){if(text[j-1]==='*'&&text[j]==='/')comment=false;continue;}
        if(!q&&text[j]==='/'&&text[j+1]==='*'){comment=true;j++;continue;}
        if(q){if(text[j]==='\\')j++;else if(text[j]===q)q=null;continue;}
        if(text[j]==='"'||text[j]==="'"){q=text[j];continue;}
        if(text[j]==='{')d++;else if(text[j]==='}')d--;
      }
      i=j;continue;
    }
    const open=text.indexOf('{',i); if(open<0)break;
    const selector=text.slice(i,open).trim(); let d=1,j=open+1,q=null;
    for(;j<text.length&&d;j++){
      if(q){if(text[j]==='\\')j++;else if(text[j]===q)q=null;continue;}
      if(text[j]==='"'||text[j]==="'"){q=text[j];continue;}
      if(text[j]==='{')d++;else if(text[j]==='}')d--;
    }
    if(selector)rules.push({selector:selector.replace(/\s+/g,' ').trim(),body:text.slice(open+1,j-1),start:i,end:j,line:lineAt(i),decls:parseDecls(text.slice(open+1,j-1))});
    i=j;
  }
  return rules;
}
const baseline=parseCsv(fs.readFileSync(baselineCsv,'utf8')).filter(r=>r.context==='root'&&Number(r.count)>1);
const expected=baseline.map(r=>r.selector.replace(/\s+/g,' ').trim());
const all=scanRules(css);
const results=[];
for(const selector of expected){
  const arr=all.filter(r=>r.selector===selector);
  if(arr.length<2)throw new Error(`Phase3 baseline mismatch for ${selector}: expected duplicate, found ${arr.length}`);
  const final=arr[arr.length-1];
  const finalProps=new Set(final.decls.map(d=>d.prop));
  const earlierOnly=new Set();
  for(const r of arr.slice(0,-1))for(const d of r.decls)if(!finalProps.has(d.prop))earlierOnly.add(d.prop);
  const between=all.filter(r=>r.start>arr[0].end&&r.start<final.start&&r.selector!==selector);
  const conflicts=[];
  for(const prop of earlierOnly){const hitters=between.filter(r=>r.decls.some(d=>d.prop===prop));if(hitters.length)conflicts.push({prop,selectors:[...new Set(hitters.map(h=>h.selector))].join(' | ')});}
  const classification=earlierOnly.size===0?'SAFE_COLLAPSE':(conflicts.length===0?'SAFE_MOVE_TO_FINAL':'MANUAL_VISUAL_REVIEW');
  results.push({selector,rules:arr.length,baselineCount:Number(baseline.find(x=>x.selector===selector).count),earlierOnly:[...earlierOnly].join('|'),conflictCount:conflicts.length,conflicts:conflicts.map(c=>c.prop+':'+c.selectors).join(' || '),classification});
}
if(results.length!==baseline.length)throw new Error(`Phase3 coverage mismatch ${results.length}/${baseline.length}`);

const unused=['input-title-field','growth-guide-details','growth-sdg-legend','selection-hero','selection-subject-summary','selection-kpi-grid','selection-section','selection-error-group','selection-message-list','sdgs-page'];
const unusedTrace=[];
for(const name of unused){
  const esc=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const runtime=js+'\n'+html;
  const literal=(runtime.match(new RegExp(esc,'g'))||[]).length;
  const classList=(js.match(new RegExp(`classList\\.(?:add|remove|toggle|contains)\\([^\\n]{0,160}[\"']${esc}[\"']`,'g'))||[]).length;
  const template=(js.match(new RegExp('`[^`]{0,300}'+esc+'[^`]{0,300}`','g'))||[]).length;
  const query=(js.match(new RegExp(`querySelector(?:All)?\\([^\\n]{0,160}[\"'][^\"']*\\.${esc}`,'g'))||[]).length;
  const innerHtml=(js.match(new RegExp(`(?:innerHTML|insertAdjacentHTML)[^\n]{0,500}${esc}`,'g'))||[]).length;
  unusedTrace.push({name,literal,classList,template,query,innerHtml,classification:(literal+classList+template+query+innerHtml)===0?'STRONG_UNUSED_CANDIDATE':'KEEP_OR_REVIEW'});
}
function csv(rows,fields){return [fields.join(','),...rows.map(r=>fields.map(f=>'"'+String(r[f]??'').replaceAll('"','""')+'"').join(','))].join('\n')}
fs.writeFileSync(path.join(outDir,'css-phase3-merge-safety.csv'),csv(results,['selector','rules','baselineCount','earlierOnly','conflictCount','conflicts','classification']));
fs.writeFileSync(path.join(outDir,'css-phase3-unused-trace.csv'),csv(unusedTrace,['name','literal','classList','template','query','innerHtml','classification']));
const report=['# UEP CSS CLEANUP PHASE 3 — BASELINE-ALIGNED STRUCTURAL SAFETY','',`- baseline duplicate groups: ${baseline.length}`,`- analyzed duplicate groups: ${results.length}`,'','## Actual post-phase2 duplicate selector groups'];
for(const r of results)report.push(`- ${r.selector}: rules=${r.rules}, earlierOnly=${r.earlierOnly||'-'}, conflicts=${r.conflictCount}, ${r.classification}`);
report.push('','## Unused selector trace');
for(const u of unusedTrace)report.push(`- .${u.name}: literal=${u.literal}, classList=${u.classList}, template=${u.template}, query=${u.query}, innerHtml=${u.innerHtml}, ${u.classification}`);
report.push('','## Rule','- The only merge candidates analyzed are selectors emitted by the actual post-phase2 CSS audit.','- SAFE_MOVE_TO_FINAL / SAFE_COLLAPSE are candidates only; MANUAL_VISUAL_REVIEW is never auto-modified.','- STRONG_UNUSED_CANDIDATE is not deleted automatically.');
fs.writeFileSync(path.join(outDir,'CSS-CLEANUP-PHASE3-AUDIT.md'),report.join('\n'));
console.log(`PHASE3 COMPLETE baseline=${baseline.length} safe=${results.filter(x=>x.classification!=='MANUAL_VISUAL_REVIEW').length} strongUnused=${unusedTrace.filter(x=>x.classification==='STRONG_UNUSED_CANDIDATE').length}`);