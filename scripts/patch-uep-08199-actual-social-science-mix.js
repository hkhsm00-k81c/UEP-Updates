const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const pFile=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};

A(g.includes('const APP_VERSION = "0.81.98";'),'0.81.98 APP_VERSION anchor missing');
A(g.includes('UEP_08198_RECOMMENDED_TRACK_ERRORS'),'0.81.98 selection cross-error patch missing');
A(g.includes('function uepSubjectGroup08128('),'selection subject grouping missing');
A(!g.includes('UEP_08199_ACTUAL_SOCIAL_SCIENCE_MIX'),'0.81.99 patch already present');

g=g.replace('const APP_VERSION = "0.81.98";','const APP_VERSION = "0.81.99";');

const crossStart='  const crossErrors08198=data=>{';
const crossEnd='  const mergeCross08198=';
const cs=g.indexOf(crossStart),ce=g.indexOf(crossEnd,cs);
A(cs>=0&&ce>cs,'0.81.98 crossErrors function range missing');

const newCross=`  /* UEP_08199_ACTUAL_SOCIAL_SCIENCE_MIX */\n  const crossErrors08198=data=>{\n    const out=[];\n    for(const row of data?.rows||[]){\n      const student=row?.__student;if(!student)continue;\n      const selected=[];\n      for(const term of ['2-1','2-2','3-1','3-2']){\n        const subjects=typeof uepSelectionTermSubjects==='function'?(uepSelectionTermSubjects(row,term)||[]):[];\n        for(const subject of subjects){\n          const group=typeof uepSubjectGroup08128==='function'?uepSubjectGroup08128(subject):'';\n          if(group==='사회'||group==='과학')selected.push({term,subject,group});\n        }\n      }\n      const social=selected.filter(x=>x.group==='사회');\n      const science=selected.filter(x=>x.group==='과학');\n      if(!social.length||!science.length)continue;\n      const socialNames=[...new Set(social.map(x=>x.subject))];\n      const scienceNames=[...new Set(science.map(x=>x.subject))];\n      const detail='사회계열 ['+socialNames.join(', ')+']과 과학계열 ['+scienceNames.join(', ')+']을 함께 선택했습니다.';\n      for(const x of selected){\n        out.push({student,type:'문이과 교차오류',term:x.term,terms:[x.term],subject:x.subject,subjects:[x.subject],detail,message:detail,path:x.term,severity:'확인',recommendedTrack:recommendedTrack08198(student),__source:'UEP-08199-actual-social-science-mix'});\n      }\n    }\n    return out;\n  };\n`;
g=g.slice(0,cs)+newCross+g.slice(ce);

const oldMergeLine="    data.errors=mergeCross08198(data.errors,crossErrors08198(data));";
const newMergeLine="    data.errors=mergeCross08198((data.errors||[]).filter(x=>String(x?.type||'').trim()!=='문이과 교차오류'),crossErrors08198(data));\n    data.__selectionCrossRule='actual-social-science-mix-0.81.99';";
A(g.includes(oldMergeLine),'0.81.98 cross merge anchor missing');
g=g.replace(oldMergeLine,newMergeLine);

g=g.replace("    data.__selectionRecommendedTrackErrors='0.81.98';","    data.__selectionRecommendedTrackErrors='reference-only';");
fs.writeFileSync(gFile,g,'utf8');

const pkg=JSON.parse(fs.readFileSync(pFile,'utf8'));
A(pkg.version==='0.81.98','unexpected package version '+pkg.version);
pkg.version='0.81.99';
fs.writeFileSync(pFile,JSON.stringify(pkg,null,2)+'\n','utf8');

A(g.includes("if(!social.length||!science.length)continue"),'actual mixed-selection gate missing');
A(g.includes("group==='사회'||group==='과학'"),'social/science grouping missing');
A(g.includes("filter(x=>String(x?.type||'').trim()!=='문이과 교차오류')"),'stale cross-error replacement missing');
A(g.includes("recommendedTrack:recommendedTrack08198(student)"),'recommended track reference metadata missing');
A(!g.includes("recommended==='문과'&&group==='과학'"),'old recommendation-based 문과 rule still active');
A(!g.includes("recommended==='이과'&&group==='사회'"),'old recommendation-based 이과 rule still active');
console.log('UEP 0.81.99 actual social/science mixed-selection patch applied');
