const fs=require('fs'),path=require('path');
const root=process.argv[2];if(!root)throw new Error('app root required');
const gp=path.join(root,'gyomuon.js'),mp=path.join(root,'electron','main.cjs'),pp=path.join(root,'package.json'),lp=path.join(root,'package-lock.json');
let g=fs.readFileSync(gp,'utf8'),m=fs.readFileSync(mp,'utf8');
const must=(x,msg)=>{if(!x)throw new Error(msg)};
must(g.includes('0.82.73'),'expected renderer 0.82.73');
g=g.replaceAll('0.82.73','0.82.74');
for(const p of [pp,lp])if(fs.existsSync(p)){let x=fs.readFileSync(p,'utf8').replaceAll('0.82.73','0.82.74');fs.writeFileSync(p,x,'utf8');}

// 1) Staged loader: backend readonly sync is a full data refresh, so never run it once per pseudo-stage.
// Share one in-flight refresh and consider admissions ready only when 56 master actually exists.
const stagedStart="const UEP_08250_LOAD={core:'ready',academic:'waiting',admission:'waiting',running:false};";
const stagedEnd="document.getElementById('userAuthForm')?.addEventListener('submit'";
const si=g.indexOf(stagedStart),ei=g.indexOf(stagedEnd,si);must(si>=0&&ei>si,'staged loader block missing');
const staged=String.raw`const UEP_08250_LOAD={core:'ready',academic:'waiting',admission:'waiting',running:false};
let UEP_08274_STAGE_REFRESH_PROMISE=null;
function uep08250Emit(){try{window.dispatchEvent(new CustomEvent('uep:data-stage',{detail:{...UEP_08250_LOAD}}));}catch{}}
function uep08274AdmissionRowsReady(){return Array.isArray(readonlyCache?.universityAdmissions)&&readonlyCache.universityAdmissions.length>0;}
async function uep08250RefreshStage(stage){
  if(stage==='admission'&&uep08274AdmissionRowsReady()){UEP_08250_LOAD.admission='ready';uep08250Emit();return true;}
  if(UEP_08274_STAGE_REFRESH_PROMISE){await UEP_08274_STAGE_REFRESH_PROMISE;return stage!=='admission'||uep08274AdmissionRowsReady();}
  UEP_08250_LOAD[stage]='loading';uep08250Emit();
  UEP_08274_STAGE_REFRESH_PROMISE=(async()=>{
    try{
      const r=await window.schoolBoard?.previewReadonlySync?.();
      if(!r?.ok)throw new Error(r?.reason||'UEP 자료 동기화 실패');
      const c=await window.schoolBoard?.readReadonlyCache?.();
      if(!c?.ok||!c.data)throw new Error(c?.reason||'UEP 캐시를 읽지 못했습니다.');
      readonlyCache=uep08123NormalizeReadonlyCache(c.data);googleConnectionError='';
      UEP_08250_LOAD.academic='ready';
      UEP_08250_LOAD.admission=uep08274AdmissionRowsReady()?'ready':'error';
      return true;
    }catch(e){
      if(UEP_08250_LOAD[stage]==='loading')UEP_08250_LOAD[stage]='error';
      googleConnectionError=e?.message||String(e);return false;
    }finally{UEP_08274_STAGE_REFRESH_PROMISE=null;uep08250Emit();}
  })();
  await UEP_08274_STAGE_REFRESH_PROMISE;
  return stage!=='admission'||uep08274AdmissionRowsReady();
}
async function uep08250StartBackgroundStages(){
  if(UEP_08250_LOAD.running)return;
  UEP_08250_LOAD.running=true;uep08250Emit();
  try{
    if(uep08274AdmissionRowsReady()){UEP_08250_LOAD.academic='ready';UEP_08250_LOAD.admission='ready';uep08250Emit();return;}
    await uep08250RefreshStage('admission');
  }finally{UEP_08250_LOAD.running=false;uep08250Emit();}
}
async function uep08250PrioritizeAdmission(){
  if(uep08274AdmissionRowsReady()){UEP_08250_LOAD.admission='ready';uep08250Emit();return true;}
  await uep08250RefreshStage('admission');
  return uep08274AdmissionRowsReady();
}
`;
g=g.slice(0,si)+staged+g.slice(ei);

