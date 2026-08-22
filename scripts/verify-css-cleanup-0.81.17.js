const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const cssPath=path.join(appRoot,'resources/app/gyomuon.css');
const css=fs.readFileSync(cssPath,'utf8');

const unusedClasses=['input-title-field','growth-guide-details','growth-sdg-legend','selection-hero','selection-subject-summary','selection-kpi-grid','selection-section','selection-error-group','selection-message-list','sdgs-page'];
const protectedOverrides=['.input-method-row','.input-method-row>b','.input-center-compact-setup label','.dashboard-report-program-row','.growth-sdg-detail article','.curriculum-filter-bar .record-class-cards'];

function norm(s){return s.replace(/\s+/g,' ').trim();}
function scanRules(text){
  const rules=[];let i=0;
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
    const open=text.indexOf('{',i);if(open<0)break;
    const selector=norm(text.slice(i,open));let d=1,j=open+1,q=null,comment=false;
    for(;j<text.length&&d;j++){
      if(comment){if(text[j-1]==='*'&&text[j]==='/')comment=false;continue;}
      if(!q&&text[j]==='/'&&text[j+1]==='*'){comment=true;j++;continue;}
      if(q){if(text[j]==='\\')j++;else if(text[j]===q)q=null;continue;}
      if(text[j]==='"'||text[j]==="'"){q=text[j];continue;}
      if(text[j]==='{')d++;else if(text[j]==='}')d--;
    }
    if(selector)rules.push({selector});
    i=j;
  }
  return rules;
}
function hasClass(selector,name){
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp('(^|[^A-Za-z0-9_-])\\.'+escaped+'(?![A-Za-z0-9_-])').test(selector);
}
const rules=scanRules(css);
const failures=[];
for(const name of unusedClasses){
  const hits=rules.filter(r=>hasClass(r.selector,name));
  console.log(`CHECK unused selector ${name} = ${hits.length===0}`);
  if(hits.length)failures.push(`unused selector remains: ${name} (${hits.map(h=>h.selector).join(' | ')})`);
}
for(const selector of protectedOverrides){
  const count=rules.filter(r=>r.selector===norm(selector)).length;
  console.log(`CHECK protected override ${selector} count=${count} = ${count>=2}`);
  if(count<2)failures.push(`protected override group lost: ${selector} count=${count}`);
}
console.log(`CHECK CSS chars = ${css.length}`);
if(css.length>=40019)failures.push(`CSS was not reduced: ${css.length}`);
if(css.length<=30000)failures.push(`CSS reduction unexpectedly large: ${css.length}`);
if(failures.length){
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('UEP 0.81.17 structural CSS verification passed.');
