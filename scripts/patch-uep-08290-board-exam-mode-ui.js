const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const rendererPath=path.join(root,'gyomuon.js');
const indexPath=path.join(root,'index.html');
const packagePath=path.join(root,'package.json');
function read(p){return fs.readFileSync(p,'utf8');}
function write(p,s){fs.writeFileSync(p,s,'utf8');}
function must(c,m){if(!c)throw new Error(m);}
function replaceOnce(text,from,to,label){const i=text.indexOf(from);must(i>=0,label+' source pattern not found');must(text.indexOf(from,i+from.length)<0,label+' source pattern not unique');return text.replace(from,to);}
function replaceRegexOnce(text,re,to,label){const m=text.match(re);must(m&&m.length,label+' source pattern not found');const all=[...text.matchAll(new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g'))];must(all.length===1,label+' source pattern not unique');return text.replace(re,to);}

let renderer=read(rendererPath);
let index=read(indexPath);
const pkg=JSON.parse(read(packagePath));
must(pkg.version==='0.82.89',`baseline package version mismatch: ${pkg.version}`);
pkg.version='0.82.90';
renderer=replaceOnce(renderer,'const APP_VERSION="0.82.89"; /* UEP_08289_BOARD_CONTROL_CENTER_UI */','const APP_VERSION="0.82.90"; /* UEP_08290_BOARD_EXAM_MODE_UI */','runtime version');

// 1) 공지 대상에 특별실을 포함한다. 실제 저장 연결 전까지 대상 UI 구조만 확정한다.
renderer=renderer.replaceAll('<option>내 반</option><option>특정 반</option><option>학년 전체</option><option>전교</option>','<option>내 반</option><option>특정 반</option><option>특별실</option><option>학년 전체</option><option>전교</option>');

// 2) 현재 Board 앱의 공지 표현 능력을 과장하지 않고 명시한다. 현재 Android Board는 제목/핵심문구 텍스트를 렌더링한다.
renderer=replaceOnce(renderer,
  '<div class="board-form-layout"><div class="board-form-card">',
  '<div class="board-format-support"><strong>현재 공지 표시 지원</strong><span class="support-chip ok">텍스트 ✓</span><span class="support-chip wait">링크 · 준비 중</span><span class="support-chip wait">이미지 · 준비 중</span><span class="support-chip wait">유튜브 · 준비 중</span><small>현재 UEP Board 앱은 큰글씨 제목과 작은글씨 내용 중심으로 표시합니다. 지원되지 않는 형식을 되는 것처럼 표시하지 않습니다.</small></div><div class="board-form-layout"><div class="board-form-card">',
  'notice format support');

// 3) 시간표 변경 대상 학급을 현재 Board 마스터 체계(1~3학년, 각 1~9반)로 UI에 모두 제공한다.
const classOptions=['<option>학년·반 선택</option>'];
for(let g=1;g<=3;g++)for(let c=1;c<=9;c++)classOptions.push(`<option>${g}학년 ${c}반</option>`);
renderer=replaceOnce(renderer,
  '<select><option>학년·반 선택</option><option>1학년 1반</option><option>1학년 2반</option><option>직접 선택</option></select>',
  `<select>${classOptions.join('')}</select>`,
  'timetable class options');
renderer=replaceOnce(renderer,'<label>교실<input type="text" placeholder="변경 교실"></label><label>사유<input type="text" placeholder="변경 사유"></label>','<label>장소<input type="text" placeholder="변경 장소"></label><label>사유 <small>선택</small><input type="text" placeholder="미작성 가능"></label>','timetable place/reason');

// 4) 기존 화면 알림 카드를 관리자 전용 시험모드로 교체한다.
renderer=replaceOnce(renderer,
  '<button type="button" class="board-action-card" data-board-tool="message" onclick="selectElectronicBoardTool(\'message\')"><span class="board-action-icon tone-rose">!</span><span class="board-action-copy"><small>즉시 강조 표시</small><strong>화면 알림</strong><em>긴급·즉시 확인 메시지</em></span><span class="board-action-foot">화면 메시지 <b>등록 ›</b></span></button>',
  '${boardAdminUiAllowed()?`<button type="button" class="board-action-card admin-only-card" data-board-tool="exam" onclick="selectElectronicBoardTool(\'exam\')"><span class="board-action-icon tone-rose">✦</span><span class="board-action-copy"><small>관리자 전용</small><strong>시험모드</strong><em>지필·모의고사 현황판 편집</em></span><span class="board-action-foot">시험 화면 <b>편집 ›</b></span></button>`:``}',
  'screen alert action card');

// 5) 관리자 UI 판별과 시험모드 미리보기 편집 함수를 추가한다. 실제 쓰기 권한은 서버 단계에서 다시 검증한다.
renderer=replaceOnce(renderer,'function electronicBoardView(){',`function boardAdminUiAllowed(){
  const role=String(document.getElementById('headerRoleChip')?.textContent||'').trim();
  return role.includes('관리자');
}

function addExamPhaseRow(){
  const host=document.getElementById('boardExamPhaseRows');
  if(!host)return;
  const row=document.createElement('div');
  row.className='exam-phase-row';
  row.innerHTML='<input type="time" aria-label="시작 시각"><input type="time" aria-label="종료 시각"><select aria-label="화면 단계"><option>시험 전</option><option>시험 중</option><option>종료 10분 전</option><option>쉬는 시간</option><option>다음 교시 준비</option></select><select aria-label="화면 구성"><option>현재 교시 중심</option><option>전체 시간표</option><option>현재 + 전체 분할</option><option>긴급공지 중심</option></select><button type="button" class="exam-row-remove" onclick="this.parentElement.remove();previewBoardExamMode()">×</button>';
  host.appendChild(row);
}

function previewBoardExamMode(){
  const name=document.getElementById('boardExamName')?.value.trim()||'2026학년도 시험';
  const type=document.getElementById('boardExamType')?.value||'내신 지필고사';
  const layout=document.getElementById('boardExamLayout')?.value||'현재 + 전체 분할';
  const attendance=document.getElementById('boardExamAttendance')?.value||'숫자만 표시';
  const urgent=document.getElementById('boardExamUrgent')?.value.trim()||'';
  const title=document.getElementById('examPreviewTitle');
  const mode=document.getElementById('examPreviewMode');
  const attend=document.getElementById('examPreviewAttendance');
  const notice=document.getElementById('examPreviewUrgent');
  if(title)title.textContent=name;
  if(mode)mode.textContent=type+' · '+layout;
  if(attend)attend.textContent=attendance==='숨김'?'출결 숨김':'출결현황 · '+attendance;
  if(notice){notice.textContent=urgent||'긴급 정정 공지가 있으면 이 영역에 크게 표시됩니다.';notice.classList.toggle('has-message',Boolean(urgent));}
}

function electronicBoardView(){`,'exam mode helpers');

// 6) 기존 화면 알림 패널 전체를 시험 현황판 편집 페이지로 교체한다.
const examSection=`
    <section class="board-tool-panel" data-board-tool="exam" hidden>
      <div class="board-section-head"><div><small>ADMIN · EXAM BOARD EDITOR</small><h3>시험모드</h3><p>관리자 전용 시험일 전자칠판 현황판 편집기입니다. 현재 Board 앱의 22_시험운영·23_시험시간표 구조를 기반으로 확장합니다.</p></div><span class="admin-lock-badge">관리자 전용</span></div>
      <div class="exam-editor-grid">
        <div class="board-form-card exam-editor-form">
          <div class="board-form-row three"><label>시험 유형<select id="boardExamType" onchange="previewBoardExamMode()"><option>내신 지필고사</option><option>모의고사</option><option>기타 시험</option></select></label><label>시험명<input id="boardExamName" type="text" placeholder="예: 2학기 1차 지필평가" oninput="previewBoardExamMode()"></label><label>시험일<input type="date"></label></div>
          <div class="board-form-row three"><label>적용 대상<select><option>1학년 전체</option><option>2학년 전체</option><option>3학년 전체</option><option>특정 반</option><option>전교</option><option>특별실</option></select></label><label>기본 화면<select id="boardExamLayout" onchange="previewBoardExamMode()"><option>현재 + 전체 분할</option><option>현재 교시 중심</option><option>전체 시간표</option></select></label><label>출결현황<select id="boardExamAttendance" onchange="previewBoardExamMode()"><option>숫자만 표시</option><option>미확인 인원 포함</option><option>숨김</option></select></label></div>

          <div class="exam-editor-block"><div class="exam-editor-block-head"><div><strong>시험 시간표</strong><small>전체시간표를 입력하고 현재 시각에는 해당 교시를 자동 강조하는 구조입니다.</small></div><button type="button" class="btn secondary" disabled>23_시험시간표 불러오기 예정</button></div>
            <div class="exam-period-grid"><label>1교시<input type="text" placeholder="과목"><input type="time"><input type="time"></label><label>2교시<input type="text" placeholder="과목"><input type="time"><input type="time"></label><label>3교시<input type="text" placeholder="과목"><input type="time"><input type="time"></label><label>4교시<input type="text" placeholder="과목"><input type="time"><input type="time"></label></div>
          </div>

          <div class="exam-editor-block"><div class="exam-editor-block-head"><div><strong>시간별 화면 변화</strong><small>시험 전 → 시험 중 → 종료 전 → 쉬는 시간 → 다음 교시 준비처럼 자동 전환할 화면을 편집합니다.</small></div><button type="button" class="btn secondary" onclick="addExamPhaseRow()">+ 단계 추가</button></div>
            <div id="boardExamPhaseRows" class="exam-phase-rows"><div class="exam-phase-row"><input type="time" value="08:20"><input type="time" value="08:39"><select><option selected>시험 전</option><option>시험 중</option><option>종료 10분 전</option><option>쉬는 시간</option><option>다음 교시 준비</option></select><select><option>현재 교시 중심</option><option selected>전체 시간표</option><option>현재 + 전체 분할</option><option>긴급공지 중심</option></select><button type="button" class="exam-row-remove" onclick="this.parentElement.remove()">×</button></div><div class="exam-phase-row"><input type="time" value="08:40"><input type="time" value="09:30"><select><option>시험 전</option><option selected>시험 중</option><option>종료 10분 전</option><option>쉬는 시간</option><option>다음 교시 준비</option></select><select><option selected>현재 교시 중심</option><option>전체 시간표</option><option>현재 + 전체 분할</option><option>긴급공지 중심</option></select><button type="button" class="exam-row-remove" onclick="this.parentElement.remove()">×</button></div></div>
          </div>

          <label><span class="board-field-title">시험문제 긴급 공지</span><small>정오표·문항 오류·시험시간 변경 등 시험 중 즉시 크게 표시할 문구입니다. 시험문제 원문 업로드 기능이 아닙니다.</small><textarea id="boardExamUrgent" rows="3" placeholder="예: 3번 문항 보기 ②를 ③으로 정정합니다." oninput="previewBoardExamMode()"></textarea></label>
          <div class="board-form-row"><label>시험 유의사항 1<input type="text" placeholder="예: 답안지 인적사항 확인"></label><label>시험 유의사항 2<input type="text" placeholder="예: 종료령 전까지 답안 작성"></label></div>
          <div class="board-submit-row"><span>시험모드 적용/해제는 다음 쓰기 API 단계에서 22_시험운영 원본과 연결합니다. 일반 공지와 섞어 저장하지 않습니다.</span><div><button class="btn secondary" type="button" disabled>시험모드 해제 준비 중</button> <button class="btn primary" type="button" disabled>시험모드 적용 준비 중</button></div></div>
        </div>

        <div class="board-preview-card exam-preview-card"><small>교실 전자칠판 미리보기</small><div class="exam-preview-screen"><div class="exam-preview-top"><div><span>운호고등학교 · 시험모드</span><strong id="examPreviewTitle">2026학년도 시험</strong></div><div><span id="examPreviewMode">내신 지필고사 · 현재 + 전체 분할</span><b>09:12</b></div></div><div class="exam-preview-body"><div class="exam-preview-main"><span>현재 시험</span><strong>1교시 · 국어</strong><p>08:40 ~ 09:30</p><div class="exam-preview-timetable"><span>1교시 국어</span><span>2교시 수학</span><span>3교시 영어</span><span>4교시 한국사</span></div></div><div class="exam-preview-side"><div><span>출결현황</span><strong id="examPreviewAttendance">출결현황 · 숫자만 표시</strong><p>기준 28명</p></div><div class="exam-preview-clock"><span>남은 시간</span><strong>18:24</strong></div></div></div><div id="examPreviewUrgent" class="exam-preview-urgent">긴급 정정 공지가 있으면 이 영역에 크게 표시됩니다.</div></div><p>실제 Board는 현재 시각과 시험시간표를 기준으로 시험 전·시험 중·종료 전·쉬는 시간 화면을 자동 선택하도록 확장합니다.</p></div>
      </div>
    </section>`;
renderer=replaceRegexOnce(renderer,/\n\s*<section class="board-tool-panel" data-board-tool="message" hidden>[\s\S]*?<\/section>/,examSection,'screen message panel');

const css=`<style id="uep-08290-exam-mode-style">
.board-format-support{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 14px;padding:12px 14px;border:1px solid #dce8e5;border-radius:16px;background:#f8fbfa}.board-format-support strong{margin-right:4px}.support-chip{padding:5px 9px;border-radius:999px;font-size:12px;font-weight:800}.support-chip.ok{background:#e7f7ef;color:#167b5b}.support-chip.wait{background:#f3f4f7;color:#7a8495}.board-format-support small{flex-basis:100%;color:#6d7787}.admin-only-card{background:linear-gradient(180deg,#fff,#fff9fb)}.admin-lock-badge{padding:7px 10px;border-radius:999px;background:#fff0f3;color:#b23c5a;font-size:12px;font-weight:800}.exam-editor-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(340px,.8fr);gap:14px}.exam-editor-form{display:flex;flex-direction:column;gap:14px}.exam-editor-block{border:1px solid #e1e8ef;border-radius:16px;padding:14px;background:#fbfcfd}.exam-editor-block-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.exam-editor-block-head div{display:flex;flex-direction:column;gap:3px}.exam-editor-block-head small{color:#788494}.exam-period-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.exam-period-grid label{display:grid;grid-template-columns:60px 1fr 110px 110px;align-items:center;gap:8px}.exam-period-grid input{min-width:0}.exam-phase-rows{display:flex;flex-direction:column;gap:8px}.exam-phase-row{display:grid;grid-template-columns:110px 110px 1fr 1.2fr 34px;gap:8px;align-items:center}.exam-row-remove{width:32px;height:32px;border:0;border-radius:10px;background:#fff0f3;color:#b23c5a;font-size:19px;cursor:pointer}.exam-preview-card{position:sticky;top:14px;align-self:start}.exam-preview-screen{background:#17243b;color:white;border-radius:18px;padding:18px;min-height:460px;display:flex;flex-direction:column;gap:14px}.exam-preview-top{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid rgba(255,255,255,.15);padding-bottom:12px}.exam-preview-top>div{display:flex;flex-direction:column;gap:4px}.exam-preview-top strong{font-size:24px}.exam-preview-top b{font-size:30px;text-align:right}.exam-preview-body{display:grid;grid-template-columns:1.35fr .65fr;gap:12px;flex:1}.exam-preview-main,.exam-preview-side>div{background:rgba(255,255,255,.08);border-radius:14px;padding:14px}.exam-preview-main>strong{display:block;font-size:28px;margin:10px 0 4px}.exam-preview-timetable{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:16px}.exam-preview-timetable span{background:rgba(255,255,255,.09);border-radius:10px;padding:8px;font-size:12px}.exam-preview-side{display:flex;flex-direction:column;gap:10px}.exam-preview-side>div{flex:1}.exam-preview-side strong{display:block;margin-top:8px}.exam-preview-clock strong{font-size:34px}.exam-preview-urgent{border-radius:12px;background:rgba(255,255,255,.09);padding:11px 13px;color:#cdd6e5}.exam-preview-urgent.has-message{background:#8f2037;color:#fff;font-weight:800}@media(max-width:1200px){.exam-editor-grid{grid-template-columns:1fr}.exam-preview-card{position:static}.exam-period-grid{grid-template-columns:1fr}.exam-phase-row{grid-template-columns:1fr 1fr}.exam-phase-row select{grid-column:span 1}}
</style>`;
must(!index.includes('uep-08290-exam-mode-style'),'0.82.90 style already exists');
index=replaceOnce(index,'</head>',css+'\n</head>','exam mode CSS');

write(rendererPath,renderer);
write(indexPath,index);
write(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP v0.82.90 Board exam mode UI candidate patched');