// 2) Native dashboard router: wait for stage-3 admission data instead of declaring 56 missing during a load race.
const oldRouter="$$('[data-dashboard-admission]').forEach(button=>button.onclick=event=>{event.preventDefault();event.stopPropagation();const key=button.dataset.dashboardAdmission;if(key==='basics')return openDashboardAdmissionGuide();if(key==='major')return openDashboardAdmissionMajorSearch();if(key==='types')return openDashboardAdmissionGuide();if(key==='university'){window.__uepAdmissionReturn='today';window.__uepAdmissionRegion='';const u=dashboardAdmissionTodayUniversity();if(u)return openDashboardUniversityDetail(u);return openDashboardAdmissionDialog('오늘의 대학','<p>56_대학입시마스터 자료를 읽지 못했습니다.</p>');}});";
must(g.includes(oldRouter),'native admission router missing');
const newRouter="$$('[data-dashboard-admission]').forEach(button=>button.onclick=async event=>{event.preventDefault();event.stopPropagation();const key=button.dataset.dashboardAdmission;if(key==='basics')return openDashboardAdmissionGuide();if(key==='major')return openDashboardAdmissionMajorSearch();if(key==='types')return openDashboardAdmissionGuide();if(key==='university'){window.__uepAdmissionReturn='today';window.__uepAdmissionRegion='';let u=dashboardAdmissionTodayUniversity();if(u)return openDashboardUniversityDetail(u);openDashboardAdmissionDialog('오늘의 대학','<div class=\"uep-uni-detail-pending\"><b>입시자료 불러오는 중</b><span>56_대학입시마스터와 대학별 입시DB를 연결하고 있습니다.</span></div>');const ok=await uep08250PrioritizeAdmission();u=dashboardAdmissionTodayUniversity();if(ok&&u)return openDashboardUniversityDetail(u);return openDashboardAdmissionDialog('오늘의 대학','<p>입시자료 연결을 완료하지 못했습니다. 동기화 상태를 확인한 뒤 다시 시도해 주세요.</p>');}});";
g=g.replace(oldRouter,newRouter);

// 3) Main loader: admissions belong to the dedicated admissions spreadsheet and are read again later.
// Remove the duplicate/wrong basic-info reads that cause chunk failure + per-sheet retries and long startup latency.
const duplicateAdmissions=`    ["52_대입기초", "'52_대입기초'!A1:N500"],\n    ["53_전형이해", "'53_전형이해'!A1:N500"],\n    ["53A_전형세부유형DB", "'53A_전형세부유형DB'!A1:R500"],\n    ["53B_전형유형별대학DB", "'53B_전형유형별대학DB'!A1:T3000"],\n    ["56_대학입시마스터", "'56_대학입시마스터'!A1:R500"],\n    ["56A_대학상담포인트DB", "'56A_대학상담포인트DB'!A1:P1200"],\n    ["57_내신산정DB", "'57_내신산정DB'!A1:Y1200"],\n    ["58_권장과목DB", "'58_권장과목DB'!A1:P2000"],\n    ["18_학교교육과정DB", "'18_학교교육과정DB'!A1:N1000"],\n    ["54_수능최저DB", "'54_수능최저DB'!A1:U2000"],\n    ["55_대학입결DB", "'55_대학입결DB'!A1:K5000"],`;
must(m.includes(duplicateAdmissions),'duplicate admissions in base entries missing');
m=m.replace(duplicateAdmissions,`    ["18_학교교육과정DB", "'18_학교교육과정DB'!A1:N1000"],`);
must(m.includes("const uep08259AdmissionEntries="),'dedicated admissions loader missing');

fs.writeFileSync(gp,g,'utf8');fs.writeFileSync(mp,m,'utf8');
console.log('UEP 0.82.74 admission stage hotfix applied');
