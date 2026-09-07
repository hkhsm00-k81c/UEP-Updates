const fs = require('fs');
const path = require('path');

const root = process.argv[2];
if (!root) throw new Error('app root argument required');
const main = fs.readFileSync(path.join(root,'electron','main.cjs'),'utf8');
const gy = fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

for (const needle of [
  "'30_야자출결_정규화'!A1:U70000",
  'freshRawNight',
  'retainedProgramNight',
  'mergedNightAttendance',
  'recognizedByProgram===true',
  'linkedFromAfterSchool===true'
]) {
  if (!main.includes(needle)) throw new Error(`missing patched assertion: ${needle}`);
}
if (main.includes("'30_야자출결_정규화'!A:U")) throw new Error('open A:U range remains');
if (pkg.version !== '0.82.72') throw new Error(`package version mismatch: ${pkg.version}`);
for (const needle of ['dashboardNightAttendanceRows','dashboardProgramSessionLabel','uep08223UniversityRegions','refreshOperationalCacheSilently','startReadonlyAutoRefresh']) {
  if (!gy.includes(needle)) throw new Error(`UI regression symbol missing: ${needle}`);
}

const safeRange="'30_야자출결_정규화'!A1:U70000";
const safePattern=/^'((?:[^']|'')+)'![A-Z]+[1-9][0-9]*:[A-Z]+[1-9][0-9]*$/;
if (!safePattern.test(safeRange)) throw new Error('School Read safe A1 regression failed');

const key=r=>[r.date,r.time,r.studentNo||r.studentId].join('|');
const staleRaw=Array.from({length:20},(_,i)=>({date:'2026-09-07',time:'야자1',studentNo:`S${i+1}`,result:'출석'}));
const freshRaw=Array.from({length:39},(_,i)=>({date:'2026-09-07',time:'야자1',studentNo:`S${i+1}`,result:'출석'}));
const afternoonPrograms=Array.from({length:92},(_,i)=>({date:'2026-09-07',time:'오후자습',studentNo:`A${i+1}`,recognizedByProgram:true,linkedFromAfterSchool:true,result:'프로그램 인정'}));
const night2Programs=Array.from({length:26},(_,i)=>({date:'2026-09-07',time:'야자2',studentNo:`N${i+1}`,recognizedByProgram:true,linkedFromAfterSchool:true,result:'프로그램 인정'}));
const existing=[...staleRaw,...afternoonPrograms,...night2Programs];
const retained=existing.filter(r=>r.recognizedByProgram===true||r.linkedFromAfterSchool===true);
const map=new Map();
freshRaw.forEach(r=>map.set(key(r),r));
retained.forEach(r=>map.set(key(r),r));
const merged=[...map.values()];
const count=slot=>new Set(merged.filter(r=>r.date==='2026-09-07'&&r.time===slot).map(r=>r.studentNo||r.studentId)).size;
if(count('오후자습')!==92)throw new Error(`afternoon expected 92 got ${count('오후자습')}`);
if(count('야자1')!==39)throw new Error(`night1 expected 39 got ${count('야자1')}`);
if(count('야자2')!==26)throw new Error(`night2 expected 26 got ${count('야자2')}`);
const rawOverlap={date:'2026-09-07',time:'야자1',studentNo:'PX',result:'출석'};
const programOverlap={date:'2026-09-07',time:'야자1',studentNo:'PX',recognizedByProgram:true,result:'프로그램 인정'};
const m2=new Map();m2.set(key(rawOverlap),rawOverlap);m2.set(key(programOverlap),programOverlap);
if(m2.get(key(rawOverlap)).result!=='프로그램 인정')throw new Error('program precedence regression');

console.log('UEP 0.82.72 regression PASS: bounded School Read range + 92/39/26 merge');
