const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};

A(/const\s+APP_VERSION\s*=\s*["']0\.81\.73["']\s*;/.test(g),'0.81.73 version marker missing');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.81\.73["']\s*;/,'const APP_VERSION = "0.81.74";');

const addon=String.raw`

// __UEP_08174_TRANSFER_STUDENT_SUPPORT__
function uepCurrentEnrollment08174(value){
  const row=value||{}, student=row.__student||row;
  const status=String(student?.status||student?.enrollmentStatus||row?.['학적상태']||'').trim();
  if(/전출|자퇴|퇴학|제적|졸업/.test(status))return false;
  return !status||status==='재학'||status==='재학생'||status==='전입';
}
function uepTransferStudent08174(value){
  const row=value||{}, student=row.__student||row;
  return String(student?.status||student?.enrollmentStatus||row?.['학적상태']||'').trim()==='전입';
}
function uepTransferDate08174(student){
  const raw=student?.transferDate||student?.enrollmentDate||student?.startDate||student?.entryDate||student?.affiliationStartDate||student?.['전입일']||student?.['시작일']||'';
  const text=String(raw||'').trim();
  const m=text.match(/(20\d{2})[^0-9]?(\d{1,2})[^0-9]?(\d{1,2})/);
  return m?m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0'):text;
}
function uepStudentSort08174(a,b){
  return String(a?.studentNo||'').localeCompare(String(b?.studentNo||''),'ko',{numeric:true})||String(a?.name||'').localeCompare(String(b?.name||''),'ko');
}

// 학생 존재는 학생마스터를 기준으로 한다. 선택과목행이 아직 없어도 현재 재학생/전입생은 목록에 남긴다.
uepActiveSelectionRows=function(){
  const students=(readonlyCache?.students||[]).filter(uepCurrentEnrollment08174).slice().sort(uepStudentSort08174);
  const source=readonlyCache?.selectionStudentRows||[];
  const byId=new Map(),byNo=new Map();
  source.forEach(row=>{
    const id=String(row?.['학생ID']||'').trim(), no=String(row?.['학번']||'').replace(/\.0$/,'').trim();
    if(id&&!byId.has(id))byId.set(id,row);
    if(no&&!byNo.has(no))byNo.set(no,row);
  });
  return students.map(student=>{
    const id=String(student?.id||'').trim(),no=String(student?.studentNo||'').replace(/\.0$/,'').trim();
    const found=byId.get(id)||byNo.get(no)||null;
    const row=found?{...found}:{};
    const status=String(student?.status||student?.enrollmentStatus||row?.['학적상태']||'재학').trim();
    return {...row,
      '학생ID':row['학생ID']||id,
      '학번':row['학번']||no,
      '성명':row['성명']||student?.name||'',
      '학적상태':row['학적상태']||status,
      __student:student,
      __status:status,
      __selectionDataMissing:!found
    };
  });
};
uepSelectionActiveRow08129=function(row){return uepCurrentEnrollment08174(row);};

const __uepSelectionErrors08174=uepSelectionErrors08105;
uepSelectionErrors08105=function(row){
  const terms=['2-1','2-2','3-1','3-2'];
  const count=terms.reduce((n,term)=>n+uepSelectionTermSubjects(row,term).length,0);
  if(uepTransferStudent08174(row)&&count===0){
    return [{type:'전입생 · 선택과목 자료 없음',term:'',detail:'리로스쿨 원본이 연결되면 이 학생의 선택과목이 자동 반영됩니다.',severity:'안내',informational:true}];
  }
  return __uepSelectionErrors08174(row);
};

function uepScoreNoDataText08174(student,mode,period,exam){
  const transfer=uepTransferStudent08174(student),date=uepTransferDate08174(student);
  const type=mode==='mock'?'모의고사':mode==='internal'?'내신':'성적';
  if(transfer){
    const when=date?(' · 전입일 '+date):'';
    return {title:'전입생 · '+type+' 자료 없음',detail:'전입 이전 자료는 성적 통계에 포함하지 않습니다'+when+'. 실제 자료가 연결되면 자동으로 표시됩니다.'};
  }
  return {title:'조회 결과가 없습니다.',detail:(period==='all'?'전체 누적':scorePeriodLabel(period))+(exam?' · '+exam:'')+' 자료를 확인하세요.'};
}
function uepScoreMissingClassStudents08174(classNo,rows){
  const ids=new Set((rows||[]).map(r=>String(r?.studentId||'')));
  return (readonlyCache?.students||[]).filter(s=>uepCurrentEnrollment08174(s)&&classNumberOf(s)===String(classNo)&&!ids.has(String(s.id||''))).sort(uepStudentSort08174);
}
function uepScoreMissingMarkup08174(students,mode){
  if(!students.length)return '';
  const type=mode==='mock'?'모의고사':mode==='internal'?'내신':'성적';
  return '<section class="uep-transfer-score-missing"><header><b>자료 없음 학생 '+students.length+'명</b><span>학생마스터에는 재학 중이지만 선택 범위의 '+type+' 자료가 없는 학생입니다.</span></header><div>'+students.map(s=>'<span><b>'+escapeHtml(s.studentNo||'')+' '+escapeHtml(s.name||'')+'</b><small>'+(uepTransferStudent08174(s)?'전입생 · 자료 없음':'자료 미등록')+'</small></span>').join('')+'</div></section>';
}
function uepEnsureTransferStyle08174(){
  if(document.getElementById('uepTransferStyle08174'))return;
  const style=document.createElement('style');style.id='uepTransferStyle08174';style.textContent=
    '.uep-transfer-score-missing{margin-top:14px;border:1px solid #dbe7e5;border-radius:16px;background:#fbfefd;padding:14px 16px}.uep-transfer-score-missing header{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-bottom:10px}.uep-transfer-score-missing header b{font-size:14px}.uep-transfer-score-missing header span{font-size:12px;color:#64748b}.uep-transfer-score-missing>div{display:flex;gap:8px;flex-wrap:wrap}.uep-transfer-score-missing>div>span{border:1px solid #dbe7e5;background:#fff;border-radius:10px;padding:7px 9px;display:flex;gap:7px;align-items:center}.uep-transfer-score-missing small{color:#0f766e}'+
    '#uepReleaseNotes08174{position:fixed;inset:0;z-index:9800;background:rgba(15,23,42,.52);display:flex;align-items:center;justify-content:center;padding:24px}.uep-release-dialog-08174{width:min(650px,95vw);background:#fff;border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.28);overflow:hidden}.uep-release-dialog-08174 header{padding:22px 24px 17px;background:#eefaf7;border-bottom:1px solid #d7eee8}.uep-release-dialog-08174 header small{font-weight:900;color:#0f766e;letter-spacing:.08em}.uep-release-dialog-08174 header h3{margin:5px 0 0;font-size:22px}.uep-release-dialog-08174 .body{padding:20px 24px}.uep-release-dialog-08174 ul{margin:0;padding-left:20px;line-height:1.7}.uep-release-dialog-08174 li+li{margin-top:7px}.uep-release-dialog-08174 .actions{display:flex;justify-content:flex-end;padding:0 24px 22px}.uep-release-dialog-08174 .actions button{min-width:120px}';
  document.head.appendChild(style);
}
const __runScoreQuery08174=runScoreQuery;
runScoreQuery=function(){
  const scope=$('#scoreScope')?.value||'class',classNo=$('#scoreClass')?.value||'',studentId=$('#scoreStudent')?.value||'',exam=$('#scoreExam')?.value||'';
  __runScoreQuery08174();
  uepEnsureTransferStyle08174();
  const target=$('#scoreQueryResult');if(!target)return;
  let baseRows=(readonlyCache?.scoreRecords||[]).filter(r=>scoreMode==='combined'||r.scoreType===(scoreMode==='mock'?'모의고사':'내신'));
  if(scorePeriod!=='all')baseRows=baseRows.filter(r=>scorePeriodKey(r)===scorePeriod);
  if(exam)baseRows=baseRows.filter(r=>r.exam===exam);
  if(scope==='individual'&&studentId){
    const student=(readonlyCache?.students||[]).find(s=>String(s.id)===String(studentId));
    const own=baseRows.filter(r=>String(r.studentId)===String(studentId));
    if(student&&!own.length){
      const msg=uepScoreNoDataText08174(student,scoreMode,scorePeriod,exam);
      if(scoreMode==='combined')target.innerHTML='<div class="query-empty"><b>'+escapeHtml(msg.title)+'</b><span>'+escapeHtml(msg.detail)+'</span></div>';
      else target.innerHTML='<div class="query-empty"><b>'+escapeHtml(msg.title)+'</b><span>'+escapeHtml(msg.detail)+'</span></div>';
    }
  }else if(scope==='class'&&classNo&&scoreMode!=='combined'){
    const classRows=baseRows.filter(r=>{const s=(readonlyCache?.students||[]).find(x=>String(x.id)===String(r.studentId));return s&&classNumberOf(s)===String(classNo);});
    const missing=uepScoreMissingClassStudents08174(classNo,classRows);
    if(missing.length)target.insertAdjacentHTML('beforeend',uepScoreMissingMarkup08174(missing,scoreMode));
  }
};

// __UEP_08174_RELEASE_NOTES_POPUP__
const UEP_RELEASE_NOTES_08174={version:'0.81.74',title:'전출입 학생 처리 개선',items:[
  '전입생도 학생마스터 기준으로 교육과정 학생선택 목록에 계속 표시됩니다.',
  '선택과목이 아직 없는 전입생은 자료 없음으로 구분하고 과목별 신청인원에는 포함하지 않습니다.',
  '내신·모의고사 자료가 없는 전입생도 조회 대상에서 사라지지 않으며 자료 없음으로 안내합니다.',
  '성적 평균·등급분포·랭킹은 실제 성적 자료가 있는 학생만 계산하여 기존 통계에 영향을 주지 않습니다.',
  '전출·자퇴·퇴학·제적·졸업 학생은 현재 대상에서는 제외하되 기존 이력은 그대로 보존합니다.'
]};
function uepReleaseNotesKey08174(){return 'uep_release_notes_seen_'+UEP_RELEASE_NOTES_08174.version;}
function uepOpenReleaseNotes08174(force=false){
  try{if(!force&&localStorage.getItem(uepReleaseNotesKey08174())==='Y')return;}catch{}
  if(document.getElementById('uepReleaseNotes08174'))return;
  uepEnsureTransferStyle08174();
  const layer=document.createElement('div');layer.id='uepReleaseNotes08174';
  layer.innerHTML='<div class="uep-release-dialog-08174"><header><small>UEP UPDATE · v'+escapeHtml(UEP_RELEASE_NOTES_08174.version)+'</small><h3>'+escapeHtml(UEP_RELEASE_NOTES_08174.title)+'</h3></header><div class="body"><ul>'+UEP_RELEASE_NOTES_08174.items.map(x=>'<li>'+escapeHtml(x)+'</li>').join('')+'</ul></div><div class="actions"><button type="button" class="btn primary" data-release-notes-ok>확인</button></div></div>';
  document.body.appendChild(layer);
  layer.querySelector('[data-release-notes-ok]')?.addEventListener('click',()=>{try{localStorage.setItem(uepReleaseNotesKey08174(),'Y');}catch{}layer.remove();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>uepOpenReleaseNotes08174(false),1400));else setTimeout(()=>uepOpenReleaseNotes08174(false),1400);
`;

g += addon;
fs.writeFileSync(gFile,g,'utf8');
const out=fs.readFileSync(gFile,'utf8');
for(const marker of ['const APP_VERSION = "0.81.74";','__UEP_08174_TRANSFER_STUDENT_SUPPORT__','uepCurrentEnrollment08174','status===\'전입\'','__UEP_08174_RELEASE_NOTES_POPUP__','UEP_RELEASE_NOTES_08174','전입생 · 선택과목 자료 없음','전입생 · 내신 자료 없음'])A(out.includes(marker),'0.81.74 marker missing: '+marker);
console.log('UEP 0.81.74 transfer student support and release notes applied');
