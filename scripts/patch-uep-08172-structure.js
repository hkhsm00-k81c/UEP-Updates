const fs=require('fs');
const g='app/resources/app/gyomuon.js';
const m='app/resources/app/electron/main.cjs';
const p='app/resources/app/electron/preload.cjs';
let gy=fs.readFileSync(g,'utf8');
let main=fs.readFileSync(m,'utf8');
let pre=fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const replaceOnce=(src,from,to,label)=>{must(src.includes(from),`missing ${label}`);must(src.indexOf(from)===src.lastIndexOf(from),`non-unique ${label}`);return src.replace(from,to)};

// Remove the old DOM-wide 0.81.34 repair block. Its surviving responsibilities are integrated below.
const legacy=/\/\* UEP_08134_CURRICULUM_SECURITY_START \*\/[\s\S]*?\/\* UEP_08134_CURRICULUM_SECURITY_END \*\//;
must(legacy.test(gy),'08134 legacy block not found');
gy=gy.replace(legacy,'/* 0.81.72: 0.81.34 DOM repair retired; curriculum/security responsibilities are integrated into canonical runtime. */');

// Canonical curriculum workspace: no DOM injection/polling.
const plan={
  '1-1':[['공통·학교지정','',['공통국어1','공통수학1','공통영어1','한국사1','통합사회1','통합과학1','과학탐구실험1','체육1','음악','정보']]],
  '1-2':[['공통·학교지정','',['공통국어2','공통수학2','공통영어2','한국사2','통합사회2','통합과학2','과학탐구실험2','체육2','미술','한문']]],
  '2-1':[['공통·학교지정','',['문학','대수*','영어Ⅰ','운동과 건강','음악','정보*']],['탐구·교과 선택','택3',['독서 토론과 글쓰기','세계 문화와 영어','인공지능 수학*','세계사','현대사회와 윤리','도시의 미래 탐구','경제','물리학*','화학','생명과학','지구과학']],['제2외국어·정보','택1',['중국어','일본어','인공지능 기초*']],['예술','택1',['음악 연주와 창작','미술 창작']]],
  '2-2':[['공통·학교지정','',['화법과 언어','미적분Ⅰ*','영어Ⅱ','스포츠 문화','미술','한문']],['탐구·교과 선택','택3',['문학과 영상','미디어 영어*','기하*','세계시민과 지리','사회와 문화','동아시아 역사 기행','인문학과 윤리','역학과 에너지','물질과 에너지','세포와 물질대사','지구시스템과학']],['제2외국어·정보','택1',['중국어 회화','일본어 회화','정보과학*']],['예술','택1',['음악과 미디어','미술과 매체']]],
  '3-1':[['공통·학교지정','',['독서와 작문','확률과 통계*','영어 독해와 작문','스포츠 과학']],['전공심화 선택','택5',['언어생활 탐구','미적분Ⅱ*','영미 문학 읽기','한국지리 탐구','정치','법과 사회','윤리와 사상','역사로 탐구하는 현대세계','역학과 에너지','전자기와 양자','물질과 에너지','화학 반응의 세계','세포와 물질대사','생물의 유전','지구시스템과학','행성우주과학']],['제2외국어·정보','택1',['데이터 과학*','심화 중국어','심화 일본어','한문 고전 읽기']]],
  '3-2':[['공통·학교지정','',['스포츠 생활1']],['전공심화 선택','택7',['주제 탐구 독서','매체 의사소통','전문수학*','수학과 문화','심화영어','심화영어 독해와 작문','여행지리','사회문제탐구','금융과 경제생활','윤리문제탐구','과학의 역사와 문화','기후변화와 환경생태','융합과학 탐구*']],['제2외국어·정보','택1',['소프트웨어와 생활*','중국 문화','일본 문화','언어생활과 한자']]]
};
const oldNav=`function uepCurriculumNav(){return '<div class="selection-analysis-tabs curriculum-final-tabs"><button data-curriculum-workspace="students" class="'+(curriculumWorkspaceMode==='students'?'active':'')+'">학생신청</button><button data-curriculum-workspace="cross" class="'+(curriculumWorkspaceMode==='cross'?'active':'')+'">문이과 교차오류</button><button data-curriculum-workspace="subjects" class="'+(curriculumWorkspaceMode==='subjects'?'active':'')+'">과목별 신청현황</button></div>';}`;
const planSource=`const UEP_CURRICULUM_PLAN_08172=${JSON.stringify(plan)};
function uepCurriculumPlanView(){
  const semesters=Object.entries(UEP_CURRICULUM_PLAN_08172).map(([term,blocks])=>'<section class="curriculum-student-detail"><header><div><small>SCHOOL CURRICULUM</small><h3>'+term.replace('-','학년 ')+'학기</h3></div></header><div class="selection-group-stack">'+blocks.map(([label,pick,subjects])=>'<div class="selection-choice-group"><div class="selection-choice-head"><b>'+escapeHtml(label)+'</b><span>'+escapeHtml(pick||'학교지정')+'</span></div>'+subjects.map(subject=>'<article><b>'+escapeHtml(subject)+'</b></article>').join('')+'</div>').join('')+'</div></section>').join('');
  return '<section class="curriculum-mode-block"><div class="settings-section-head"><div><small>2026 COHORT · 3 YEAR PLAN</small><h2>2026학년도 입학생 3개년 교육과정 편성표</h2><p>학생신청·교차오류·과목별 현황과 동일한 교육과정 작업공간에서 확인합니다.</p></div></div><div class="curriculum-term-grid">'+semesters+'</div></section>';
}
function uepCurriculumNav(){return '<div class="selection-analysis-tabs curriculum-final-tabs"><button data-curriculum-workspace="plan" class="'+(curriculumWorkspaceMode==='plan'?'active':'')+'">교육과정 편성표</button><button data-curriculum-workspace="students" class="'+(curriculumWorkspaceMode==='students'?'active':'')+'">학생신청</button><button data-curriculum-workspace="cross" class="'+(curriculumWorkspaceMode==='cross'?'active':'')+'">문이과 교차오류</button><button data-curriculum-workspace="subjects" class="'+(curriculumWorkspaceMode==='subjects'?'active':'')+'">과목별 신청현황</button></div>';}`;
gy=replaceOnce(gy,oldNav,planSource,'curriculum nav');
const oldFinal=`function uepCurriculumFinalView(){const workspace=curriculumWorkspaceMode==='students'?uepStudentApplicationView():curriculumWorkspaceMode==='cross'?uepCrossTrackView08161():uepSubjectApplicationView();return '<div class="module-page records-v0601 curriculum-final-page">'+uepMainRecordTabs()+uepCurriculumNav()+workspace+'</div>';}`;
const newFinal=`function uepCurriculumFinalView(){const workspace=curriculumWorkspaceMode==='plan'?uepCurriculumPlanView():curriculumWorkspaceMode==='students'?uepStudentApplicationView():curriculumWorkspaceMode==='cross'?uepCrossTrackView08161():uepSubjectApplicationView();return '<div class="module-page records-v0601 curriculum-final-page">'+uepMainRecordTabs()+uepCurriculumNav()+workspace+'</div>';}`;
gy=replaceOnce(gy,oldFinal,newFinal,'curriculum final view');

