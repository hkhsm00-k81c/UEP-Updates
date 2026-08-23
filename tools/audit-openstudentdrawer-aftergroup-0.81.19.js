const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources/app/gyomuon.js');
const text=fs.readFileSync(file,'utf8');
const sig='function openStudentDrawer(';
const start=text.indexOf(sig);
if(start<0) throw new Error('openStudentDrawer not found');
const brace=text.indexOf('{',start);
let i=brace,depth=0,end=-1,inS=false,inD=false,inT=false,esc=false;
for(;i<text.length;i++){
  const ch=text[i];
  if(esc){esc=false;continue;}
  if(ch==='\\'){esc=true;continue;}
  if(!inD&&!inT&&ch==="'"){inS=!inS;continue;}
  if(!inS&&!inT&&ch==='"'){inD=!inD;continue;}
  if(!inS&&!inD&&ch==='`'){inT=!inT;continue;}
  if(inS||inD||inT) continue;
  if(ch==='{') depth++;
  else if(ch==='}'){depth--;if(depth===0){end=i+1;break;}}
}
if(end<0) throw new Error('openStudentDrawer closing brace not found');
const body=text.slice(start,end);
const needle='rawParticipationPrograms.filter';
const contexts=[];
let pos=0;
while((pos=body.indexOf(needle,pos))>=0){
  const a=Math.max(0,pos-260),b=Math.min(body.length,pos+520);
  contexts.push({offset:pos,context:body.slice(a,b).replace(/\s+/g,' ').trim()});
  pos+=needle.length;
}
const hasGroupedCall=/groupedAfterSchoolCourses\s*\(\s*rawParticipationPrograms\.filter\(/.test(body);
const hasPerGroupScan=/\.map\(group=>\{[\s\S]{0,700}?rawParticipationPrograms\.filter\(/.test(body);
const afterPredicates=[...body.matchAll(/rawParticipationPrograms\.filter\(([^\n;]{0,500})\)/g)].map(m=>m[1]);
const out={function:'openStudentDrawer',rawParticipationFilterCount:contexts.length,hasGroupedCall,hasPerGroupScan,afterPredicates,contexts,decision:hasPerGroupScan?'CANDIDATE_PREINDEX_AFTERSCHOOL_ROWS':'NO_NESTED_AFTERSCHOOL_SCAN'};
fs.mkdirSync('performance-phase23-output',{recursive:true});
fs.writeFileSync('performance-phase23-output/openstudentdrawer-aftergroup.json',JSON.stringify(out,null,2));
fs.writeFileSync('performance-phase23-output/OPENSTUDENTDRAWER-AFTERGROUP.md','# UEP 0.81.19 Phase23 After-school Grouping Audit\n\n```json\n'+JSON.stringify(out,null,2)+'\n```\n');
console.log(JSON.stringify({rawParticipationFilterCount:out.rawParticipationFilterCount,hasGroupedCall,hasPerGroupScan,decision:out.decision},null,2));
