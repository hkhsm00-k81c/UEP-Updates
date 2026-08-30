const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const pFile=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};

A(g.includes('const APP_VERSION = "0.81.90";'),'0.81.90 clean candidate anchor missing');
A(g.includes('data-error-grade-scope-08190'),'0.81.90 native error filter missing');
A(g.includes('function uepStudentApplicationView()'),'student application view missing');
g=g.replace('const APP_VERSION = "0.81.90";','const APP_VERSION = "0.81.91";');

function functionRange(src,name){
  const start=src.indexOf('function '+name+'('); A(start>=0,'function missing: '+name);
  const brace=src.indexOf('{',start); let depth=0,quote=null,esc=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i];
    if(quote){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===quote)quote=null;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++; else if(c==='}'&&--depth===0)return [start,i+1];
  }
  throw new Error('unterminated function '+name);
}

// Make subject-term tabs deterministic inside the native bindPage function.
// Do not add a document/global navigation listener.
const [bpStart,bpEnd]=functionRange(g,'bindPage');
let bp=g.slice(bpStart,bpEnd);
const termBinder="$$('[data-curriculum-term]').forEach(b=>{b.onclick=e=>{e.preventDefault();e.stopPropagation();const next=b.dataset.curriculumTerm||'2-1';if(curriculumTermFilter===next)return;curriculumTermFilter=next;curriculumSubjectKey='';render('records');};});/* UEP_08191_NATIVE_TERM_TAB_BINDER */";
A(!bp.includes('UEP_08191_NATIVE_TERM_TAB_BINDER'),'08191 term binder already present');
bp=bp.slice(0,-1)+termBinder+'}';
g=g.slice(0,bpStart)+bp+g.slice(bpEnd);

// Add confirmed cancelled-course applications to the same error dataset used by
// student list counts, split 2nd/3rd-grade error columns, and student detail popup.
const cancelledBlock=String.raw`
/* UEP_08191_CANCELLED_COURSE_ERROR_START */
const uepSelectionDataset08191Base=uepSelectionDataset;
uepSelectionDataset=function(){
  const data=uepSelectionDataset08191Base.apply(this,arguments);
  if(!data||!Array.isArray(data.rows))return data;
  data.errors=Array.isArray(data.errors)?data.errors:[];
  const norm=v=>String(v??'').normalize('NFKC').replace(/[\\s·ㆍ._*()\-]/g,'').trim();
  const cancelled={
    '2-1':new Set(['독서토론과글쓰기','세계문화와영어'].map(norm)),
    '2-2':new Set(['문학과영상','미디어영어'].map(norm)),
    '3-1':new Set(['역학과에너지','물질과에너지','한문고전읽기'].map(norm)),
    '3-2':new Set(['언어생활과한자'].map(norm))
  };
  const existing=new Set(data.errors.map(e=>[String(e?.student?.id||''),String(e?.term||''),norm(e?.subject||''),String(e?.type||'')].join('|')));
  for(const r of data.rows){
    const student=r?.__student;if(!student?.id)continue;
    for(const term of ['2-1','2-2','3-1','3-2']){
      const selected=typeof uepSelectionTermSubjects==='function'?uepSelectionTermSubjects(r,term):[];
      for(const subject of selected||[]){
        if(!cancelled[term]?.has(norm(subject)))continue;
        const key=[String(student.id),term,norm(subject),'폐강과목 신청오류'].join('|');
        if(existing.has(key))continue;
        const msg=term+' '+subject+'은(는) 폐강 확정 과목입니다. 다른 과목으로 변경해야 합니다.';
        data.errors.push({student,type:'폐강과목 신청오류',term,terms:[term],subject,subjects:[subject],detail:msg,message:msg,path:term});
        existing.add(key);
      }
    }
  }
  return data;
};
/* UEP_08191_CANCELLED_COURSE_ERROR_END */
`;
A(!g.includes('UEP_08191_CANCELLED_COURSE_ERROR_START'),'08191 cancellation block already present');
g+='\n'+cancelledBlock+'\n';

fs.writeFileSync(gFile,g,'utf8');
const pkg=JSON.parse(fs.readFileSync(pFile,'utf8'));pkg.version='0.81.91';fs.writeFileSync(pFile,JSON.stringify(pkg,null,2)+'\n','utf8');
console.log('patched UEP 0.81.91: bindPage term tabs + cancelled-course application errors');
