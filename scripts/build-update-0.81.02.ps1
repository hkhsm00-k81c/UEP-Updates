$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$preload='app/resources/app/electron/preload.cjs'
$gyo='app/resources/app/gyomuon.js'
$css='app/resources/app/styles.css'
$pkg='app/resources/app/package.json'

$m=Get-Content $main -Raw -Encoding UTF8
$p=Get-Content $preload -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8
$c=Get-Content $css -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.81.01";','const APP_VERSION = "0.81.02";').Replace('v0.81.01','v0.81.02')

if(-not $m.Contains('__UEP_NEIS_RECORDBOOK_LOCAL_INSPECT_08102__')){
$mainAppend=@'

// __UEP_NEIS_RECORDBOOK_LOCAL_INSPECT_08102__
// Read-only local inspection. No Google/Sheets/state write is called from this handler.
ipcMain.handle("recordbook:inspectNeisExcel", async (event) => {
  const owner=BrowserWindow.fromWebContents(event.sender);
  const picked=await dialog.showOpenDialog(owner,{title:"나이스 교과 세특 엑셀 선택",properties:["openFile"],filters:[{name:"나이스 엑셀·CSV",extensions:["xlsx","xls","csv"]}]});
  if(picked.canceled||!picked.filePaths[0])return {ok:false,canceled:true};
  const filePath=picked.filePaths[0],ext=path.extname(filePath).toLowerCase();
  try{
    if(ext===".csv"){
      const raw=await fs.readFile(filePath,"utf8");
      const rows=[];let row=[],cell="",quoted=false;
      for(let i=0;i<raw.length;i++){const ch=raw[i];if(ch==='"'&&quoted&&raw[i+1]==='"'){cell+='"';i++;continue;}if(ch==='"'){quoted=!quoted;continue;}if(ch===","&&!quoted){row.push(cell);cell="";continue;}if((ch==="\n"||ch==="\r")&&!quoted){if(ch==="\r"&&raw[i+1]==="\n")i++;row.push(cell);if(row.some(v=>String(v).trim()))rows.push(row);row=[];cell="";continue;}cell+=ch;}
      row.push(cell);if(row.some(v=>String(v).trim()))rows.push(row);
      return {ok:true,localOnly:true,fileName:path.basename(filePath),sheets:[{name:"CSV",rows}]};
    }
    const ps=String.raw`
$ErrorActionPreference='Stop'
$excel=$null;$books=$null;$book=$null;$result=@()
try{
  $excel=New-Object -ComObject Excel.Application;$excel.Visible=$false;$excel.DisplayAlerts=$false
  $books=$excel.Workbooks;$book=$books.Open($env:UEP_NEIS_FILE,0,$true)
  $sheetLimit=[Math]::Min(10,$book.Worksheets.Count)
  for($s=1;$s -le $sheetLimit;$s++){
    $ws=$book.Worksheets.Item($s);$used=$ws.UsedRange
    $rowCount=[Math]::Min(5000,[int]$used.Rows.Count);$colCount=[Math]::Min(120,[int]$used.Columns.Count);$rows=@()
    for($r=1;$r -le $rowCount;$r++){$line=@();for($col=1;$col -le $colCount;$col++){$line+=([string]$used.Cells.Item($r,$col).Text)};if(($line -join '').Trim().Length -gt 0){$rows+=,@($line)}}
    $result+=@{name=[string]$ws.Name;rows=$rows}
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($used);[void][Runtime.InteropServices.Marshal]::ReleaseComObject($ws)
  }
  $result|ConvertTo-Json -Depth 8 -Compress
}finally{
  if($book){$book.Close($false)};if($excel){$excel.Quit()}
  if($book){[void][Runtime.InteropServices.Marshal]::ReleaseComObject($book)};if($books){[void][Runtime.InteropServices.Marshal]::ReleaseComObject($books)};if($excel){[void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)}
  [GC]::Collect();[GC]::WaitForPendingFinalizers()
}`;
    const {execFile}=require("child_process");
    const stdout=await new Promise((resolve,reject)=>{execFile("powershell.exe",["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-Command",ps],{windowsHide:true,maxBuffer:64*1024*1024,env:{...process.env,UEP_NEIS_FILE:filePath}},(error,out,err)=>error?reject(new Error(String(err||error.message))):resolve(out));});
    const sheets=JSON.parse(String(stdout||"[]").replace(/^\uFEFF/,""));
    return {ok:true,localOnly:true,fileName:path.basename(filePath),sheets:Array.isArray(sheets)?sheets:[sheets]};
  }catch(error){return {ok:false,localOnly:true,reason:"엑셀을 읽지 못했습니다. Microsoft Excel 설치 여부와 파일 형식을 확인해 주세요. "+String(error?.message||error)};}
});
'@
$m+="`r`n"+$mainAppend
}

