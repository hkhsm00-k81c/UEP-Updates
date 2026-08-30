const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const pFile=path.join(root,'resources','app','package.json');
const gdFile=path.join(root,'resources','app','electron','google-data.cjs');
const mainFile=path.join(root,'resources','app','electron','main.cjs');
const A=(c,m)=>{if(!c)throw new Error(m)};

let g=fs.readFileSync(gFile,'utf8');
A(g.includes('const APP_VERSION = "0.81.91";'),'0.81.91 candidate anchor missing');
A(g.includes('/* UEP_08191_CANCELLED_COURSE_ERROR_START */'),'08191 hardcoded cancellation block missing');
A(g.includes('/* UEP_08191_CANCELLED_COURSE_ERROR_END */'),'08191 hardcoded cancellation block end missing');
A(g.includes('data-error-grade-scope-08190'),'08190 grade scope controls missing');

g=g.replace('const APP_VERSION = "0.81.91";','const APP_VERSION = "0.81.94";');

// Remove the temporary hardcoded cancellation list from 0.81.91.
const cancelStart=g.indexOf('/* UEP_08191_CANCELLED_COURSE_ERROR_START */');
const cancelEndMarker='/* UEP_08191_CANCELLED_COURSE_ERROR_END */';
const cancelEnd=g.indexOf(cancelEndMarker,cancelStart);
A(cancelStart>=0&&cancelEnd>cancelStart,'08191 cancellation block range invalid');
g=g.slice(0,cancelStart)+g.slice(cancelEnd+cancelEndMarker.length);

// Keep the native grade-scope buttons and read their exact data attribute.
const gradeOld="$$('[data-error-grade-scope-08190]').forEach(b=>b.onclick=()=>{curriculumErrorOnly=true;curriculumErrorGradeScope=b.dataset.errorGradeScope08190||'all';recordClassNo='all';recordStudentId='';render('records');});";
const gradeNew="$$('[data-error-grade-scope-08190]').forEach(b=>b.onclick=()=>{curriculumErrorOnly=true;curriculumErrorGradeScope=b.getAttribute('data-error-grade-scope-08190')||'all';recordClassNo='all';recordStudentId='';render('records');});";
A(g.includes(gradeOld),'08190 grade scope binder anchor missing');
g=g.replace(gradeOld,gradeNew);

// Replace the 0.81.91 subject-term binder with the stable native binder used by 0.81.94.
const termOld="$$('[data-curriculum-term]').forEach(b=>{b.onclick=e=>{e.preventDefault();e.stopPropagation();const next=b.dataset.curriculumTerm||'2-1';if(curriculumTermFilter===next)return;curriculumTermFilter=next;curriculumSubjectKey='';render('records');};});/* UEP_08191_NATIVE_TERM_TAB_BINDER */";
const termNew="$$('[data-curriculum-term]').forEach(b=>{b.onclick=e=>{e.preventDefault();e.stopPropagation();curriculumTermFilter=b.dataset.curriculumTerm||'2-1';curriculumSubjectKey='';render('records');};});/* UEP_08194_TERM_BINDER */";
A(g.includes(termOld),'08191 term binder anchor missing');
g=g.replace(termOld,termNew);

// Sheet-first selection-error source: 51 is authoritative when rows exist; legacy remains fallback only.
const selectionBlock=String.raw`
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
A(!g.includes('UEP_08194_SELECTION_ERROR_SOURCE_START'),'08194 selection source already installed');
g+='\n'+selectionBlock+'\n';
fs.writeFileSync(gFile,g,'utf8');

const pkg=JSON.parse(fs.readFileSync(pFile,'utf8'));
pkg.version='0.81.94';
fs.writeFileSync(pFile,JSON.stringify(pkg,null,2)+'\n','utf8');

let gd=fs.readFileSync(gdFile,'utf8');
const ruleRangeOld='"41_선택과목규칙": "\'41_선택과목규칙\'!A1:Q1000"';
const ruleRangeNew='"41_선택과목규칙": "\'41_선택과목규칙\'!A1:Z1000"';
A(gd.includes(ruleRangeOld),'41 rule range A:Q anchor missing');
gd=gd.replace(ruleRangeOld,ruleRangeNew);
const selectionReturnOld='    selectionRules: rowsFrom("41_선택과목규칙"),\n    selectionSubjectErrors,';
const selectionReturnNew='    selectionRules: rowsFrom("41_선택과목규칙"),\n    selectionErrorRows: rowsFrom("51_선택과목오류_정규화"),\n    selectionSubjectErrors,';
A(gd.includes(selectionReturnOld),'google-data selectionRules return anchor missing');
gd=gd.replace(selectionReturnOld,selectionReturnNew);
fs.writeFileSync(gdFile,gd,'utf8');

let main=fs.readFileSync(mainFile,'utf8');
const processingAnchor='    ["41_학교캘린더", "\'41_학교캘린더\'!A1:W3000"],';
const processingNew=processingAnchor+'\n    ["51_선택과목오류_정규화", "\'51_선택과목오류_정규화\'!A1:V5000"],';
A(main.includes(processingAnchor),'processing range anchor missing');
A(!main.includes('"51_선택과목오류_정규화", "\'51_선택과목오류_정규화\'!A1:V5000"'),'51 processing range already present');
main=main.replace(processingAnchor,processingNew);
fs.writeFileSync(mainFile,main,'utf8');

console.log('patched UEP 0.81.94 official: sheet-first 51 errors, 41 A:Z, native grade/term filters, no hardcoded cancellation');
