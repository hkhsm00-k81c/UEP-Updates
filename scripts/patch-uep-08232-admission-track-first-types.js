const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const cp=path.join(root,'resources','app','gyomuon.css');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
let c=fs.readFileSync(cp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.31["'];/.test(g),'0.82.31 renderer base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.31["'];/,'const APP_VERSION = "0.82.32";').replace(/const CURRENT='0\.82\.31';/g,"const CURRENT='0.82.32';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.32';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

// 전형 이해는 '개념을 먼저 만들고 대학을 끼워 넣는 화면'이 아니라,
// 53B의 실제 대학 전형을 53A의 공통 구조로 묶어 이해하는 화면으로 재정의한다.
const typesRe=/function openDashboardAdmissionTypes\(\)\{[\s\S]*?\n\}\n(?=function openDashboardUniversityDetail)/;
must(typesRe.test(g),'openDashboardAdmissionTypes block not found');
const typesFn=`function openDashboardAdmissionTypes(){
  const types=dashboardAdmissionRows('admissionTypes','53_전형이해').filter(dashboardAdmissionEnabled).sort((a,b)=>dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b));
  const detailsRaw=dashboardAdmissionRows('admissionSubtypes','53A_전형세부유형DB');
  const details=(detailsRaw.length?detailsRaw:dashboardAdmissionRows('admissionTypeDetails','53A_전형세부유형DB')).filter(dashboardAdmissionEnabled).sort((a,b)=>dashboardAdmissionOrder(a)-dashboardAdmissionOrder(b));
  let structures=dashboardAdmissionRows('admissionTypeUniversities','53B_전형유형별대학DB');
  if(!structures.length){try{structures=dashboardAdmissionStructureRows()}catch(e){structures=[]}}
  structures=(structures||[]).filter(r=>String(r['UEP노출']??'Y').toUpperCase()!=='N');
  if(!types.length&&!details.length)return openDashboardAdmissionDialog('전형 이해','<p>53_전형이해·53A·53B 자료를 읽지 못했습니다.</p>');
  const normalizeType=v=>String(v||'').replace('정시','수능위주').trim();
  const ids=v=>String(v||'').split(/[,/·]/).map(x=>x.trim()).filter(Boolean);
  const uniq=rows=>{const seen=new Set();return rows.filter(r=>{const key=[r['대학명'],r['캠퍼스'],r['전형명'],r['대전형']].map(v=>String(v||'').trim()).join('|');if(seen.has(key))return false;seen.add(key);return true;});};
  const trackButton=r=>{
    const university=String(r['대학명']||'').trim();
    const campus=String(r['캠퍼스']||'').trim();
    const track=String(r['전형명']||r['대전형']||'').trim();
    const structure=String(r['평가구조요약']||'').trim();
    const minimum=String(r['수능최저']||'').trim();
    const meta=[structure,minimum?('최저 '+minimum):''].filter(Boolean).join(' · ');
    return \`<button type="button" class="admission-track-button" data-admission-university="\${escapeHtml(university)}" data-admission-track="\${escapeHtml(track)}"><b>\${escapeHtml(university)}\${campus?\` <em>\${escapeHtml(campus)}</em>\`:''} · \${escapeHtml(track)}</b>\${meta?\`<small>\${escapeHtml(meta)}</small>\`:''}</button>\`;
  };
  const html=types.map(type=>{
    const broad=normalizeType(type['전형유형']);
    const broadRows=uniq(structures.filter(s=>normalizeType(s['대전형'])===broad));
    const ds=details.filter(d=>normalizeType(d['대전형'])===broad);
    const assigned=new Set();
    const cards=[];
    for(const d of ds){
      const sid=String(d['세부ID']||'').trim();
      const linked=uniq(broadRows.filter(s=>!sid||ids(s['세부유형ID']).includes(sid)));
      if(!linked.length)continue;
      linked.forEach(r=>assigned.add([r['대학명'],r['캠퍼스'],r['전형명'],r['대전형']].map(v=>String(v||'').trim()).join('|')));
      cards.push(\`<article class="admission-track-type-card"><div class="admission-track-card-head"><b>\${escapeHtml(d['세부유형']||type['전형유형']||'')}</b><span>\${linked.length}개 실제 전형</span></div><p>\${escapeHtml(d['대표평가구조']||d['한줄요약']||type['한줄요약']||'')}</p>\${d['수능최저경향']?\`<small><strong>수능최저</strong> · \${escapeHtml(d['수능최저경향'])}</small>\`:''}\${d['담임상담체크']?\`<small><strong>상담체크</strong> · \${escapeHtml(d['담임상담체크'])}</small>\`:''}\${d['고1준비포인트']?\`<small><strong>고1 준비</strong> · \${escapeHtml(d['고1준비포인트'])}</small>\`:''}<div class="admission-track-list">\${linked.map(trackButton).join('')}</div></article>\`);
    }
    const extra=broadRows.filter(r=>!assigned.has([r['대학명'],r['캠퍼스'],r['전형명'],r['대전형']].map(v=>String(v||'').trim()).join('|')));
    if(extra.length){cards.push(\`<article class="admission-track-type-card"><div class="admission-track-card-head"><b>기타 실제 전형</b><span>\${extra.length}개</span></div><p>53B에 공식 구조가 확인되었지만 세부유형ID가 아직 하나로 고정되지 않은 전형입니다.</p><div class="admission-track-list">\${extra.map(trackButton).join('')}</div></article>\`);}
    if(!cards.length)return '';
    return \`<section class="admission-track-section"><div class="admission-track-section-head"><div><h3>\${escapeHtml(type['전형유형']||broad)}</h3><p>\${escapeHtml(type['한줄요약']||'')}</p></div><span>\${broadRows.length}개 실제 전형</span></div><div class="admission-explain-grid admission-track-grid">\${cards.join('')}</div></section>\`;
  }).filter(Boolean).join('');
  const total=uniq(structures).length;
  openDashboardAdmissionDialog('전형 이해 · 실제 대학전형으로 비교',\`<div class="admission-learning-flow admission-track-first"><div class="admission-track-intro"><b>대학 전형을 먼저 모으고, 공통 구조로 이해합니다.</b><span>2028 공식 시행계획 기반 \${total}개 대학·전형 사례 · 대학 이름만이 아니라 ‘대학명 · 실제 전형명’으로 비교</span></div>\${html}<p class="admission-reference-note">53B 실제 대학전형 → 53A 공통 구조 → 53 전형 이해 · 클릭하면 해당 대학 상세의 선발방식·수능최저·내신산정으로 이어집니다.</p></div>\`);
  document.querySelectorAll('.admission-track-button[data-admission-university]').forEach(button=>button.onclick=()=>{window.__uepAdmissionFocusTrack=button.dataset.admissionTrack||'';openDashboardAdmissionUniversityByName(button.dataset.admissionUniversity);});
}
`;
g=g.replace(typesRe,typesFn);

// 전형 이해에서 클릭한 실제 전형을 대학 상세에서도 바로 찾을 수 있게 강조한다.
g += `\n/* UEP_08232_ADMISSION_TRACK_FOCUS */\n(function(){const original=typeof openDashboardUniversityDetail==='function'?openDashboardUniversityDetail:null;if(!original)return;openDashboardUniversityDetail=function(university=dashboardAdmissionTodayUniversity()){const ret=original(university);const track=String(window.__uepAdmissionFocusTrack||'').trim();if(track){setTimeout(()=>{document.querySelectorAll('.uep-uni-detail-line').forEach(line=>{const b=line.querySelector('b');if(b&&String(b.textContent||'').trim()===track){line.classList.add('uep-admission-track-focus');try{line.scrollIntoView({block:'center',behavior:'smooth'})}catch(e){}}});window.__uepAdmissionFocusTrack='';},0);}return ret;};})();\n`;

g += `\n/* UEP_08232_RELEASE_NOTES */\n(function(){const VERSION='0.82.32',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08232'))return;const o=document.createElement('div');o.id='uep-release-08232';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.32 수정사항</h2><ul><li>전형 이해를 53B의 실제 대학 전형을 먼저 모아 53A 공통 구조로 묶는 방식으로 바꿨습니다.</li><li>대학 버튼은 대학명만 표시하지 않고 대학명 · 실제 전형명을 함께 표시합니다.</li><li>각 실제 전형에 선발구조와 수능최저 요약을 함께 보여줍니다.</li><li>전형을 클릭하면 해당 대학 상세로 이동하고 선택한 전형을 바로 강조합니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,1000),{once:true});else setTimeout(show,1000);})();\n`;

c += `\n/* UEP_08232_ADMISSION_TRACK_FIRST */\n.admission-track-intro{display:flex;flex-direction:column;gap:5px;margin:0 0 18px;padding:14px 16px;border:1px solid #dbe7f3;border-radius:14px;background:#f7fbff;color:#334e68}.admission-track-intro b{font-size:15px;color:#17324d}.admission-track-intro span{font-size:13px}.admission-track-section{margin-bottom:24px}.admission-track-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px}.admission-track-section-head h3{margin:0 0 4px}.admission-track-section-head p{margin:0;color:#52606d}.admission-track-section-head>span,.admission-track-card-head>span{flex:0 0 auto;border-radius:999px;background:#edf6ff;color:#17629a;padding:5px 9px;font-size:12px;font-weight:800}.admission-track-grid{align-items:start}.admission-track-type-card{min-height:0!important}.admission-track-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.admission-track-list{display:flex;flex-direction:column;gap:7px;margin-top:12px;padding-top:11px;border-top:1px dashed #dbe5ef}.admission-track-button{width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;padding:9px 11px;border:1px solid #d7e3ef;border-radius:11px;background:#fff;color:#17324d;cursor:pointer;box-shadow:0 1px 2px rgba(15,23,42,.03)}.admission-track-button:hover{border-color:#7db7ef;background:#f7fbff}.admission-track-button b{font-size:13px;line-height:1.35}.admission-track-button b em{font-style:normal;font-size:11px;color:#627d98;font-weight:700}.admission-track-button small{font-size:11px;line-height:1.4;color:#627d98}.uep-admission-track-focus{outline:2px solid #4f8df7;outline-offset:2px;border-radius:8px;background:#f5f9ff!important}@media(max-width:900px){.admission-track-section-head{flex-direction:column}.admission-track-grid{grid-template-columns:1fr!important}}\n`;

must(g.includes('UEP_08232_ADMISSION_TRACK_FOCUS'),'track focus marker missing');
must(g.includes("대학 전형을 먼저 모으고, 공통 구조로 이해합니다."),'track-first renderer missing');
must(g.includes('class="admission-track-button"'),'university+track button missing');
must(c.includes('.admission-track-button'),'track-first css missing');
fs.writeFileSync(gp,g,'utf8');
fs.writeFileSync(cp,c,'utf8');
console.log('UEP 0.82.32 track-first admissions understanding patched');