// Subject detail opens as the right-side panel directly in its canonical modal function.
const modalOld=`document.body.appendChild(layer);layer.querySelector('[data-subject-modal-close]').onclick=()=>layer.remove();`;
const modalNew=`document.body.appendChild(layer);const subjectPanel=layer.querySelector('.subject-roster-modal');if(subjectPanel)subjectPanel.style.cssText+=';position:fixed;top:0;right:0;left:auto;bottom:0;width:min(720px,48vw);max-width:720px;height:100vh;max-height:100vh;border-radius:18px 0 0 18px;overflow:auto;z-index:99999';layer.querySelector('[data-subject-modal-close]').onclick=()=>layer.remove();`;
gy=replaceOnce(gy,modalOld,modalNew,'subject modal core');

// Renderer operational refresh: ten-minute routine refresh no longer performs a full data graph sync.
const autoAnchor='function startReadonlyAutoRefresh(){';
must(gy.includes(autoAnchor),'auto refresh anchor missing');
const operationalRenderer=`let operationalRefreshInFlight=null;
async function refreshOperationalCacheSilently({rerender=true}={}){
  if(operationalRefreshInFlight)return operationalRefreshInFlight;
  if(!window.schoolBoard?.previewOperationalSync)return refreshReadonlyCacheSilently({force:true,rerender});
  operationalRefreshInFlight=(async()=>{
    if(!googleConnectionStatus?.ok)return false;
    try{
      const result=await window.schoolBoard.previewOperationalSync();
      if(result?.requiresFullSync)return refreshReadonlyCacheSilently({force:true,rerender});
      if(!result?.ok)throw new Error(result?.reason||'UEP 운영자료 갱신 실패');
      if(result.patch&&typeof result.patch==='object')readonlyCache={...(readonlyCache||{}),...result.patch,syncedAt:result.syncedAt||new Date().toISOString()};
      googleConnectionError='';updateTopSyncStatus();updateDormOutingCount();
      if(rerender&&state.activePage)render(state.activePage);
      return true;
    }catch(error){googleConnectionError=error?.message||String(error);updateTopSyncStatus();return false;}
  })();
  try{return await operationalRefreshInFlight;}finally{operationalRefreshInFlight=null;}
}
`;
gy=gy.replace(autoAnchor,operationalRenderer+autoAnchor);
const autoOld=`    refreshReadonlyCacheSilently({force:true,rerender:true});`;
must(gy.includes(autoOld),'auto full refresh call missing');
gy=gy.replace(autoOld,`    refreshOperationalCacheSilently({rerender:true});`);

