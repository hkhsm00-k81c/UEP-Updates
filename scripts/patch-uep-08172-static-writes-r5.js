const fs=require('fs');
const g='app/resources/app/gyomuon.js',m='app/resources/app/electron/main.cjs';
let gy=fs.readFileSync(g,'utf8'),main=fs.readFileSync(m,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const rep=(src,from,to,label)=>{must(src.includes(from),'missing '+label);must(src.indexOf(from)===src.lastIndexOf(from),'non-unique '+label);return src.replace(from,to)};

// Student contact: exact row write already succeeded, so do not rebuild the whole school graph.
main=rep(main,
`  liveDataCache=null; liveDataFetchedAt=0;\n  const data=await fetchLiveData({force:true});\n  return {ok:true,data};`,
`  if(liveDataCache&&Array.isArray(liveDataCache.students)){\n    const target=liveDataCache.students.find(row=>String(row?.id||row?.studentId||'')===studentId);\n    if(target)target[field]=value;\n  }\n  return {ok:true,studentId,field,value};`,
'student contact full refresh');

gy=rep(gy,
`    readonlyCache=result.data||readonlyCache;\n    toast(\`${'${label}'}를 UEP 기본정보 연결시트에 저장했습니다.\`);`,
`    if(readonlyCache&&Array.isArray(readonlyCache.students)){const target=readonlyCache.students.find(row=>String(row?.id||row?.studentId||'')===String(student.id));if(target)target[field]=value;}\n    student[field]=value;\n    toast(\`${'${label}'}를 UEP 기본정보 연결시트에 저장했습니다.\`);`,
'student contact renderer assignment');

// Program operation: update the canonical cached program/session record locally instead of a full graph read.
main=rep(main,
`  liveDataCache=null; liveDataFetchedAt=0;\n  const data=await fetchLiveData({force:true});\n  return {ok:true,data,sheet:specs.sheet};`,
`  if(liveDataCache&&Array.isArray(liveDataCache.programs)){\n    liveDataCache.programs=liveDataCache.programs.map(row=>{\n      const sourceMatch=!source||String(row?.source||'')===source;\n      const programMatch=!programId||String(row?.programId||row?.courseId||row?.id||'')===programId;\n      const sessionMatch=!sessionId||String(row?.sessionId||'')===sessionId;\n      return sourceMatch&&programMatch&&sessionMatch?{...row,...payload}:row;\n    });\n  }\n  return {ok:true,programPatch:{source,programId,sessionId,...payload},sheet:specs.sheet};`,
'program operation full refresh');

// Both renderer call sites already own the exact program object; merge only the returned write patch.
gy=gy.replace(/readonlyCache\s*=\s*result(?:\?\.)?\.data\s*\|\|\s*readonlyCache;/g,match=>match);
const migrationOld=`      if(!result?.ok)throw new Error(result?.reason||"프로그램 운영정보 이관 실패");`;
if(gy.includes(migrationOld))gy=gy.replace(migrationOld,`      if(!result?.ok)throw new Error(result?.reason||"프로그램 운영정보 이관 실패");\n      if(result?.programPatch)Object.assign(program,result.programPatch);`);
const editNeedle=`const result=await window.schoolBoard.saveProgramOperation({role:"admin",source:program.source,programId:program.programId||program.courseId||"",sessionId:program.sessionId||"",...next});`;
must(gy.includes(editNeedle),'program edit call missing');
gy=gy.replace(editNeedle,editNeedle+`\n      if(result?.programPatch)Object.assign(program,result.programPatch);`);

fs.writeFileSync(g,gy,'utf8');fs.writeFileSync(m,main,'utf8');
console.log('UEP 0.81.72 R5 static write refactor applied');
