const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};
A(g.includes('UEP_08189_CURRICULUM_FAST_ERROR_FILTER_START'),'0.81.89 patch missing');
A(g.includes("render('records');return;"),'08189 render anchor missing');
A(g.includes('esc(uepSelectionErrorSummary(es))'),'error summary anchor missing');

// Grade-scope buttons must redraw the current curriculum workspace immediately.
g=g.replace("render('records');return;","render();return;");

// Remove the error-type dropdown from the 0.81.89 injected controls only.
const dropdownRx=/<label>오류유형<select data-curriculum-error-type>[\s\S]*?<\/select><\/label>/;
A(dropdownRx.test(g),'0.81.89 error type control anchor missing');
g=g.replace(dropdownRx,'');

// Split the single error column into separate 2nd/3rd-grade error-kind columns.
A(g.includes('<span>오류종류</span>'),'error column header missing');
g=g.replace('<span>오류종류</span>','<span>2학년 오류종류</span><span>3학년 오류종류</span>');

const helper="const errorKindSummary=(es,s)=>{const scoped=(es||[]).filter(e=>inScope(e,s));return scoped.length?uepSelectionErrorSummary(scoped):'정상';};\n  ";
g=g.replace('function scopedStudentSet(data,s){',helper+'function scopedStudentSet(data,s){');

const oldCell="+'<span class=\"selection-error-summary '+(es.length?'has-error':'is-normal')+'\">'+esc(uepSelectionErrorSummary(es))+'</span></button>';";
A(g.includes(oldCell),'single error cell anchor missing');
const newCells="+'<span class=\"selection-error-summary '+((es||[]).some(e=>inScope(e,'2'))?'has-error':'is-normal')+'\">'+esc(errorKindSummary(es,'2'))+'</span><span class=\"selection-error-summary '+((es||[]).some(e=>inScope(e,'3'))?'has-error':'is-normal')+'\">'+esc(errorKindSummary(es,'3'))+'</span></button>';";
g=g.replace(oldCell,newCells);

// Make selected grade-scope button unmistakably active.
g=g.replace(
  '.uep-error-grade-scope-08189{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.uep-error-grade-scope-08189 .btn{white-space:nowrap}',
  '.uep-error-grade-scope-08189{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.uep-error-grade-scope-08189 .btn{white-space:nowrap}.uep-error-grade-scope-08189 .btn.primary{background:#69bfae!important;border-color:#69bfae!important;color:#fff!important;box-shadow:0 4px 12px rgba(43,132,114,.16)}'
);
g=g.replace(
  "const scopeBtn=(s,label,n)=>'<button type=\"button\" data-error-grade-scope-08189=\"'+s+'\" class=\"btn '+(errorScope===s?'primary':'secondary')+'\">'+label+' '+n+'명</button>';",
  "const scopeBtn=(s,label,n)=>'<button type=\"button\" aria-pressed=\"'+(errorScope===s?'true':'false')+'\" data-error-grade-scope-08189=\"'+s+'\" class=\"btn '+(errorScope===s?'primary':'secondary')+'\">'+label+' '+n+'명</button>';"
);

A(g.includes('2학년 오류종류')&&g.includes('3학년 오류종류'),'split error headers missing');
A(g.includes("errorKindSummary(es,'2')")&&g.includes("errorKindSummary(es,'3')"),'split error summaries missing');
A(g.includes('render();return;'),'direct render fix missing');
A(g.includes('aria-pressed'),'active button state missing');
fs.writeFileSync(gFile,g,'utf8');
console.log('patched 0.81.89 UI: direct filters, active buttons, split 2nd/3rd-grade error kinds, no injected dropdown');
