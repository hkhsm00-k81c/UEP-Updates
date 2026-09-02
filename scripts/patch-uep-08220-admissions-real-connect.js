const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const mp=path.join(root,'resources','app','electron','main.cjs');
let g=fs.readFileSync(gp,'utf8');
let m=fs.readFileSync(mp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.19["'];/.test(g),'0.82.19 renderer base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.19["'];/,'const APP_VERSION = "0.82.20";');

const cacheAnchor="  data.admissionTypes=uep08210MatrixObjects(matrices['53_전형이해']);\n  data.universityAdmissions=uep08210MatrixObjects(matrices['56_대학입시마스터']);";
must(m.includes(cacheAnchor),'admissions cache handoff anchor not found');
m=m.replace(cacheAnchor,
"  data.admissionTypes=uep08210MatrixObjects(matrices['53_전형이해']);\n"+
"  data.admissionTypeDetails=uep08210MatrixObjects(matrices['53A_전형세부유형DB']);\n"+
"  data.admissionStructures=uep08210MatrixObjects(matrices['53B_전형유형별대학DB']);\n"+
"  data.universityAdmissionStructures=data.admissionStructures;\n"+
"  data.universityAdmissions=uep08210MatrixObjects(matrices['56_대학입시마스터']);");
const aliasAnchor="  data['53_전형이해']=data.admissionTypes;\n  data['56_대학입시마스터']=data.universityAdmissions;";
must(m.includes(aliasAnchor),'admissions alias anchor not found');
m=m.replace(aliasAnchor,
"  data['53_전형이해']=data.admissionTypes;\n"+
"  data['53A_전형세부유형DB']=data.admissionTypeDetails;\n"+
"  data['53B_전형유형별대학DB']=data.admissionStructures;\n"+
"  data['56_대학입시마스터']=data.universityAdmissions;");

const basicsRe=/function\s+openDashboardAdmissionBasics\s*\(\s*\)\s*\{[\s\S]*?function\s+dashboardAdmissionMethod/;
must(basicsRe.test(g),'openDashboardAdmissionBasics block not found');
const basicsFn=`function openDashboardAdmissionBasics(){
  const rows=dashboardAdmissionRows('admissionBasics','52_대입기초').filter(dashboardAdmissionEnabled).sort((a,b)=>dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b));
  if(!rows.length)return openDashboardAdmissionDialog('대입 기초','<p>52_대입기초 자료를 읽지 못했습니다.</p>');
  const groups=[];
  for(const row of rows){const key=String(row['대분류']||'대입 기초').trim()||'대입 기초';let group=groups.find(x=>x.key===key);if(!group){group={key,rows:[]};groups.push(group);}group.rows.push(row);}
  const html=groups.map(group=>\`<section><h3>\${escapeHtml(group.key)}</h3><div class="admission-explain-grid">\${group.rows.map(row=>\`<article><b>\${escapeHtml(row['주제']||'')}</b><p>\${escapeHtml(row['카드요약']||row['상세설명']||'')}</p>\${row['상세설명']&&row['상세설명']!==row['카드요약']?\`<small>\${escapeHtml(row['상세설명'])}</small>\`:''}\${row['상담포인트']?\`<small><strong>상담</strong> · \${escapeHtml(row['상담포인트'])}</small>\`:''}\${row['주의/오해']?\`<small><strong>주의</strong> · \${escapeHtml(row['주의/오해'])}</small>\`:''}</article>\`).join('')}</div></section>\`).join('');
  openDashboardAdmissionDialog('대입 기초',\`<div class="admission-learning-flow">\${html}<p class="admission-reference-note">52_대입기초 실시간 연결 · 2029 대입 기준, 대학별 세부사항은 최종 모집요강 재확인</p></div>\`);
}
function dashboardAdmissionMethod`;
g=g.replace(basicsRe,basicsFn);

const typesRe=/function\s+openDashboardAdmissionTypes\s*\(\s*\)\s*\{[\s\S]*?function\s+openDashboardUniversityDetail/;
must(typesRe.test(g),'openDashboardAdmissionTypes block not found');
const typesFn=`function openDashboardAdmissionTypes(){
  const types=dashboardAdmissionRows('admissionTypes','53_전형이해').filter(dashboardAdmissionEnabled).sort((a,b)=>dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b));
  const details=dashboardAdmissionRows('admissionTypeDetails','53A_전형세부유형DB').filter(dashboardAdmissionEnabled).sort((a,b)=>dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b));
  const structures=dashboardAdmissionStructureRows().filter(r=>String(r['UEP노출']??'Y').toUpperCase()!=='N');
  if(!types.length&&!details.length)return openDashboardAdmissionDialog('전형 이해','<p>53_전형이해·53A_전형세부유형DB 자료를 읽지 못했습니다.</p>');
  const normalizeType=v=>String(v||'').replace('정시','수능위주').trim();
  const html=types.map(type=>{
    const broad=normalizeType(type['전형유형']);
    const ds=details.filter(d=>normalizeType(d['대전형'])===broad);
    const cards=(ds.length?ds:[type]).map(d=>{
      const sid=String(d['세부ID']||'');
      const linked=structures.filter(s=>normalizeType(s['대전형'])===broad&&(!sid||String(s['세부유형ID']||'').split(',').map(x=>x.trim()).includes(sid)));
      const names=[...new Set(linked.map(s=>s['대학명']).filter(Boolean))];
      const buttons=names.length?\`<div class="admission-university-buttons">\${names.map(name=>\`<button data-admission-university="\${escapeHtml(name)}">\${escapeHtml(name)}</button>\`).join('')}</div>\`:'';
      return \`<article><b>\${escapeHtml(d['세부유형']||type['전형유형']||'')}</b><p>\${escapeHtml(d['대표평가구조']||d['한줄요약']||type['한줄요약']||'')}</p>\${d['수능최저경향']?\`<small><strong>수능최저</strong> · \${escapeHtml(d['수능최저경향'])}</small>\`:''}\${d['담임상담체크']?\`<small><strong>상담체크</strong> · \${escapeHtml(d['담임상담체크'])}</small>\`:''}\${d['고1준비포인트']?\`<small><strong>고1 준비</strong> · \${escapeHtml(d['고1준비포인트'])}</small>\`:''}\${buttons}</article>\`;
    }).join('');
    return \`<section><h3>\${escapeHtml(type['전형유형']||broad)}</h3><p>\${escapeHtml(type['한줄요약']||'')}</p><div class="admission-explain-grid">\${cards}</div></section>\`;
  }).join('');
  openDashboardAdmissionDialog('전형 이해 · 대학별 선발방식 비교',\`<div class="admission-learning-flow">\${html}<p class="admission-reference-note">53_전형이해 + 53A 세부유형 + 53B 실제 대학전형 실시간 연결</p></div>\`);
  document.querySelectorAll('[data-admission-university]').forEach(button=>button.onclick=()=>openDashboardAdmissionUniversityByName(button.dataset.admissionUniversity));
}
function openDashboardUniversityDetail`;
g=g.replace(typesRe,typesFn);

if(!g.includes('UEP_08220_ADMISSIONS_REAL_CONNECT'))g += `\n/* UEP_08220_ADMISSIONS_REAL_CONNECT: 52 -> basics, 53+53A+53B -> types, 56->53B->54->55 -> university */\n`;

must(m.includes("data.admissionTypeDetails=uep08210MatrixObjects(matrices['53A_전형세부유형DB'])"),'53A cache mapping missing');
must(m.includes("data.admissionStructures=uep08210MatrixObjects(matrices['53B_전형유형별대학DB'])"),'53B cache mapping missing');
must(g.includes('52_대입기초 실시간 연결'),'52 dynamic renderer missing');
must(g.includes('53_전형이해 + 53A 세부유형 + 53B 실제 대학전형 실시간 연결'),'53 dynamic renderer missing');
must(g.includes("dashboardAdmissionRows('admissionStructures','53B_전형유형별대학DB'"),'53B renderer source missing');

fs.writeFileSync(gp,g,'utf8');
fs.writeFileSync(mp,m,'utf8');
console.log('UEP 0.82.20 admissions real connection patched');
