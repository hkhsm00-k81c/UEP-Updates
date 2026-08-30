const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};
A(g.includes('UEP_08189_CURRICULUM_FAST_ERROR_FILTER_START'),'0.81.89 patch missing');
A(g.includes("render('records');return;"),'08189 render anchor missing');
A(g.includes("const data=uepSelectionDataset(),allRows=data.rows.filter(uepSelectionActiveRow08129),byStudent=groupedErrors(data),types="),'dataset anchor missing');
A(g.includes('<label>오류유형<select data-curriculum-error-type>'),'error-type dropdown anchor missing');
A(g.includes('<span>오류종류</span>'),'error column anchor missing');
A(g.includes('esc(uepSelectionErrorSummary(es))'),'error summary anchor missing');

// Grade filter must re-render the current curriculum student application view immediately.
g=g.replace("render('records');return;","render();return;");

// Remove legacy error-type filtering and its dropdown. Grade buttons are now the only top-level error scope filters.
g=g.replace(
  "const data=uepSelectionDataset(),allRows=data.rows.filter(uepSelectionActiveRow08129),byStudent=groupedErrors(data),types=[...new Set((data.errors||[]).map(x=>x.type).filter(Boolean))];",
  "const data=uepSelectionDataset(),allRows=data.rows.filter(uepSelectionActiveRow08129),byStudent=groupedErrors(data);"
);
g=g.replace(
  "      const typeOk=curriculumErrorType==='all'||es.some(e=>e.type===curriculumErrorType);\n      return scopeOk&&onlyOk&&typeOk;",
  "      return scopeOk&&onlyOk;"
);
g=g.replace("curriculumErrorType='all';","");
const dropdown="<label>오류유형<select data-curriculum-error-type><option value=\"all\">전체 오류</option>'+types.map(x=>'<option value=\"'+esc(x)+'\" '+(curriculumErrorType===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label>";
A(g.includes(dropdown),'exact error-type dropdown missing');
g=g.replace(dropdown,'');

// Keep the real error kinds, but split them into independent 2nd-grade and 3rd-grade columns.
const helper="  const errorsByGrade=(es,s)=>(es||[]).filter(e=>inScope(e,s));\n  const gradeErrorKinds=(es,s)=>{const scoped=errorsByGrade(es,s);return scoped.length?uepSelectionErrorSummary(scoped):'정상';};\n";
g=g.replace('  function scopedStudentSet(data,s){',helper+'  function scopedStudentSet(data,s){');
g=g.replace('<span>오류종류</span>','<span>2학년 오류종류</span><span>3학년 오류종류</span>');
g=g.replace(
  "'<span class=\"selection-error-summary '+(es.length?'has-error':'is-normal')+'\">'+esc(uepSelectionErrorSummary(es))+'</span></button>';",
  "'<span class=\"selection-error-summary '+(errorsByGrade(es,'2').length?'has-error':'is-normal')+'\">'+esc(gradeErrorKinds(es,'2'))+'</span><span class=\"selection-error-summary '+(errorsByGrade(es,'3').length?'has-error':'is-normal')+'\">'+esc(gradeErrorKinds(es,'3'))+'</span></button>';"
);

// Make the selected grade-scope button visibly active.
g=g.replace(
  ".uep-error-grade-scope-08189{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.uep-error-grade-scope-08189 .btn{white-space:nowrap}",
  ".uep-error-grade-scope-08189{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.uep-error-grade-scope-08189 .btn{white-space:nowrap}.uep-error-grade-scope-08189 .btn.primary{background:#69bfae!important;border-color:#69bfae!important;color:#fff!important;box-shadow:0 4px 12px rgba(43,132,114,.16)}"
);
g=g.replace(
  "const scopeBtn=(s,label,n)=>'<button type=\"button\" data-error-grade-scope-08189=\"'+s+'\" class=\"btn '+(errorScope===s?'primary':'secondary')+'\">'+label+' '+n+'명</button>';",
  "const scopeBtn=(s,label,n)=>'<button type=\"button\" aria-pressed=\"'+(errorScope===s?'true':'false')+'\" data-error-grade-scope-08189=\"'+s+'\" class=\"btn '+(errorScope===s?'primary':'secondary')+'\">'+label+' '+n+'명</button>';"
);

A(!g.includes('<label>오류유형<select data-curriculum-error-type>'),'error type dropdown still present');
A(!g.includes("const typeOk=curriculumErrorType==='all'"),'legacy error type filtering still present');
A(g.includes('<span>2학년 오류종류</span><span>3학년 오류종류</span>'),'split error columns missing');
A(g.includes("gradeErrorKinds(es,'2')")&&g.includes("gradeErrorKinds(es,'3')"),'grade-specific error summaries missing');
A(g.includes('aria-pressed'),'active-state marker missing');
A(g.includes('render();return;'),'direct render fix missing');
fs.writeFileSync(gFile,g,'utf8');
console.log('patched 0.81.89 error UI: one-click grade filters, active state, split real error kinds, no error-type dropdown');
