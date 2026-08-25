const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app',repoRoot=process.argv[3]||process.cwd();
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};
A(/const\s+APP_VERSION\s*=\s*["']0\.81\.70["']\s*;/.test(g),'0.81.70 APP_VERSION missing');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.81\.70["']\s*;/,'const APP_VERSION = "0.81.71";');

// 1) Replace the shared modal body itself. Subject confidentiality is a first-class modal context,
// and Enter submits inside the input before global keyboard guards see the event.
const modalStart=g.indexOf("function sensitivePasswordModal({mode='unlock',configured=sensitivePasswordConfigured()}={}){");
const modalEnd=g.indexOf('\nfunction canConfigureSensitivePassword(){',modalStart);
A(modalStart>=0&&modalEnd>modalStart,'sensitivePasswordModal body not found');
const modal=`function sensitivePasswordModal({mode='unlock',configured=sensitivePasswordConfigured(),kind='sensitive'}={}){
  return new Promise(resolve=>{
    document.getElementById('sensitivePasswordLayer')?.remove();
    const subject=kind==='subject';
    const change=mode==='set'&&configured;
    const label=subject?'선택과목 대외비':'민감정보';
    const layer=document.createElement('div');
    layer.id='sensitivePasswordLayer';
    layer.className='issue-layer sensitive-password-layer';
    layer._resolver=resolve;
    const title=mode==='unlock'?\`${'${label}'} 인증\`:(change?\`${'${label}'} 비밀번호 변경\`:\`${'${label}'} 비밀번호 설정\`);
    const desc=mode==='unlock'?(subject?'과목별 신청현황을 확인하려면 선택과목 대외비 비밀번호를 입력하세요.':'상세정보를 확인하려면 민감정보 비밀번호를 입력하세요.'):'비밀번호 원문은 저장하지 않고 해시값만 기본정보 연결시트의 공용 설정에 보관합니다.';
    layer.innerHTML=\`<div class="issue-dialog sensitive-password-dialog">
      <header><div><small>${'${subject?\'CONFIDENTIAL · CURRICULUM\':\'PRIVACY · SECURITY\'}'}</small><h3>🔒 ${'${title}'}</h3><p>${'${desc}'}</p></div><button type="button" data-sensitive-modal-close>×</button></header>
      <div class="sensitive-password-form">
        ${'${change?\'<label>현재 비밀번호<input type="password" autocomplete="current-password" data-sensitive-current></label>\':\'\'}'}
        <label>${'${mode===\'unlock\'?\'비밀번호\':\'새 비밀번호\'}'}<input type="password" autocomplete="${'${mode===\'unlock\'?\'current-password\':\'new-password\'}'}" data-sensitive-first></label>
        ${'${mode===\'set\'?\'<label>새 비밀번호 확인<input type="password" autocomplete="new-password" data-sensitive-second></label>\':\'\'}'}
        <p class="sensitive-password-error" data-sensitive-error></p>
      </div>
      <div class="modal-actions"><button type="button" class="btn secondary" data-sensitive-modal-close>취소</button><button type="button" class="btn primary" data-sensitive-modal-submit>${'${mode===\'unlock\'?\'인증\':\'저장\'}'}</button></div>
    </div>\`;
    document.body.appendChild(layer);
    const error=msg=>{const el=layer.querySelector('[data-sensitive-error]');if(el)el.textContent=msg||'';};
    const cancel=()=>closeSensitivePasswordModal(null);
    const submit=()=>{
      const current=layer.querySelector('[data-sensitive-current]')?.value||'';
      const first=layer.querySelector('[data-sensitive-first]')?.value||'';
      const second=layer.querySelector('[data-sensitive-second]')?.value||'';
      if(!first)return error('비밀번호를 입력해 주세요.');
      if(mode==='set'&&first.length<4)return error('비밀번호는 4자 이상으로 설정해 주세요.');
      if(mode==='set'&&first!==second)return error('새 비밀번호 확인이 일치하지 않습니다.');
      closeSensitivePasswordModal({current,first});
    };
    layer.querySelectorAll('[data-sensitive-modal-close]').forEach(b=>b.onclick=cancel);
    layer.onclick=e=>{if(e.target===layer)cancel();};
    layer.querySelector('[data-sensitive-modal-submit]').onclick=submit;
    const passwordInputs=[...layer.querySelectorAll('input[type="password"]')];
    passwordInputs.forEach(input=>{
      input.readOnly=false;input.disabled=false;input.inputMode='numeric';input.autocomplete='off';
      input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.stopImmediatePropagation();submit();return;}event.stopImmediatePropagation();},true);
      ['keypress','keyup','beforeinput','input','paste'].forEach(type=>input.addEventListener(type,event=>event.stopImmediatePropagation(),true));
    });
    setTimeout(()=>layer.querySelector('[data-sensitive-current],[data-sensitive-first]')?.focus(),0);
  });
}`;
g=g.slice(0,modalStart)+modal+g.slice(modalEnd);

