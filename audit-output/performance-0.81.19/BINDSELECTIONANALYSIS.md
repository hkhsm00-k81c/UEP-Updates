# bindSelectionAnalysis Phase5 Analysis

Render calls: 10

- line 2: inline-flow — `$$('[data-curriculum-workspace]').forEach(b=>b.onclick=()=>{curriculumWorkspaceMode=b.dataset.curriculumWorkspace;render('records');});`
- line 3: inline-flow — `$$('[data-record-class]').forEach(b=>b.onclick=()=>{recordClassNo=b.dataset.recordClass;recordStudentId='';render('records');});`
- line 4: event-handler — `$$('[data-record-query]').forEach(b=>b.onclick=()=>{recordQueryMode=b.dataset.recordQuery||'class';render('records');});`
- line 5: event-handler — `$$('[data-record-student]').forEach(b=>b.onclick=()=>{recordStudentId=b.dataset.recordStudent;recordQueryMode='student';render('records');});`
- line 6: event-handler — `$('[data-curriculum-error-only]')?.addEventListener('click',()=>{curriculumErrorOnly=!curriculumErrorOnly;render('records');});`
- line 7: event-handler — `$('[data-curriculum-error-type]')?.addEventListener('change',e=>{curriculumErrorType=e.target.value;render('records');});`
- line 8: event-handler — `$$('[data-curriculum-term]').forEach(b=>b.onclick=()=>{curriculumTermFilter=b.dataset.curriculumTerm;curriculumSubjectKey='';render('records');});`
- line 9: event-handler — `$$('[data-curriculum-subject]').forEach(b=>b.onclick=()=>{curriculumSubjectKey=b.dataset.curriculumSubject;render('records');});`
- line 10: event-handler — `$$('[data-roster-sort]').forEach(b=>b.onclick=()=>{curriculumRosterSort=b.dataset.rosterSort;render('records');});`
- line 14: event-handler — `const classRows=uepActiveSelectionRows().filter(r=>recordStudentClass(r.__student)===String(recordClassNo));const idx=classRows.findIndex(r=>r.__student.id===recordStudentId);$('[data-uep-student-prev]')?.addEventListener('click',()=>{if(classRows.length){recordStudentId=classRows[(idx-1+classRows.length)%classRows.length].__student.id;render('records');}});$('[data-uep-student-next]')?.addEventListener('click',()=>{if(classRows.length){recordStudentId=classRows[(idx+1)%classRows.length].__student.id;render('records');}});`

Adjacent render pairs: 2→3, 3→4, 4→5, 5→6, 6→7, 7→8, 8→9, 9→10
