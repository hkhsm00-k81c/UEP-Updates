const fs=require('fs');
const path=require('path');
const root=process.argv[2];
if(!root) throw new Error('app root required');
const gyPath=path.join(root,'gyomuon.js');
const mainPath=path.join(root,'electron','main.cjs');
const pkgPath=path.join(root,'package.json');
let g=fs.readFileSync(gyPath,'utf8');
let m=fs.readFileSync(mainPath,'utf8');
function replaceOnce(src,before,after,label){const n=src.split(before).length-1;if(n!==1)throw new Error(`${label}: expected 1 match, got ${n}`);return src.replace(before,after);}

// A. Runtime/package version must match the release tag.
const versionRe=/const APP_VERSION\s*=\s*["'][^"']+["'];(?:\s*\/\*[^*]*\*\/)?/;
if(!versionRe.test(g)) throw new Error('APP_VERSION declaration not found');
g=g.replace(versionRe,'const APP_VERSION="0.82.83"; /* UEP_08283_RUNTIME_VERSION */');
if(!fs.existsSync(pkgPath)) throw new Error('package.json missing');
const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
pkg.version='0.82.83';
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n','utf8');

// B. Normalize effective write role, including secondary homeroom/grade-head roles.
const roleAnchor='function currentRoleId(){return currentUserProfile().primaryRole||"admin";}';
const roleAfter=roleAnchor+'\nfunction currentWriteRoleId(){\n  const p=currentUserProfile();\n  const primary=String(p?.primaryRole||"").trim(), secondary=String(p?.secondaryRole||"").trim();\n  if(primary==="admin")return "admin";\n  if(primary==="grade_head"||secondary==="grade_head")return "grade_head";\n  if(primary==="homeroom"||secondary==="homeroom")return "homeroom";\n  return primary||"subject";\n} /* UEP_08283_EFFECTIVE_WRITE_ROLE */';
if(!g.includes('UEP_08283_EFFECTIVE_WRITE_ROLE')) g=replaceOnce(g,roleAnchor,roleAfter,'effective write role helper');

// C. Student contact uses effective role; own-class restriction remains for homeroom.
const contactRoleOld='  const role=currentRoleId();\n  const isAdmin=role==="admin";\n  const isOwnHomeroom=role==="homeroom"&&ownClass&&studentClass&&String(Number(ownClass))===String(Number(studentClass));';
const contactRoleNew='  const role=currentWriteRoleId(); /* UEP_08283_CONTACT_EFFECTIVE_ROLE */\n  const isAdmin=role==="admin";\n  const isOwnHomeroom=role==="homeroom"&&ownClass&&studentClass&&String(Number(ownClass))===String(Number(studentClass));';
if(!g.includes('UEP_08283_CONTACT_EFFECTIVE_ROLE')) g=replaceOnce(g,contactRoleOld,contactRoleNew,'contact effective role');

// D. Duty UI and duty save payload share the exact same effective role.
if(g.includes('UEP_08282_DUTY_WRITE_UI')){
  g=g.replace('const canWriteDuty=["admin","grade_head","homeroom"].includes(currentRoleId()); /* UEP_08282_DUTY_WRITE_UI */','const canWriteDuty=["admin","grade_head","homeroom"].includes(currentWriteRoleId()); /* UEP_08283_DUTY_WRITE_UI */');
}
if(!g.includes('UEP_08283_DUTY_WRITE_UI')) throw new Error('duty UI effective role patch failed');
let dutyPayloadReplacements=0;
g=g.replace(/role:currentRoleId\(\),requester:currentLoginTeacherName\(\)/g,match=>{dutyPayloadReplacements++;return 'role:currentWriteRoleId(),requester:currentLoginTeacherName()';});
const payloadRoleCount=(g.match(/role:currentWriteRoleId\(\),requester:currentLoginTeacherName\(\)/g)||[]).length;
if(payloadRoleCount<2) throw new Error(`expected duty save payload role normalization >=2, got ${payloadRoleCount}`);

// E. Backend scopes are normalized by function, not by legacy marker strings.
function normalizeDutyFunction(name){
  const re=new RegExp(`(async function ${name}\\(payload=\\{\\}\\) \\{\\s*)const allowedRoles=new Set\\([^;]+;[^\\n]*`);
  const hit=m.match(re); if(!hit) throw new Error(`${name} allowedRoles not found`);
  m=m.replace(re,`$1const allowedRoles=new Set(['admin','grade_head','homeroom']); /* UEP_08283_DUTY_WRITE_SCOPE */`);
}
normalizeDutyFunction('saveNightSupervisor');
normalizeDutyFunction('saveLunchDuty');
const dutyBackend=(m.match(/UEP_08283_DUTY_WRITE_SCOPE/g)||[]).length;
if(dutyBackend!==2) throw new Error(`expected 2 backend duty scope markers, got ${dutyBackend}`);
const contactSaveRe=/(async function saveStudentContact\(payload=\{\}\) \{[\s\S]{0,1200}?const role=String\(payload\.role\|\|""\);\s*)if\(!\[[^\]]+\]\.includes\(role\)\) throw new Error\("학생 연락정보 수정 권한이 없습니다\."\);(?:\s*\/\*[^*]*\*\/)?/;
if(!contactSaveRe.test(m)) throw new Error('contact backend role check not found');
m=m.replace(contactSaveRe,'$1if(!["admin","grade_head","homeroom"].includes(role)) throw new Error("학생 연락정보 수정 권한이 없습니다."); /* UEP_08283_CONTACT_WRITE_SCOPE */');

fs.writeFileSync(gyPath,g,'utf8');
fs.writeFileSync(mainPath,m,'utf8');
console.log('UEP 0.82.83 runtime version + effective homeroom write patch applied');
