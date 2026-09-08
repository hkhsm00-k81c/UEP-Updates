const fs=require('fs');
const path=require('path');
const root=process.argv[2];
if(!root) throw new Error('app root required');
const gyPath=path.join(root,'gyomuon.js');
const mainPath=path.join(root,'electron','main.cjs');
let g=fs.readFileSync(gyPath,'utf8');
let m=fs.readFileSync(mainPath,'utf8');
function replaceOnce(src,before,after,label){const n=src.split(before).length-1;if(n!==1)throw new Error(`${label}: expected 1 match, got ${n}`);return src.replace(before,after);}

// 1) Student contact: admin + grade head + own homeroom only.
g=replaceOnce(g,
'  return {role,isAdmin,isOwnHomeroom,isOtherHomeroom,isReadOnlyLeadership,canEditContact:!isReadOnlyLeadership&&(isAdmin||isOwnHomeroom)};',
'  const canEditContact=!isReadOnlyLeadership&&(isAdmin||role==="grade_head"||isOwnHomeroom); /* UEP_08282_CONTACT_WRITE_SCOPE */\n  return {role,isAdmin,isOwnHomeroom,isOtherHomeroom,isReadOnlyLeadership,canEditContact};',
'contact renderer scope');
m=replaceOnce(m,
'  if(!["admin","homeroom"].includes(role)) throw new Error("학생 연락정보 수정 권한이 없습니다.");',
'  if(!["admin","grade_head","homeroom"].includes(role)) throw new Error("학생 연락정보 수정 권한이 없습니다."); /* UEP_08282_CONTACT_WRITE_SCOPE */',
'contact main scope');

// 2) Duty write: deliberately limited to admin + grade head + homeroom.
m=replaceOnce(m,
"  const allowedRoles=new Set(['admin','grade_head','grade_manager','homeroom','subject','담임','담임교사']); /* UEP_08202_HOMEROOM_DUTY_WRITE */",
"  const allowedRoles=new Set(['admin','grade_head','homeroom']); /* UEP_08282_DUTY_WRITE_SCOPE */",
'night duty scope');
m=replaceOnce(m,
"  const allowedRoles=new Set(['admin','grade_head','grade_manager','homeroom','subject']);",
"  const allowedRoles=new Set(['admin','grade_head','homeroom']); /* UEP_08282_DUTY_WRITE_SCOPE */",
'lunch duty scope');

// 3) Duty calendar editor controls should expose write UI only to the same roles.
const marker="function dutyCalendarMarkup(type, baseDate=dutyCalendarCursor[type]){\n  const year=baseDate.getFullYear(), month=baseDate.getMonth();\n  const rows=dutyMonthRows(type,baseDate), person=currentLoginTeacherName(), title=type===\"lunch\"?\"급식지도\":\"야자감독\";";
const marker2="function dutyCalendarMarkup(type, baseDate=dutyCalendarCursor[type]){\r\n  const year=baseDate.getFullYear(), month=baseDate.getMonth();\r\n  const rows=dutyMonthRows(type,baseDate), person=currentLoginTeacherName(), title=type===\"lunch\"?\"급식지도\":\"야자감독\";";
let found=0;
if(g.includes(marker)){g=g.replace(marker,marker+'\n  const canWriteDuty=["admin","grade_head","homeroom"].includes(currentRoleId()); /* UEP_08282_DUTY_WRITE_UI */');found++;}
if(g.includes(marker2)){g=g.replace(marker2,marker2+'\r\n  const canWriteDuty=["admin","grade_head","homeroom"].includes(currentRoleId()); /* UEP_08282_DUTY_WRITE_UI */');found++;}
if(found!==1) throw new Error('duty calendar marker not found exactly once');
const oldLunch='      if(type===\'lunch\') return `<button type="button" class="duty-cal-entry lunch ${firstGrade?\'first-grade\':\'\'} ${mine?\'mine\':\'\'}" data-lunch-duty-edit="${escapeHtml(row.id||\'\')}" data-lunch-duty-date="${escapeHtml(key)}" data-lunch-duty-teacher="${escapeHtml(teacher)}" data-lunch-duty-type="${escapeHtml(row.dutyType||\'급식실\')}"><b>${escapeHtml(teacher||\'-\')}</b><span>(${escapeHtml(row.dutyType||\'급식실\')})</span>${mine?\'<em>내 근무</em>\':\'\'}</button>`;';
const newLunch='      if(type===\'lunch\') return canWriteDuty?`<button type="button" class="duty-cal-entry lunch ${firstGrade?\'first-grade\':\'\'} ${mine?\'mine\':\'\'}" data-lunch-duty-edit="${escapeHtml(row.id||\'\')}" data-lunch-duty-date="${escapeHtml(key)}" data-lunch-duty-teacher="${escapeHtml(teacher)}" data-lunch-duty-type="${escapeHtml(row.dutyType||\'급식실\')}"><b>${escapeHtml(teacher||\'-\')}</b><span>(${escapeHtml(row.dutyType||\'급식실\')})</span>${mine?\'<em>내 근무</em>\':\'\'}</button>`:`<div class="duty-cal-entry lunch readonly ${firstGrade?\'first-grade\':\'\'} ${mine?\'mine\':\'\'}"><b>${escapeHtml(teacher||\'-\')}</b><span>(${escapeHtml(row.dutyType||\'급식실\')})</span>${mine?\'<em>내 근무</em>\':\'\'}</div>`;';
g=replaceOnce(g,oldLunch,newLunch,'lunch duty UI');
const oldNight='      return `<button type="button" class="duty-cal-entry night ${mine?\'mine\':\'\'}" data-night-duty-edit="${escapeHtml(row.id||\'\')}" data-night-duty-date="${escapeHtml(key)}" data-night-duty-teacher="${escapeHtml(teacher)}"><b>${escapeHtml(teacher||\'-\')}</b>${mine?\'<em>내 근무</em>\':\'\'}</button>`;';
const newNight='      return canWriteDuty?`<button type="button" class="duty-cal-entry night ${mine?\'mine\':\'\'}" data-night-duty-edit="${escapeHtml(row.id||\'\')}" data-night-duty-date="${escapeHtml(key)}" data-night-duty-teacher="${escapeHtml(teacher)}"><b>${escapeHtml(teacher||\'-\')}</b>${mine?\'<em>내 근무</em>\':\'\'}</button>`:`<div class="duty-cal-entry night readonly ${mine?\'mine\':\'\'}"><b>${escapeHtml(teacher||\'-\')}</b>${mine?\'<em>내 근무</em>\':\'\'}</div>`;';
g=replaceOnce(g,oldNight,newNight,'night duty UI');

fs.writeFileSync(gyPath,g,'utf8');
fs.writeFileSync(mainPath,m,'utf8');
console.log('UEP 0.82.82 bidirectional role write patch applied');
