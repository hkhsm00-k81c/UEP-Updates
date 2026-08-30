const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const pFile=path.join(root,'resources','app','package.json');
const gdFile=path.join(root,'resources','app','electron','google-data.cjs');
const mFile=path.join(root,'resources','app','electron','main.cjs');
let g=fs.readFileSync(gFile,'utf8');
let gd=fs.readFileSync(gdFile,'utf8');
let m=fs.readFileSync(mFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};

A(g.includes('const APP_VERSION = "0.81.90";'),'0.81.90 baseline anchor missing');
g=g.replace('const APP_VERSION = "0.81.90";','const APP_VERSION = "0.81.94";');

// 1) Repair two selector-list bindings broken by String.replace replacement semantics ($$ -> $).
const badGrade="$('[data-error-grade-scope-08190]').forEach";
const goodGrade="$$('[data-error-grade-scope-08190]').forEach";
A(g.includes(badGrade),'broken grade-scope binding anchor missing');
g=g.replace(badGrade,goodGrade);

const nativeTerm="$$('[data-curriculum-term]').forEach(b=>b.onclick=()=>{curriculumTermFilter=b.dataset.curriculumTerm;curriculumSubjectKey='';render('records');});";
A(g.includes(nativeTerm),'native curriculum term binder anchor missing');
const safeTerm="$$('[data-curriculum-term]').forEach(b=>{b.onclick=e=>{e.preventDefault();e.stopPropagation();curriculumTermFilter=b.dataset.curriculumTerm||'2-1';curriculumSubjectKey='';render('records');};});/* UEP_08194_TERM_BINDER */";
g=g.replace(nativeTerm,()=>safeTerm);

// 2) Make 41 rule rows complete through Z (manager decision fields live after Q).
const oldRule='"41_선택과목규칙": "\'41_선택과목규칙\'!A1:Q1000"';
const newRule='"41_선택과목규칙": "\'41_선택과목규칙\'!A1:Z1000"';
A(gd.includes(oldRule),'41 rule range anchor missing');
gd=gd.replace(oldRule,newRule);

// 3) Load 51 normalized selection-error rows from processing spreadsheet during normal readonly sync.
const procAnchor='["41_학교캘린더", "\'41_학교캘린더\'!A1:W3000"],';
A(m.includes(procAnchor),'processing range anchor missing');
m=m.replace(procAnchor,procAnchor+'\n    ["51_선택과목오류_정규화", "\'51_선택과목오류_정규화\'!A1:V5000"],');

// 4) Expose raw 51 rows in readonly cache.
const returnAnchor='selectionRules: rowsFrom("41_선택과목규칙"),\n    selectionSubjectErrors,';
A(gd.includes(returnAnchor),'selection return anchor missing');
gd=gd.replace(returnAnchor,'selectionRules: rowsFrom("41_선택과목규칙"),\n    selectionErrorRows: rowsFrom("51_선택과목오류_정규화"),\n    selectionSubjectErrors,');

// 5) Replace legacy selection error dataset with 51 when 51 is present.
const block=String.raw`
/* UEP_08194_SELECTION_ERROR_SOURCE_START */
(function(){
  if(typeof window==='undefined'||window.__UEP08194SelectionErrorSourceInstalled)return;
  window.__UEP08194SelectionErrorSourceInstalled=true;
  const base=window.uepSelectionDataset||uepSelectionDataset;
  if(typeof base!=='function')return;
  const sid=v=>String(v??'').trim();
  const mapRows=(rows,data)=>{
    const students=new Map();
    for(const r of data?.rows||[]){const s=r?.__student;if(!s)continue;for(const k of [s.id,s.studentNo,s.no])if(sid(k))students.set(sid(k),s);}
    const out=[];
    for(const r of rows||[]){
      const student=students.get(sid(r?.['학생ID']))||students.get(sid(r?.['학번']));
      if(!student)continue;
      const grade=sid(r?.['대상학년']);
      const rawTerm=sid(r?.['학기']);
      const terms=/^[23]-[12]$/.test(rawTerm)?[rawTerm]:(grade==='2'?['2-1','2-2']:grade==='3'?['3-1','3-2']:[]);
      const term=/^[23]-[12]$/.test(rawTerm)?rawTerm:(terms[0]||'');
      const subject=sid(r?.['과목명']);
      const detail=sid(r?.['오류상세']);
      out.push({student,type:sid(r?.['오류유형'])||'오류',term,terms,subject,subjects:subject?[subject]:[],detail,message:detail,path:rawTerm||grade+'학년',ruleId:sid(r?.['규칙ID']),severity:sid(r?.['심각도'])||'오류',decision:sid(r?.['관리자결정']),__source:'51_선택과목오류_정규화'});
    }
    return out;
  };
  const wrapped=function(){
    const data=base.apply(this,arguments);
    if(!data||!Array.isArray(data.rows))return data;
    const rows=Array.isArray(readonlyCache?.selectionErrorRows)?readonlyCache.selectionErrorRows:[];
    if(rows.length){data.errors=mapRows(rows,data);data.__selectionErrorSource='51_선택과목오류_정규화';data.__selectionErrorRows=rows.length;}
    else data.__selectionErrorSource='legacy-fallback';
    return data;
  };
  window.uepSelectionDataset=wrapped;
  try{uepSelectionDataset=wrapped}catch{}
})();
/* UEP_08194_SELECTION_ERROR_SOURCE_END */
`;
A(!g.includes('UEP_08194_SELECTION_ERROR_SOURCE_START'),'08194 block already present');
g+='\n'+block+'\n';

fs.writeFileSync(gFile,g,'utf8');
fs.writeFileSync(gdFile,gd,'utf8');
fs.writeFileSync(mFile,m,'utf8');
const pkg=JSON.parse(fs.readFileSync(pFile,'utf8'));pkg.version='0.81.94';fs.writeFileSync(pFile,JSON.stringify(pkg,null,2)+'\n','utf8');
console.log('patched UEP 0.81.94: grade/term bindings + 41Z + processing 51 readonly source');