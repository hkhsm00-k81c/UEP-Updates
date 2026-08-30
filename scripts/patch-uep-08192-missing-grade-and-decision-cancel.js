const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const pFile=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};

A(g.includes('const APP_VERSION = "0.81.91";'),'0.81.91 anchor missing');
A(g.includes('UEP_08191_NATIVE_TERM_TAB_BINDER'),'0.81.91 term binder missing');
A(g.includes('2학년 오류종류')&&g.includes('3학년 오류종류'),'split error columns missing');

// Remove 0.81.91 hard-coded cancellation list completely. Cancellation must come only
// from the existing administrator decision state saved by the course card UI.
const hardcoded=/\/\* UEP_08191_CANCELLED_COURSE_ERROR_START \*\/[\s\S]*?\/\* UEP_08191_CANCELLED_COURSE_ERROR_END \*\/\s*/g;
A(g.includes('UEP_08191_CANCELLED_COURSE_ERROR_START'),'08191 hardcoded cancellation block missing');
g=g.replace(hardcoded,'/* UEP_08192_REMOVE_HARDCODED_CANCELLATION */\n');
A(!g.includes('UEP_08191_CANCELLED_COURSE_ERROR_START'),'hardcoded cancellation block removal failed');
g=g.replace('const APP_VERSION = "0.81.91";','const APP_VERSION = "0.81.92";');

const block=String.raw`
/* UEP_08192_FOCUSED_ERROR_DERIVATION_START */
const uepSelectionDataset08192Base=uepSelectionDataset;
uepSelectionDataset=function(){
  const data=uepSelectionDataset08192Base.apply(this,arguments);
  if(!data||!Array.isArray(data.rows))return data;
  const DECISION_KEY='uep.curriculum.courseDecision.v1';
  const norm=v=>String(v??'').normalize('NFKC').replace(/[\s·ㆍ._*()\-]/g,'').trim();
  const sid=x=>String(x?.id||x?.studentNo||'').trim();
  const termsOf=e=>[...new Set([...(Array.isArray(e?.terms)?e.terms:[]),...(String(e?.term||'').match(/[23]-[12]/g)||[])].map(String))];
  const subjectCount=(r,term)=>{try{return (uepSelectionTermSubjects(r,term)||[]).length}catch{return 0}};
  const rowByStudent=new Map((data.rows||[]).map(r=>[sid(r?.__student),r]).filter(x=>x[0]));

  // 1) Attribute a termless '미선택 오류' to 2nd/3rd grade when that whole grade has no choices.
  //    Replace the ambiguous original only when at least one grade can be inferred.
  const rebuilt=[];
  for(const e of (Array.isArray(data.errors)?data.errors:[])){
    if(String(e?.type||'').includes('폐강과목 신청오류'))continue; // always regenerate from live decisions below
    const isMissing=String(e?.type||'').includes('미선택');
    if(!isMissing||termsOf(e).length){rebuilt.push(e);continue;}
    const r=rowByStudent.get(sid(e?.student));
    if(!r){rebuilt.push(e);continue;}
    const grades=[];
    if(subjectCount(r,'2-1')===0&&subjectCount(r,'2-2')===0)grades.push('2');
    if(subjectCount(r,'3-1')===0&&subjectCount(r,'3-2')===0)grades.push('3');
    if(!grades.length){rebuilt.push(e);continue;}
    for(const grade of grades){
      const ts=[grade+'-1',grade+'-2'];
      const msg=grade+'학년 선택과목이 모두 미선택 상태입니다.';
      rebuilt.push({...e,term:ts[0],terms:ts,type:'미선택 오류',detail:msg,message:msg,path:grade+'학년'});
    }
  }

  // 2) Derive cancellation errors only from the existing admin decision store.
  //    Course-card UI has used the same key since 0.81.73: term::subject => 'closed' | 'keep'.
  let decisions={};
  try{decisions=JSON.parse(localStorage.getItem(DECISION_KEY)||'{}')||{}}catch{decisions={}}
  const closed=new Map();
  for(const [key,value] of Object.entries(decisions)){
    if(value!=='closed')continue;
    const i=key.indexOf('::');if(i<0)continue;
    const term=key.slice(0,i).trim(),subject=key.slice(i+2).trim();
    if(!/^[23]-[12]$/.test(term)||!subject)continue;
    if(!closed.has(term))closed.set(term,new Map());
    closed.get(term).set(norm(subject),subject);
  }
  const existing=new Set(rebuilt.map(e=>[sid(e?.student),String(e?.term||''),norm(e?.subject||''),String(e?.type||'')].join('|')));
  for(const r of data.rows){
    const student=r?.__student;if(!student||!sid(student))continue;
    for(const term of ['2-1','2-2','3-1','3-2']){
      const closedTerm=closed.get(term);if(!closedTerm?.size)continue;
      let selected=[];try{selected=uepSelectionTermSubjects(r,term)||[]}catch{}
      for(const subject of selected){
        const n=norm(subject);if(!closedTerm.has(n))continue;
        const display=closedTerm.get(n)||String(subject);
        const key=[sid(student),term,n,'폐강과목 신청오류'].join('|');if(existing.has(key))continue;
        const msg=term+' '+display+'은(는) 관리자가 폐강 확정한 과목입니다. 다른 과목으로 변경해야 합니다.';
        rebuilt.push({student,type:'폐강과목 신청오류',term,terms:[term],subject:String(subject),subjects:[String(subject)],detail:msg,message:msg,path:term});
        existing.add(key);
      }
    }
  }
  data.errors=rebuilt;
  return data;
};
/* UEP_08192_FOCUSED_ERROR_DERIVATION_END */
`;
A(!g.includes('UEP_08192_FOCUSED_ERROR_DERIVATION_START'),'08192 block already present');
g+='\n'+block+'\n';

fs.writeFileSync(gFile,g,'utf8');
const pkg=JSON.parse(fs.readFileSync(pFile,'utf8'));pkg.version='0.81.92';fs.writeFileSync(pFile,JSON.stringify(pkg,null,2)+'\n','utf8');
console.log('patched UEP 0.81.92: grade-attributed missing errors + admin-decision cancellation errors');
