const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};
A(g.includes('UEP_08189_CURRICULUM_FAST_ERROR_FILTER_START'),'0.81.89 patch missing');
A(g.includes("render('records');return;"),'08189 render anchor missing');
A(g.includes("<label>오류유형<select data-curriculum-error-type>"),'error type control anchor missing');
A(g.includes("esc(uepSelectionErrorSummary(es))"),'error summary anchor missing');

g=g.replace("render('records');return;","render();return;");

g=g.replace(
  "<label>오류유형<select data-curriculum-error-type><option value=\"all\">전체 오류</option>'+types.map(x=>'<option value=\"'+esc(x)+'\" '+(curriculumErrorType===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label>",
  ""
);

g=g.replace(
  "const controls='<div class=\"curriculum-mode-block curriculum-unified-mode\"><div class=\"curriculum-filter-bar class-mode\"><div class=\"record-class-cards\">'+classButton('all','전체')+Array.from({length:9},(_,i)=>classButton(String(i+1),(i+1)+'반')).join('')+'</div><button class=\"btn '+(curriculumErrorOnly?'primary':'secondary')+'\" data-curriculum-error-only>'+(curriculumErrorOnly?'오류학생만 보는 중':'오류학생만 보기')+'</button><div class=\"uep-error-grade-scope-08189\">'+scopeBtn('2','2학년 오류학생',c2)+scopeBtn('3','3학년 오류학생',c3)+scopeBtn('all','2·3학년 오류학생',ca)+'</div></div></div>';",
  "const controls='<div class=\"curriculum-mode-block curriculum-unified-mode\"><div class=\"curriculum-filter-bar class-mode\"><div class=\"record-class-cards\">'+classButton('all','전체')+Array.from({length:9},(_,i)=>classButton(String(i+1),(i+1)+'반')).join('')+'</div><button class=\"btn '+(curriculumErrorOnly?'primary':'secondary')+'\" data-curriculum-error-only>'+(curriculumErrorOnly?'오류학생만 보는 중':'오류학생만 보기')+'</button><div class=\"uep-error-grade-scope-08189\">'+scopeBtn('2','2학년 오류학생',c2)+scopeBtn('3','3학년 오류학생',c3)+scopeBtn('all','2·3학년 오류학생',ca)+'</div></div></div>';"
);

const helper="const gradeErrorSummary=es=>{const has2=(es||[]).some(e=>inScope(e,'2')),has3=(es||[]).some(e=>inScope(e,'3'));return [has2?'2학년 오류':'',has3?'3학년 오류':''].filter(Boolean).join(' · ')||'정상';};\n  ";
g=g.replace("function scopedStudentSet(data,s){",helper+"function scopedStudentSet(data,s){");
g=g.replace("esc(uepSelectionErrorSummary(es))","esc(gradeErrorSummary(es))");

g=g.replace(
  ".uep-error-grade-scope-08189{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.uep-error-grade-scope-08189 .btn{white-space:nowrap}",
  ".uep-error-grade-scope-08189{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.uep-error-grade-scope-08189 .btn{white-space:nowrap}.uep-error-grade-scope-08189 .btn.primary{background:#69bfae!important;border-color:#69bfae!important;color:#fff!important;box-shadow:0 4px 12px rgba(43,132,114,.16)}"
);

g=g.replace(
  "const scopeBtn=(s,label,n)=>'<button type=\"button\" data-error-grade-scope-08189=\"'+s+'\" class=\"btn '+(errorScope===s?'primary':'secondary')+'\">'+label+' '+n+'명</button>';",
  "const scopeBtn=(s,label,n)=>'<button type=\"button\" aria-pressed=\"'+(errorScope===s?'true':'false')+'\" data-error-grade-scope-08189=\"'+s+'\" class=\"btn '+(errorScope===s?'primary':'secondary')+'\">'+label+' '+n+'명</button>';"
);

A(!g.includes('data-curriculum-error-type><option'),'error type dropdown still present');
A(g.includes('2학년 오류')&&g.includes('3학년 오류'),'grade error labels missing');
A(g.includes('render();return;'),'direct render fix missing');
fs.writeFileSync(gFile,g,'utf8');
console.log('patched 0.81.89 error UI: direct grade filter, active state, grade labels, no error-type dropdown');
