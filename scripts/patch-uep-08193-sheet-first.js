const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const pFile=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};

A(g.includes('const APP_VERSION = "0.81.90";'),'0.81.90 clean baseline anchor missing');
A(g.includes('function uepStudentApplicationView()'),'student application view missing');
A(g.includes('function bindPage('),'bindPage missing');
A(g.includes('2학년 오류종류')&&g.includes('3학년 오류종류'),'split grade error columns missing');
g=g.replace('const APP_VERSION = "0.81.90";','const APP_VERSION = "0.81.93";');

function functionRange(src,name){
  const start=src.indexOf('function '+name+'(');A(start>=0,'function missing: '+name);
  const brace=src.indexOf('{',start);let depth=0,quote=null,esc=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i];
    if(quote){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===quote)quote=null;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;else if(c==='}'&&--depth===0)return[start,i+1];
  }
  throw new Error('unterminated function '+name);
}

// Deterministic term tabs inside bindPage. No document/global listener.
{
  const [s,e]=functionRange(g,'bindPage');
  let bp=g.slice(s,e);
  if(!bp.includes('UEP_08193_NATIVE_TERM_TAB_BINDER')){
    const native="$$('[data-curriculum-term]').forEach(b=>b.onclick=()=>{curriculumTermFilter=b.dataset.curriculumTerm;curriculumSubjectKey='';render('records');});";
    const replacement="$$('[data-curriculum-term]').forEach(b=>{b.onclick=e=>{e.preventDefault();e.stopPropagation();const next=b.dataset.curriculumTerm||'2-1';if(curriculumTermFilter===next)return;curriculumTermFilter=next;curriculumSubjectKey='';render('records');};});/* UEP_08193_NATIVE_TERM_TAB_BINDER */";
    if(bp.includes(native))bp=bp.replace(native,replacement);
    else bp=bp.slice(0,-1)+replacement+'}';
    g=g.slice(0,s)+bp+g.slice(e);
  }
}

const block=String.raw`
/* UEP_08193_SHEET_FIRST_SELECTION_ERRORS_START */
(function(){
  if(typeof window==='undefined'||window.__UEP08193SheetFirstSelectionErrorsInstalled)return;
  window.__UEP08193SheetFirstSelectionErrorsInstalled=true;

  const norm=v=>String(v??'').normalize('NFKC').replace(/[\s·ㆍ._*()\-]/g,'').trim();
  const sid=v=>String(v??'').trim();
  const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const keyset=o=>isObj(o)?new Set(Object.keys(o)):new Set();
  const looksLike51Row=o=>{
    const k=keyset(o);
    return k.has('학생ID')&&k.has('오류유형')&&k.has('대상학년')&&k.has('규칙ID');
  };
  const find51Rows=root=>{
    const seen=new Set();let best=[];
    const walk=(v,depth)=>{
      if(v==null||depth>6||seen.has(v))return;
      if(typeof v==='object')seen.add(v);
      if(Array.isArray(v)){
        const rows=v.filter(looksLike51Row);
        if(rows.length>best.length)best=rows;
        for(const x of v.slice(0,80))if(typeof x==='object')walk(x,depth+1);
        return;
      }
      if(isObj(v))for(const x of Object.values(v))if(typeof x==='object')walk(x,depth+1);
    };
    walk(root,0);return best;
  };
  const termList=row=>{
    const t=String(row?.['학기']||'').trim();
    if(/^[23]-[12]$/.test(t))return[t];
    const grade=String(row?.['대상학년']||'').trim();
    if(grade==='2')return['2-1','2-2'];
    if(grade==='3')return['3-1','3-2'];
    return[];
  };
  const studentLookup=data=>{
    const m=new Map();
    for(const r of data?.rows||[]){
      const s=r?.__student;if(!s)continue;
      for(const k of [s.id,s.studentNo,s.no])if(k!=null&&String(k).trim())m.set(String(k).trim(),s);
    }
    return m;
  };
  const map51=(rows,data)=>{
    const students=studentLookup(data),out=[];
    for(const r of rows){
      const id=sid(r?.['학생ID']),no=sid(r?.['학번']);
      const student=students.get(id)||students.get(no);
      if(!student)continue;
      const terms=termList(r),term=/^[23]-[12]$/.test(String(r?.['학기']||'').trim())?String(r['학기']).trim():(terms[0]||'');
      const subject=String(r?.['과목명']||'').trim();
      const type=String(r?.['오류유형']||'오류').trim();
      const detail=String(r?.['오류상세']||'').trim();
      out.push({
        student,
        type,
        term,
        terms,
        subject,
        subjects:subject?[subject]:[],
        detail,
        message:detail,
        path:term||String(r?.['대상학년']||'')+'학년',
        ruleId:String(r?.['규칙ID']||'').trim(),
        severity:String(r?.['심각도']||'오류').trim(),
        decision:String(r?.['관리자결정']||'').trim(),
        __source:'51_선택과목오류_정규화'
      });
    }
    return out;
  };

  const base=window.uepSelectionDataset||uepSelectionDataset;
  if(typeof base!=='function')return;
  const wrapped=function(){
    const data=base.apply(this,arguments);
    if(!data||!Array.isArray(data.rows))return data;
    let sourceRows=[];
    try{sourceRows=find51Rows(window.readonlyCache||readonlyCache||{});}catch{}
    if(!sourceRows.length){
      try{sourceRows=find51Rows(data);}catch{}
    }
    if(sourceRows.length){
      const mapped=map51(sourceRows,data);
      if(mapped.length)data.errors=mapped;
      data.__selectionErrorSource='51_선택과목오류_정규화';
      data.__selectionErrorRows=sourceRows.length;
    }else{
      data.__selectionErrorSource='legacy-fallback';
    }
    return data;
  };
  window.uepSelectionDataset=wrapped;
  try{uepSelectionDataset=wrapped}catch{}
})();
/* UEP_08193_SHEET_FIRST_SELECTION_ERRORS_END */
`;
A(!g.includes('UEP_08193_SHEET_FIRST_SELECTION_ERRORS_START'),'08193 sheet-first block already present');
g+='\n'+block+'\n';

fs.writeFileSync(gFile,g,'utf8');
const pkg=JSON.parse(fs.readFileSync(pFile,'utf8'));pkg.version='0.81.93';fs.writeFileSync(pFile,JSON.stringify(pkg,null,2)+'\n','utf8');
console.log('patched UEP 0.81.93: sheet-first 51 selection errors + native term binder');