// Shared security config uses local/cached hashes unless missing; admin changes still update centrally immediately.
gy=gy.replace(`setInterval(()=>uepLoadSharedSecurity08168(true),10*60*1000);`,`setInterval(()=>uepLoadSharedSecurity08168(false),10*60*1000);`);

// Main-process partial reader for genuinely high-change operational domains.
const fetchAnchor='async function fetchLiveData({ force = false, credentials = null } = {}) {';
must(main.includes(fetchAnchor),'fetchLiveData anchor missing');
const operationalMain=`const UEP_OPERATIONAL_RANGE_NAMES=Object.freeze(['30_공식출결기록','31_지각기록','40_공지마감','44_공지확인현황','42_급식지도계획','43_야자감독계획']);
async function fetchOperationalData({credentials=null}={}){
  if(!liveDataCache)return {ok:false,requiresFullSync:true,reason:'전체 캐시가 아직 준비되지 않았습니다.'};
  const auth=await getReadonlySheetsAuth(credentials),token=auth.token;
  const result=await readSheetBatch(token,UEP_SPREADSHEET_ID,UEP_OPERATIONAL_RANGE_NAMES.map(name=>SHEET_RANGES[name]));
  const matrices={};UEP_OPERATIONAL_RANGE_NAMES.forEach((name,index)=>{matrices[name]=result?.[index]?.values||[];});
  const partial=parseGoogleSheetData(matrices);
  if(auth?.mode==='school_read_api'&&Array.isArray(partial?.officialAttendance)){
    const addCalendarDay=value=>{const key=String(value||'').slice(0,10);if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(key))return value;const d=new Date(key+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);};
    partial.officialAttendance=partial.officialAttendance.map(row=>({...row,date:addCalendarDay(row?.date)}));
  }
  const patch={officialAttendance:partial.officialAttendance||[],lateAttendance:partial.lateAttendance||[],notices:partial.notices||[],noticeReceipts:partial.noticeReceipts||[],lunchDuties:partial.lunchDuties||[],nightSupervisors:partial.nightSupervisors||[]};
  const syncedAt=new Date().toISOString();liveDataCache={...liveDataCache,...patch,syncedAt};liveDataFetchedAt=Date.now();
  return {ok:true,syncedAt,patch};
}

`;
main=main.replace(fetchAnchor,operationalMain+fetchAnchor);
const ipcAnchor='ipcMain.handle("google:previewReadonlySync", async () => {';
must(main.includes(ipcAnchor),'preview readonly IPC anchor missing');
main=main.replace(ipcAnchor,`ipcMain.handle("google:previewOperationalSync", async () => {try{return await fetchOperationalData();}catch(error){return {ok:false,reason:error?.message||'UEP 운영자료 갱신 실패'};}});\n  `+ipcAnchor);

const preAnchor='previewReadonlySync: () => ipcRenderer.invoke("google:previewReadonlySync"),';
must(pre.includes(preAnchor),'preload preview anchor missing');
pre=pre.replace(preAnchor,preAnchor+'\n  previewOperationalSync: () => ipcRenderer.invoke("google:previewOperationalSync"),');

// Candidate version only; this script does not publish or promote.
gy=gy.replace(/0\.81\.71/g,'0.81.72');
main=main.replace(/0\.81\.71/g,'0.81.72');
pre=pre.replace(/0\.81\.71/g,'0.81.72');
fs.writeFileSync(g,gy,'utf8');fs.writeFileSync(m,main,'utf8');fs.writeFileSync(p,pre,'utf8');
const pkg='app/resources/app/package.json';
if(fs.existsSync(pkg)){let x=fs.readFileSync(pkg,'utf8');x=x.replace(/"version"\s*:\s*"0\.81\.71"/,'"version": "0.81.72"');fs.writeFileSync(pkg,x,'utf8');}
console.log('UEP 0.81.72 structural integration applied');
