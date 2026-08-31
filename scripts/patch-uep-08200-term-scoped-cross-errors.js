const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const pFile=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};

A(g.includes('const APP_VERSION = "0.81.99";'),'0.81.99 APP_VERSION anchor missing');
A(g.includes('UEP_08199_ACTUAL_SOCIAL_SCIENCE_MIX'),'0.81.99 cross-error patch missing');
A(!g.includes('UEP_08200_TERM_SCOPED_CROSS_ERRORS'),'0.82.00 patch already present');

g=g.replace('const APP_VERSION = "0.81.99";','const APP_VERSION = "0.82.00";');

const start='  /* UEP_08199_ACTUAL_SOCIAL_SCIENCE_MIX */';
const end='  const mergeCross08198=';
const s=g.indexOf(start),e=g.indexOf(end,s);
A(s>=0&&e>s,'0.81.99 crossErrors range missing');

const replacement=`  /* UEP_08200_TERM_SCOPED_CROSS_ERRORS */\n  const crossErrors08198=data=>{\n    const out=[];\n    for(const row of data?.rows||[]){\n      const student=row?.__student;if(!student)continue;\n      for(const term of ['2-1','2-2']){\n        const selected=[];\n        const subjects=typeof uepSelectionTermSubjects==='function'?(uepSelectionTermSubjects(row,term)||[]):[];\n        for(const subject of subjects){\n          const group=typeof uepSubjectGroup08128==='function'?uepSubjectGroup08128(subject):'';\n          if(group==='사회'||group==='과학')selected.push({term,subject,group});\n        }\n        const social=selected.filter(x=>x.group==='사회');\n        const science=selected.filter(x=>x.group==='과학');\n        if(!social.length||!science.length)continue;\n        const socialNames=[...new Set(social.map(x=>x.subject))];\n        const scienceNames=[...new Set(science.map(x=>x.subject))];\n        const detail=term+' 학기 내에서 사회계열 ['+socialNames.join(', ')+']과 과학계열 ['+scienceNames.join(', ')+']을 함께 선택했습니다.';\n        for(const x of selected){\n          out.push({student,type:'문이과 교차오류',term,terms:[term],subject:x.subject,subjects:[x.subject],detail,message:detail,path:term,severity:'확인',recommendedTrack:recommendedTrack08198(student),__source:'UEP-08200-term-scoped-cross'});\n        }\n      }\n    }\n    return out;\n  };\n`;
g=g.slice(0,s)+replacement+g.slice(e);
g=g.replace("    data.__selectionCrossRule='actual-social-science-mix-0.81.99';","    data.__selectionCrossRule='term-scoped-2-1-2-2-0.82.00';");
fs.writeFileSync(gFile,g,'utf8');

const pkg=JSON.parse(fs.readFileSync(pFile,'utf8'));
A(pkg.version==='0.81.99','unexpected package version '+pkg.version);
pkg.version='0.82.00';
fs.writeFileSync(pFile,JSON.stringify(pkg,null,2)+'\n','utf8');

A(g.includes("for(const term of ['2-1','2-2'])"),'2-1/2-2 scope missing');
A(!g.includes("for(const term of ['2-1','2-2','3-1','3-2'])"),'cross-term loop still active');
A(g.includes("if(!social.length||!science.length)continue"),'within-term mix gate missing');
A(g.includes("term-scoped-2-1-2-2-0.82.00"),'cross rule marker missing');
console.log('UEP 0.82.00 term-scoped 2-1/2-2 cross-error patch applied');
