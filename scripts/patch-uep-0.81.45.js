const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const rendererFile=path.resolve(appRoot,'resources','app','gyomuon.js');
const dataFile=path.resolve(appRoot,'resources','app','electron','google-data.cjs');
let g=fs.readFileSync(rendererFile,'utf8');
let d=fs.readFileSync(dataFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}
function replaceOnce(source,oldText,newText,label){assert(source.includes(oldText),label+' source not found');const out=source.replace(oldText,newText);assert(!out.includes(oldText),label+' source remains');return out;}

const versionRx=/const\s+APP_VERSION\s*=\s*["'][^"']+["']\s*;/g;
assert((g.match(versionRx)||[]).length===1,'APP_VERSION declaration mismatch');
g=g.replace(versionRx,'const APP_VERSION = "0.81.45";');

const classRange=`  "17_시간표마스터": "'17_시간표마스터'!A1:N1000",`;
assert(d.includes(classRange)&&!d.includes('"17A_교사시간표마스터":'),'teacher timetable sheet range source mismatch');
d=d.replace(classRange,classRange+`\n  "17A_교사시간표마스터": "'17A_교사시간표마스터'!A1:L1100",`);
const classCache=`    timetableRows: rowsFrom("17_시간표마스터").filter(row => row["학년도"] && row["학기"] && row["학년"] && row["반"] && row["요일"] && row["교시"]),`;
assert(d.includes(classCache)&&!d.includes('teacherTimetableRows: rowsFrom("17A_교사시간표마스터")'),'teacher timetable cache source mismatch');
d=d.replace(classCache,classCache+`\n    teacherTimetableRows: rowsFrom("17A_교사시간표마스터").filter(row => row["학년도"] && row["학기"] && row["교사명"] && row["요일"] && row["교시"]),`);

const oldTeacher=`function masterTeacherTimetableData(teacher){
  const rows=masterTimetableRows({grade:"",teacher});
  if(!rows.length)return null;
  const days=["월","화","수","목","금"],week=Array.from({length:7},()=>Array(5).fill(""));
  rows.forEach(row=>{
    const p=Number(row["교시"]),d=days.indexOf(String(row["요일"]||""));
    const grade=String(row["학년"]||"").trim(),classNo=String(row["반"]||"").trim();
    if(p>=1&&p<=7&&d>=0)week[p-1][d]=\`\${row["과목"]||""}|\${grade&&classNo?\`\${grade}-\${classNo}\`:classNo}\`;
  });
  return {week,days,teacher,source:"UEP 시간표마스터",reference:true,changed:0};
}`;
const newTeacher=`function teacherTimetableMasterRows(teacher=""){
  const rows=Array.isArray(readonlyCache?.teacherTimetableRows)?readonlyCache.teacherTimetableRows:[];
  return rows.filter(row=>{
    if(String(row["학년도"]||"")!=="2026"||String(row["학기"]||"")!=="2")return false;
    if(teacher&&uep08123TeacherKey(row["교사명"]||"")!==uep08123TeacherKey(teacher))return false;
    return String(row["적용상태"]||"확정").trim()!=="취소";
  });
}
function masterTeacherTimetableData(teacher){
  // 0.81.45: 학급시간표가 아니라 교사별 PDF 원본 탭을 사용하여 선택과목 동시수업 누락을 막습니다.
  const rows=teacherTimetableMasterRows(teacher);
  if(!rows.length)return null;
  const days=["월","화","수","목","금"],week=Array.from({length:7},()=>Array(5).fill(""));
  rows.forEach(row=>{
    const p=Number(row["교시"]),d=days.indexOf(String(row["요일"]||""));
    const room=String(row["교실"]||"").trim();
    if(p>=1&&p<=7&&d>=0)week[p-1][d]=\`\${row["과목"]||""}|\${room}\`;
  });
  return {week,days,teacher,source:"UEP 교사시간표마스터",reference:true,changed:0};
}`;
g=replaceOnce(g,oldTeacher,newTeacher,'teacher timetable source');

g=replaceOnce(g,
  `  const masterNames=masterTimetableRows({grade:""})\n    .map(row=>String(row?.["교사명"]||"").trim()).filter(Boolean);`,
  `  const masterNames=teacherTimetableMasterRows()\n    .map(row=>String(row?.["교사명"]||"").trim()).filter(Boolean);`,
  'teacher name source');
g=g.replaceAll('17_시간표마스터에 등록된 교사를 선택하세요.','17A_교사시간표마스터에 등록된 교사를 선택하세요.');
g=g.replaceAll('UEP 기본정보 연결시트 · 17_시간표마스터</span></footer></section>','UEP 기본정보 연결시트 · 17A_교사시간표마스터</span></footer></section>');
// 학급·학생 시간표는 기존 17 탭을 계속 사용하고, 교사 화면만 17A 탭을 사용합니다.
const classStart=g.indexOf('function masterClassTimetableMarkup('),classEnd=g.indexOf('\nfunction classTimetableMarkup()',classStart);
assert(classStart>=0&&classEnd>classStart,'class timetable block bounds not found');
const classBlock=g.slice(classStart,classEnd).replace('17A_교사시간표마스터','17_시간표마스터');
g=g.slice(0,classStart)+classBlock+g.slice(classEnd);

for(const marker of [
  'const APP_VERSION = "0.81.45";',
  '"17A_교사시간표마스터":',
  'teacherTimetableRows: rowsFrom("17A_교사시간표마스터")',
  'function teacherTimetableMasterRows(teacher="")',
  'const rows=teacherTimetableMasterRows(teacher);',
  'const room=String(row["교실"]||"").trim();'
])assert((g+d).includes(marker),'missing 0.81.45 marker: '+marker);

fs.writeFileSync(rendererFile,g,'utf8');
fs.writeFileSync(dataFile,d,'utf8');
console.log('UEP 0.81.45 complete teacher timetable source repair applied');