// 2) Consolidate subject shared-hash reading in the original function and remove later wrappers.
const oldHash="function subjectConfidentialPasswordHash(){return subjectConfidentialSharedHash()||String(localStorage.getItem(UEP_SUBJECT_CONFIDENTIAL_PIN_KEY)||'');}";
A(g.includes(oldHash),'base subjectConfidentialPasswordHash not found');
const newHash="function subjectConfidentialPasswordHash(){const central=typeof uepSharedSettingValue08166==='function'?String(uepSharedSettingValue08166('SUBJECT_CONFIDENTIAL_PIN_HASH')||'').trim():'';return central||subjectConfidentialSharedHash()||String(localStorage.getItem(UEP_SUBJECT_CONFIDENTIAL_PIN_KEY)||'');}";
g=g.replace(oldHash,newHash);
g=g.replace("const result=await sensitivePasswordModal({mode:'set',configured});","const result=await sensitivePasswordModal({mode:'set',configured,kind:'subject'});");
const unlockNeedle="async function unlockSubjectConfidential(){\n  // __UEP_08159_HOMEROOM_SUBJECT_GATE__";
A(g.includes(unlockNeedle),'unlockSubjectConfidential base function not found');
g=g.replace(unlockNeedle,"async function unlockSubjectConfidential(){\n  if(!subjectConfidentialPasswordConfigured()&&typeof uepLoadSharedSecurity08168==='function')await uepLoadSharedSecurity08168(true);\n  // __UEP_08159_HOMEROOM_SUBJECT_GATE__");
g=g.replace("const result=await sensitivePasswordModal({mode:'unlock',configured:true});\n  if(!result)return false;\n  if(await subjectConfidentialDigest", "const result=await sensitivePasswordModal({mode:'unlock',configured:true,kind:'subject'});\n  if(!result)return false;\n  if(await subjectConfidentialDigest");

const wrap68Start=g.indexOf('// 선택과목 비밀번호 게이트는 클릭 직전에 중앙값을 한 번 더 읽는다.');
const wrap68End=g.indexOf('// 민감정보도 화면 진입 전에 중앙 설정을 확보한다.',wrap68Start);
A(wrap68Start>=0&&wrap68End>wrap68Start,'0.81.68 subject unlock wrapper not found');
g=g.slice(0,wrap68Start)+g.slice(wrap68End);
const wrap69Rx=/\/\/ __UEP_08169_SUBJECT_SHARED_HASH__[\s\S]*?subjectConfidentialPasswordConfigured=function\(\)\{return !!subjectConfidentialPasswordHash\(\);\};\s*/;
A(wrap69Rx.test(g),'0.81.69 subject hash wrapper not found');
g=g.replace(wrap69Rx,'');

// 3) Replace the record validator parser with a tested pure core: subject transitions, page-boundary merge,
// metadata exclusion and student-master matching are performed before rule evaluation.
let core=fs.readFileSync(path.join(repoRoot,'scripts','uep-0.81.71-recordbook-core.js'),'utf8');
core=core.replace(/\nif\(typeof module![\s\S]*$/,'').trim();
A(core.includes('function makeNeisRecordbookRecords08171'),'recordbook core function missing');
const parserAnchor=g.indexOf('// __UEP_RECORDBOOK_LOCAL_VALIDATOR_08102__');
const parserStart=g.indexOf('const makeRecords=sheets=>',parserAnchor);
const parserEnd=g.indexOf(';\n    const key=(record,issue)=>',parserStart);
A(parserAnchor>=0&&parserStart>parserAnchor&&parserEnd>parserStart,'recordbook makeRecords block not found');
const adapter=`${core}\n  const makeRecords=sheets=>makeNeisRecordbookRecords08171({\n    sheets,\n    students:Array.isArray(readonlyCache?.students)?readonlyCache.students:[],\n    defaultGrade:(()=>{try{const raw=String(state?.grade||state?.activeGrade||'1').replace(/[^0-9]/g,'');return /^[1-3]$/.test(raw)?raw:'1';}catch(_){return '1';}})(),\n    forbidden,\n    norm\n  })`;
g=g.slice(0,parserStart)+adapter+g.slice(parserEnd);

// Show merged source span when a record crossed a printed page boundary.
g=g.replace("<span>${esc(r.sheet)} ${r.row}행</span>","<span>${esc(r.sheet)} ${r.lastRow&&r.lastRow!==r.row?`${r.row}–${r.lastRow}`:r.row}행</span>");

fs.writeFileSync(gFile,g,'utf8');
const out=fs.readFileSync(gFile,'utf8');
for(const marker of ['const APP_VERSION = "0.81.71"','function makeNeisRecordbookRecords08171','kind:\'subject\'','event.key===\'Enter\'','SUBJECT_CONFIDENTIAL_PIN_HASH','masterMatched'])A(out.includes(marker),'missing marker: '+marker);
A(!out.includes('__UEP_08169_SUBJECT_SHARED_HASH__'),'legacy 0.81.69 subject hash wrapper remains');
A(!out.includes('const __uepUnlockSubjectConfidential08168=unlockSubjectConfidential'),'legacy 0.81.68 subject unlock wrapper remains');
A(out.includes("선택과목 대외비 비밀번호를 입력하세요"),'subject modal wording missing');
console.log('0.81.71 core fixes applied');