if(-not $p.Contains('inspectNeisRecordbook:')){$anchor='  platform: process.platform,';if(-not $p.Contains($anchor)){throw 'preload platform anchor not found'};$p=$p.Replace($anchor,'  inspectNeisRecordbook: () => ipcRenderer.invoke("recordbook:inspectNeisExcel"),' + "`r`n" + $anchor)}

if(-not $g.Contains('__UEP_RECORDBOOK_LOCAL_VALIDATOR_08102__')){
$rendererAppend=@'

// __UEP_RECORDBOOK_LOCAL_VALIDATOR_08102__
(function(){
  let localSession={fileName:"",records:[],selected:"all"};
  const forbidden=[
    ["대학명",/(서울대학교|연세대학교|고려대학교|한국기술교육대학교|[가-힣]{2,12}대학교)/g],
    ["학교·기관·단체명",/(운호고|고당|교육청|통계청|유네스코|YMCA|EBS|YTN|유엔|반크|커리어넷)/gi],
    ["기업·브랜드·플랫폼",/(삼성|LG|네이버|다음|카카오톡|구글|유튜브|유투버|페이스북|인스타그램|아이폰|패들렛|구글\s*클래스룸|코카콜라)/gi],
    ["평가·수상·자격",/(모의고사|전국연합|공인어학시험|수상|대회|장학금|자격증|논문\s*투고|도서\s*출간)/g],
    ["가족 사회경제적 지위",/(부모|아버지|어머니|친척).{0,18}(직장|직업|직위|회사|소득|경제)/g],
    ["해외활동",/(해외\s*(여행|봉사|활동|연수)|국외\s*(여행|봉사|활동|연수))/g],
    ["학교 특정 표현",/(우리\s*(학교|반|학급)|본교|교과서명|출판사)/g]
  ];
  const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const norm=v=>String(v||"").normalize("NFKC").replace(/\s+/g," ").trim();
  const findHeader=rows=>{let best={index:0,score:-1,row:rows[0]||[]};rows.slice(0,30).forEach((row,index)=>{const t=row.map(norm).join("|");const score=[/학번|번호/,/성명|학생명|이름/,/과목/,/세부능력|특기사항|세특/].filter(rx=>rx.test(t)).length;if(score>best.score)best={index,score,row};});return best;};
  const makeRecords=sheets=>{
    const out=[];
    (sheets||[]).forEach(sheet=>{const rows=Array.isArray(sheet?.rows)?sheet.rows:[];if(!rows.length)return;const h=findHeader(rows),headers=h.row.map((v,i)=>norm(v)||("열"+(i+1)));
      rows.slice(h.index+1).forEach((row,rowIndex)=>{const cells=(row||[]).map(norm);if(!cells.some(Boolean))return;const by=rx=>{const i=headers.findIndex(x=>rx.test(x));return i>=0?cells[i]:"";};const text=by(/세부능력|특기사항|세특/)||cells.slice().sort((a,b)=>b.length-a.length)[0]||"";if(text.length<15)return;
        const studentNo=by(/학번|학생번호|번호/)||cells.find(x=>/^\d{4}$/.test(x))||"",name=by(/성명|학생명|이름/)||cells.find(x=>/^[가-힣]{2,5}$/.test(x))||"",subject=by(/과목명|과목/)||String(sheet.name||"교과"),issues=[];
        forbidden.forEach(([category,rx])=>{rx.lastIndex=0;const hits=[...text.matchAll(rx)].map(m=>m[0]);if(hits.length)issues.push({level:"주의",category,hits:[...new Set(hits)],reason:"2026 학교생활기록부 기재요령 및 학교 점검 규칙에 따라 확인이 필요한 표현입니다."});});
        if(/[A-Za-z]{12,}/.test(text))issues.push({level:"확인",category:"긴 영문 표현",hits:(text.match(/[A-Za-z][A-Za-z\s-]{11,}/g)||[]).slice(0,4),reason:"불필요한 영문 표현 또는 고유명사 여부를 확인하세요."});
        if(/[=<>±×÷√∑∫^_{}]/.test(text))issues.push({level:"확인",category:"수식·특수기호",hits:(text.match(/[=<>±×÷√∑∫^_{}]+/g)||[]).slice(0,6),reason:"나이스 입력과 한글 서술 원칙에 맞는 표현인지 확인하세요."});
        if(/\b(나는|제가|저는)\b/.test(text))issues.push({level:"확인",category:"학생 자기서술",hits:(text.match(/나는|제가|저는/g)||[]),reason:"교사의 관찰·평가 서술로 작성되었는지 확인하세요."});
        out.push({id:[sheet.name,rowIndex,studentNo,name,subject].join(":"),sheet:String(sheet.name||""),row:rowIndex+h.index+2,studentNo,name,subject,text,issues});
      });
    });
    const groups=new Map();out.forEach(r=>{const key=r.text.replace(/\s+/g,"").replace(/[0-9]/g,"").slice(0,120);if(key.length>45){if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}});groups.forEach(list=>{if(list.length<2)return;list.forEach(r=>r.issues.push({level:"확인",category:"유사·반복 문장",hits:[],reason:"다른 학생 "+(list.length-1)+"명과 앞부분이 매우 유사합니다. 학생별 사실관계를 확인하세요."}));});return out;
  };
  const highlighted=(text,issues)=>{let html=esc(text);[...new Set(issues.flatMap(i=>i.hits||[]))].sort((a,b)=>b.length-a.length).forEach(hit=>{if(hit)html=html.split(esc(hit)).join('<mark>'+esc(hit)+'</mark>');});return html;};
  const renderResults=root=>{const records=localSession.records,total=records.length,attention=records.filter(r=>r.issues.length),normal=total-attention.length,visible=localSession.selected==="issues"?attention:localSession.selected==="normal"?records.filter(r=>!r.issues.length):records,box=root.querySelector("[data-neis-results]");if(!box)return;if(!total){box.innerHTML='<div class="neis-empty"><b>나이스 교과 세특 엑셀을 불러오면 이곳에서만 검증합니다.</b><span>업로드 원문과 검증결과는 Google 시트·입력센터·UEP 상태에 저장되지 않습니다.</span></div>';return;}
    box.innerHTML='<div class="neis-summary"><button data-neis-filter="all"><b>'+total+'</b><span>검증 문장</span></button><button data-neis-filter="issues"><b>'+attention.length+'</b><span>확인 필요</span></button><button data-neis-filter="normal"><b>'+normal+'</b><span>규칙 통과</span></button><em>'+esc(localSession.fileName)+' · 현재 실행 중에만 유지</em></div><div class="neis-record-list">'+visible.map(r=>'<article class="'+(r.issues.length?'attention':'normal')+'"><header><div><small>'+esc([r.studentNo,r.name,r.subject].filter(Boolean).join(" · "))+'</small><h4>'+esc(r.issues.length?r.issues.map(x=>x.category).join(" · "):"발견 사항 없음")+'</h4></div><span>'+esc(r.sheet)+' '+r.row+'행</span></header><p class="neis-original">'+highlighted(r.text,r.issues)+'</p>'+(r.issues.length?'<div class="neis-issues">'+r.issues.map(i=>'<div><b>'+esc(i.level)+' · '+esc(i.category)+'</b><span>'+esc(i.reason)+'</span></div>').join("")+'</div>':'<div class="neis-pass">현재 적용 규칙에서 발견된 사항이 없습니다.</div>')+'</article>').join("")+'</div>';box.querySelectorAll("[data-neis-filter]").forEach(btn=>btn.onclick=()=>{localSession.selected=btn.dataset.neisFilter;renderResults(root);});};
  const mountValidator=profile=>{if(document.querySelector("[data-neis-local-validator]"))return;const root=document.createElement("section");root.dataset.neisLocalValidator="1";root.className="neis-record-validator";root.innerHTML='<header><div><small>NEIS LOCAL RECORD CHECK</small><h3>교과 세부능력 및 특기사항 사전 검증</h3><p>나이스 엑셀을 현재 PC에서만 읽어 금지표현·기재요령·반복문장·수식·영문표현을 점검합니다.</p></div><div><button class="btn primary" data-neis-open>나이스 엑셀 불러오기</button><button class="btn secondary" data-neis-clear>검증자료 지우기</button></div></header><div class="neis-local-lock">🔒 Google 시트 연결·입력센터 저장·자동동기화 없음 · UEP 종료 시 메모리에서 삭제</div><div data-neis-results></div>';profile.insertAdjacentElement("afterend",root);
    root.querySelector("[data-neis-open]").onclick=async()=>{const button=root.querySelector("[data-neis-open]");button.disabled=true;button.textContent="엑셀 읽는 중…";const result=await window.schoolBoard?.inspectNeisRecordbook?.();button.disabled=false;button.textContent="나이스 엑셀 불러오기";if(!result||result.canceled)return;if(!result.ok){toast(result.reason||"나이스 엑셀을 읽지 못했습니다.");return;}localSession={fileName:result.fileName||"나이스 엑셀",records:makeRecords(result.sheets),selected:"all"};renderResults(root);toast("교과 세특 "+localSession.records.length+"건을 로컬에서 검증했습니다.");};
    root.querySelector("[data-neis-clear]").onclick=()=>{localSession={fileName:"",records:[],selected:"all"};renderResults(root);toast("검증 원문과 결과를 현재 메모리에서 지웠습니다.");};renderResults(root);};
  const promoteSdgs=()=>{document.querySelectorAll(".growth-profile-v082,.growth-profile-v081").forEach(profile=>{const intro=profile.querySelector(".growth-profile-intro"),sdgs=profile.querySelector(".growth-sdg-lens");if(intro&&!intro.dataset.compact08102){intro.dataset.compact08102="1";const paragraph=intro.querySelector("p");if(paragraph){const details=document.createElement("details");details.className="growth-guide-details";details.innerHTML='<summary>SDGs 성장 프로파일 안내 보기</summary><p>'+paragraph.innerHTML+'</p>';paragraph.replaceWith(details);}}if(sdgs&&intro&&sdgs.previousElementSibling!==intro)intro.insertAdjacentElement("afterend",sdgs);if(sdgs&&!sdgs.querySelector(".growth-sdg-legend"))sdgs.querySelector("header")?.insertAdjacentHTML("afterend",'<div class="growth-sdg-legend"><span class="confirmed">근거 확인</span><span class="possible">연결 가능</span><span class="empty">근거 없음</span></div>');if(sdgs)sdgs.dataset.primaryEvidenceMap="1";mountValidator(profile);});};
  const observer=new MutationObserver(()=>requestAnimationFrame(promoteSdgs));observer.observe(document.documentElement,{subtree:true,childList:true});document.addEventListener("DOMContentLoaded",promoteSdgs);setTimeout(promoteSdgs,300);window.addEventListener("beforeunload",()=>{localSession={fileName:"",records:[],selected:"all"};});
})();
'@
$g+="`r`n"+$rendererAppend
}

