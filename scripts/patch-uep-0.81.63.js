const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const mFile=path.join(root,'resources','app','electron','main.cjs');
let g=fs.readFileSync(gFile,'utf8');
let m=fs.readFileSync(mFile,'utf8');
function assert(c,msg){if(!c)throw new Error(msg);}
function replaceG(oldText,newText,label){assert(g.includes(oldText),label+' anchor missing');g=g.replace(oldText,()=>newText);}
function replaceM(oldText,newText,label){assert(m.includes(oldText),label+' anchor missing');m=m.replace(oldText,()=>newText);}

// Version
assert(/const\s+APP_VERSION\s*=\s*["']0\.81\.62["']\s*;/.test(g),'0.81.62 version anchor missing');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.81\.62["']\s*;/,()=> 'const APP_VERSION = "0.81.63";');

// 1) Curriculum bindings. Function replacers are mandatory: replacement-string `$$` collapses to `$`.
replaceG("$('[data-curriculum-workspace]').forEach(b=>b.onclick=async()=>{/* __UEP_08162_CURRICULUM_BINDINGS__ */",
         "$$('[data-curriculum-workspace]').forEach(b=>b.onclick=async()=>{/* __UEP_08163_CURRICULUM_BINDINGS__ */",
         'curriculum workspace selector');
replaceG("$('[data-cross-student]').forEach(b=>b.onclick=()=>openCurriculumStudentSidePanel(b.dataset.crossStudent));",
         "$$('[data-cross-student]').forEach(b=>b.onclick=()=>openCurriculumStudentSidePanel(b.dataset.crossStudent));",
         'cross student selector');
replaceG("$('[data-curriculum-subject]').forEach(b=>b.onclick=()=>{",
         "$$('[data-curriculum-subject]').forEach(b=>b.onclick=()=>{",
         'subject selector');

// 2) School Read API currently returns calendar-date values one day early for official attendance.
// Apply the correction only after parsing and only for School Read mode, so admin/service-account reads remain untouched.
const parseAnchor='  const data = parseGoogleSheetData(matrices);';
assert(m.includes(parseAnchor),'fetchLiveData parse anchor missing');
const correction=`  const data = parseGoogleSheetData(matrices);\n\n  if(auth?.mode==='school_read_api' && Array.isArray(data?.officialAttendance)){\n    // __UEP_08163_SCHOOL_READ_OFFICIAL_DATE_SHIFT__\n    const addCalendarDay=(value)=>{\n      const key=String(value||'').slice(0,10);\n      if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(key))return value;\n      const d=new Date(key+'T00:00:00Z');\n      d.setUTCDate(d.getUTCDate()+1);\n      return d.toISOString().slice(0,10);\n    };\n    data.officialAttendance=data.officialAttendance.map(row=>({...row,date:addCalendarDay(row?.date)}));\n  }`;
m=m.replace(parseAnchor,()=>correction);

// Save then validate actual emitted text, not patch source text.
fs.writeFileSync(gFile,g,'utf8');
fs.writeFileSync(mFile,m,'utf8');
const gout=fs.readFileSync(gFile,'utf8');
const mout=fs.readFileSync(mFile,'utf8');
for(const marker of ['const APP_VERSION = "0.81.63";','__UEP_08163_CURRICULUM_BINDINGS__']) assert(gout.includes(marker),'missing '+marker);
assert(gout.includes("$$('[data-curriculum-workspace]').forEach"),'workspace binding did not emit $$');
assert(gout.includes("$$('[data-cross-student]').forEach"),'cross binding did not emit $$');
assert(gout.includes("$$('[data-curriculum-subject]').forEach"),'subject binding did not emit $$');
assert(!gout.includes("$('[data-curriculum-workspace]').forEach"),'broken workspace binding remains');
assert(mout.includes('__UEP_08163_SCHOOL_READ_OFFICIAL_DATE_SHIFT__'),'attendance date correction missing');
assert(mout.includes("auth?.mode==='school_read_api'"),'attendance correction not scoped to school-read');
console.log('UEP 0.81.63 client patch applied and emitted output validated');
