const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
let text=fs.readFileSync(file,'utf8');
const sig='function dashboardView(';
const s=text.indexOf(sig);if(s<0)throw new Error('dashboardView not found');
const b=text.indexOf('{',s);if(b<0)throw new Error('dashboardView body not found');
let d=1,q=null,com=null,end=-1;
for(let i=b+1;i<text.length;i++){
  const c=text[i],n=text[i+1];
  if(com==='line'){if(c==='\n')com=null;continue}
  if(com==='block'){if(c==='*'&&n==='/'){com=null;i++}continue}
  if(q){if(c==='\\'){i++;continue}if(c===q)q=null;continue}
  if(c==='/'&&n==='/'){com='line';i++;continue}
  if(c==='/'&&n==='*'){com='block';i++;continue}
  if(c==='"'||c==="'"||c==='`'){q=c;continue}
  if(c==='{')d++; else if(c==='}'&&--d===0){end=i+1;break}
}
if(end<0)throw new Error('dashboardView unterminated');
let fn=text.slice(s,end);
const count=(fn.match(/dashboardCalendarMode/g)||[]).length;
if(count<2)throw new Error(`expected repeated dashboardCalendarMode references, found ${count}`);
const open=fn.indexOf('{');
let body=fn.slice(open+1);
body=body.replace(/dashboardCalendarMode/g,'calendarMode');
fn=fn.slice(0,open+1)+'\n  const calendarMode=dashboardCalendarMode;'+body;
text=text.slice(0,s)+fn+text.slice(end);
fs.writeFileSync(file,text);
console.log(`Cached dashboardCalendarMode locally; replaced ${count} references`);