if(-not $c.Contains('__UEP_SDGS_PRIMARY_AND_NEIS_LOCAL_08102__')){
$cssAppend=@'

/* __UEP_SDGS_PRIMARY_AND_NEIS_LOCAL_08102__ */
.growth-profile-v082 .growth-profile-intro,.growth-profile-v081 .growth-profile-intro{padding:18px 22px!important;min-height:0!important}.growth-guide-details{margin-top:8px}.growth-guide-details summary{cursor:pointer;color:#087a69;font-weight:800}.growth-guide-details p{margin:10px 0 0!important}
.growth-sdg-lens[data-primary-evidence-map]{display:block!important;visibility:visible!important;opacity:1!important;margin:14px 0 18px!important;padding:22px!important;border:2px solid #b8ddd5!important;background:linear-gradient(180deg,#fbfffd,#f3faf7)!important}.growth-sdg-lens[data-primary-evidence-map] .growth-sdg-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))!important;gap:10px!important;max-height:none!important;overflow:visible!important;margin-top:12px!important}.growth-sdg-lens[data-primary-evidence-map] .growth-sdg-chip{display:flex!important;visibility:visible!important;opacity:1!important;min-height:98px!important;flex-direction:column!important;align-items:flex-start!important;padding:13px!important;border:1px solid #d9e4e2!important;border-radius:14px!important;background:#f1f3f3!important;color:#6d7a7d!important}.growth-sdg-lens[data-primary-evidence-map] .growth-sdg-chip.confirmed{background:#dff5ec!important;border-color:#4dbb99!important;color:#075f50!important}.growth-sdg-lens[data-primary-evidence-map] .growth-sdg-chip.possible{background:#fffaf0!important;border:1px dashed #d6a84a!important;color:#805b10!important}.growth-sdg-lens[data-primary-evidence-map] .growth-sdg-chip b{font-size:20px}.growth-sdg-lens[data-primary-evidence-map] .growth-sdg-chip span{font-weight:800;margin:5px 0}.growth-sdg-lens[data-primary-evidence-map] .growth-sdg-chip small{margin-top:auto}.growth-sdg-legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.growth-sdg-legend span{padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800}.growth-sdg-legend .confirmed{background:#dff5ec;color:#075f50}.growth-sdg-legend .possible{background:#fff3d5;color:#805b10}.growth-sdg-legend .empty{background:#eef1f1;color:#6d7a7d}
.neis-record-validator{margin:18px 0;padding:22px;border:1px solid #cfe0dd;border-radius:20px;background:#fff}.neis-record-validator>header{display:flex;justify-content:space-between;align-items:flex-start;gap:18px}.neis-record-validator>header>div:last-child{display:flex;gap:8px}.neis-record-validator h3{margin:5px 0}.neis-record-validator p{margin:4px 0;color:#526b70}.neis-local-lock{margin:14px 0;padding:10px 13px;border-radius:12px;background:#eaf8f4;color:#087563;font-weight:800;font-size:12px}.neis-empty{padding:28px;border:1px dashed #cbdad7;border-radius:14px;display:flex;flex-direction:column;gap:6px;text-align:center;color:#61767a}.neis-summary{display:grid;grid-template-columns:repeat(3,minmax(110px,160px)) 1fr;gap:10px}.neis-summary button{border:1px solid #d9e5e2;border-radius:13px;background:#f8fbfa;padding:12px;text-align:left}.neis-summary button b{display:block;font-size:22px;color:#087563}.neis-summary em{align-self:center;justify-self:end;font-style:normal;color:#6d7a7d;font-size:12px}.neis-record-list{display:grid;gap:12px;margin-top:14px}.neis-record-list article{padding:16px;border:1px solid #e0e8e6;border-radius:15px}.neis-record-list article.attention{border-left:5px solid #e4a33a}.neis-record-list article.normal{border-left:5px solid #50b798}.neis-record-list header{display:flex;justify-content:space-between}.neis-record-list h4{margin:4px 0}.neis-original{padding:13px!important;border-radius:11px;background:#f7f9f9;color:#263c40!important;line-height:1.7}.neis-original mark{background:#ffe3a3;color:#704b00}.neis-issues{display:grid;gap:7px}.neis-issues div{display:flex;gap:12px;padding:9px 11px;border-radius:9px;background:#fff7e9}.neis-issues b{min-width:150px;color:#8a5a00}.neis-issues span,.neis-pass{font-size:12px;color:#65777a}.neis-pass{padding:9px 11px;background:#edf8f4;border-radius:9px}@media(max-width:1000px){.neis-record-validator>header{flex-direction:column}.neis-summary{grid-template-columns:repeat(3,1fr)}.neis-summary em{grid-column:1/-1;justify-self:start}}
'@
$c+="`r`n"+$cssAppend
}

Set-Content $main $m -Encoding UTF8;Set-Content $preload $p -Encoding UTF8;Set-Content $gyo $g -Encoding UTF8;Set-Content $css $c -Encoding UTF8
node --check $main;if($LASTEXITCODE -ne 0){throw 'main syntax failed'};node --check $preload;if($LASTEXITCODE -ne 0){throw 'preload syntax failed'};node --check $gyo;if($LASTEXITCODE -ne 0){throw 'gyomuon syntax failed'}
$checks=[ordered]@{'version 0.81.02'=$g.Contains('const APP_VERSION = "0.81.02";');'SDGs all 17 source cards'=$g.Contains('const chips=[...map.values()].map');'SDGs primary reorder'=$g.Contains('intro.insertAdjacentElement("afterend",sdgs)');'SDGs three-state legend'=$g.Contains('근거 확인</span><span class="possible">연결 가능');'SDGs visible'=$c.Contains('.growth-sdg-chip{display:flex!important');'NEIS local IPC'=$m.Contains('recordbook:inspectNeisExcel');'NEIS readonly Excel'=$m.Contains('$book=$books.Open($env:UEP_NEIS_FILE,0,$true)');'NEIS preload'=$p.Contains('inspectNeisRecordbook:');'NEIS no sheet write'=$g.Contains('Google 시트 연결·입력센터 저장·자동동기화 없음');'NEIS memory clear'=$g.Contains('beforeunload');'selection 06 preserved'=$g.Contains('for(const raw of (readonlyCache?.subjectSelections||[]))');'privacy preserved'=$g.Contains('privacyModeButton');'meal preserved'=$g.Contains('saveLunchDuty');'dorm outing preserved'=$g.Contains('dormOutings')}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)};if($checks.Values -contains $false){throw 'UEP 0.81.02 verification failed'}
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$package.version='0.81.02';$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.81.02 SDGs primary evidence map + local-only NEIS recordbook validator applied.'
