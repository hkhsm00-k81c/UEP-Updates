const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
let text=fs.readFileSync(file,'utf8');

const targets=[
  ['#settingsDiagnosticsButton','settingsDiagnostics'],
  ['#settingsInfoButton','settingsInfo'],
  ['#fiveGradeApply','fiveGradeApply'],
  ['#fiveGradeEnrollment','fiveGradeEnrollment'],
  ['#officialAttendanceAdd','officialAttendanceAdd'],
  ['#lateAttendanceAdd','lateAttendanceAdd'],
  ['#scoreQueryButton','scoreQueryButton'],
  ['#admissionQueryButton','admissionQueryButton'],
  ['#dutyReset','dutyReset']
];

function findCallEnd(s,start){
  let depth=1,q=null,comment=null;
  for(let i=start;i<s.length;i++){
    const c=s[i],n=s[i+1];
    if(comment==='line'){if(c==='\n')comment=null;continue;}
    if(comment==='block'){if(c==='*'&&n==='/'){comment=null;i++;}continue;}
    if(q){if(c==='\\'){i++;continue;}if(c===q)q=null;continue;}
    if(c==='/'&&n==='/'){comment='line';i++;continue;}
    if(c==='/'&&n==='*'){comment='block';i++;continue;}
    if(c==='"'||c==="'"||c==='`'){q=c;continue;}
    if(c==='(')depth++;
    else if(c===')'&&--depth===0)return i;
  }
  return -1;
}

const marker='function uepBindOnce(el,key,event,handler)';
if(!text.includes(marker)){
  const bindIndex=text.indexOf('function bindPage(');
  if(bindIndex<0)throw new Error('bindPage declaration not found');
  const helper="function uepBindOnce(el,key,event,handler){if(!el)return false;const attr='uepBound'+key;if(el.dataset[attr])return false;el.dataset[attr]='1';el.addEventListener(event,handler);return true;}\n";
  text=text.slice(0,bindIndex)+helper+text.slice(bindIndex);
}

const report=[];
for(const [selector,key] of targets){
  const needles=[`$(\"${selector}\")?.addEventListener(`,`$('${selector}')?.addEventListener(`];
  let pos=-1,needle='';
  for(const n of needles){pos=text.indexOf(n);if(pos>=0){needle=n;break;}}
  if(pos<0){report.push({selector,key,status:'NOT_FOUND'});continue;}
  const argsStart=pos+needle.length;
  const end=findCallEnd(text,argsStart);
  if(end<0)throw new Error(`Unable to parse addEventListener call for ${selector}`);
  const expr=needle.slice(0,needle.indexOf('?.addEventListener'));
  const args=text.slice(argsStart,end);
  const replacement=`uepBindOnce(${expr},\"${key}\",${args})`;
  text=text.slice(0,pos)+replacement+text.slice(end+1);
  report.push({selector,key,status:'PATCHED'});
}

const patched=report.filter(x=>x.status==='PATCHED');
if(patched.length!==targets.length)throw new Error(`Expected ${targets.length} bindings patched, got ${patched.length}: ${JSON.stringify(report)}`);
for(const [selector] of targets){
  const direct1=`$(\"${selector}\")?.addEventListener(`, direct2=`$('${selector}')?.addEventListener(`;
  if(text.includes(direct1)||text.includes(direct2))throw new Error(`Residual direct binding for ${selector}`);
}
fs.writeFileSync(file,text,'utf8');
fs.mkdirSync('performance-phase1-output',{recursive:true});
fs.writeFileSync('performance-phase1-output/performance1-report.json',JSON.stringify(report,null,2),'utf8');
console.log(JSON.stringify(report,null,2));
