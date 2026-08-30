const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const pFile=path.join(root,'resources','app','package.json');
const mFile=path.join(root,'resources','app','electron','main.cjs');
const preFile=path.join(root,'resources','app','electron','preload.cjs');
let g=fs.readFileSync(gFile,'utf8');
let m=fs.readFileSync(mFile,'utf8');
let pre=fs.readFileSync(preFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};
const q=s=>JSON.stringify(String(s));

A(g.includes('const APP_VERSION = "0.81.94";'),'0.81.94 baseline anchor missing');
A(g.includes('UEP_08194_SELECTION_ERROR_SOURCE_START'),'0.81.94 selection source missing');
A(g.includes('UEP_08188_SUBJECT_CARD_PERFORMANCE_START'),'0.81.88 subject-card block missing');
A(!g.includes('UEP_08195_SELECTION_NORMALIZER_START'),'0.81.95 already patched');
g=g.replace('const APP_VERSION = "0.81.94";','const APP_VERSION = "0.81.95";');

function functionRange(src,name){
  const start=src.indexOf('function '+name+'(');A(start>=0,'function missing: '+name);
  const brace=src.indexOf('{',start);let depth=0,quote=null,esc=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i];
    if(quote){if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(c===quote)quote=null;continue}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue}
    if(c==='{')depth++;else if(c==='}'&&--depth===0)return[start,i+1];
  }
  throw new Error('unterminated function '+name);
}

const normalizer=String.raw`
/* UEP_08195_SELECTION_NORMALIZER_START */
(function(){
  if(typeof window==='undefined'||window.__UEP08195SelectionNormalizerInstalled)return;
  window.__UEP08195SelectionNormalizerInstalled=true;
  const base=window.uepSelectionDataset||uepSelectionDataset;
  if(typeof base!=='function')return;
  const TERMS=['2-1','2-2','3-1','3-2'];
  const norm=v=>String(v??'').normalize('NFKC').replace(/[\\s·ㆍ._*()\-]/g,'').trim();
  const clean=v=>String(v??'').trim();
  const split=v=>clean(v).split('|').map(x=>x.trim()).filter(Boolean);
  const active=r=>!['N','NO','FALSE','0','비활성'].includes(clean(r?.['활성']).toUpperCase());
  const inactive=s=>/자퇴|전출|퇴학|제적/.test(clean(s?.status||s?.schoolStatus||s?.['학적상태']));
  const sid=x=>clean(x?.student?.id||x?.student?.studentNo||x?.__student?.id||x?.__student?.studentNo||x?.id||x?.studentId||x?.studentNo);
  const toSet=a=>new Set((a||[]).map(sid).filter(Boolean));
  const intersect=(a,b)=>new Set([...a].filter(x=>b.has(x)));
  const minus=(a,b)=>new Set([...a].filter(x=>!b.has(x)));
  const dup=a=>{const seen=new Set(),out=new Set();for(const x of a||[]){const k=norm(x);if(!k)continue;if(seen.has(k))out.add(clean(x));else seen.add(k)}return[...out]};
  const termFlow=r=>{const raw=clean(r?.['연계학기']||r?.['학기']);const p=raw.split(/→|->/).map(x=>x.trim()).filter(Boolean);return p.length>1?p:[clean(r?.['학기']),clean(r?.['연계학기'])].filter(Boolean)};
  const gradeOfTerm=t=>String(t||'').startsWith('3-')?'3':'2';
  const termSubjects=(row,term)=>typeof uepSelectionTermSubjects==='function'?(uepSelectionTermSubjects(row,term)||[]):[];
  const errorKey=e=>[sid(e),clean(e.type),clean(e.term),norm(e.subject),clean(e.ruleId)].join('|');
  const mkError=(student,type,term,subject,rule,detail,extra={})=>({student,type,term:term||'',terms:term?[term]:[],subject:subject||'',subjects:subject?[subject]:[],detail,message:detail,path:term||String(extra.grade||'')+'학년',ruleId:clean(rule?.['규칙ID']),severity:extra.severity||'오류',decision:clean(rule?.['관리자결정']),__source:'UEP-native-08195',...extra});
  const stats=students=>{const vals=(students||[]).map(x=>Number(x?.avg)).filter(Number.isFinite).map(x=>Math.max(1,Math.min(5,x))),bins=[0,0,0,0,0];for(const v of vals)bins[Math.max(0,Math.min(4,Math.round(v)-1))]++;const s=[...vals].sort((a,b)=>a-b);return{bins,graded:vals.length,avg:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null,median:s.length?(s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2):null,ungraded:Math.max(0,(students||[]).length-vals.length)}};
  const classifyTrack=(row,student)=>{const explicit=clean(row?.['희망계열']||student?.careerTrack||student?.track),major=clean(row?.['희망전공']||student?.desiredMajor),text=(explicit+' '+major).replace(/\\s+/g,'');if(/자연|이과|공학|의학|의예|치의|한의|약학|수의|간호|보건|과학|수학|컴퓨터|소프트웨어|AI|인공지능/.test(text))return'이과';if(/인문|문과|사회|상경|경영|경제|법|행정|정치|언론|미디어|어문|국어|영어|역사|지리|교육/.test(text))return'문과';let sci=0,soc=0;for(const term of ['2-1','2-2'])for(const subject of termSubjects(row,term)){const cg=String(typeof uepSelectionCurriculumGroup08129==='function'?uepSelectionCurriculumGroup08129(subject):'');if(/과학/.test(cg)||/물리|화학|생명|지구|역학|전자기|세포|물질대사|유전|행성우주/.test(subject))sci++;else if(/사회/.test(cg)||/세계사|윤리|지리|정치|경제|사회|역사/.test(subject))soc++}return sci>soc?'이과':soc>sci?'문과':'미분류'};

  function normalize(data){
    if(!data||!Array.isArray(data.rows))return data;
    const rules=(Array.isArray(readonlyCache?.selectionRules)?readonlyCache.selectionRules:[]).filter(active);
    const blockRules=rules.filter(r=>clean(r?.['규칙유형'])==='선택군');
    const linkRules=rules.filter(r=>clean(r?.['규칙유형'])==='계열연계');
    const hierRules=rules.filter(r=>clean(r?.['규칙유형'])==='과학위계');
    const cancelled=rules.filter(r=>clean(r?.['관리자결정'])==='폐강확정'&&clean(r?.['대상과목']));
    const rows=data.rows.filter(r=>!inactive(r?.__student||{}));
    const rowById=new Map(),trackById=new Map(),selectionById=new Map();
    for(const row of rows){const student=row?.__student||{},id=sid(row);if(!id)continue;rowById.set(id,row);trackById.set(id,classifyTrack(row,student));const by={};for(const t of TERMS)by[t]=termSubjects(row,t);selectionById.set(id,by)}
    const appIndex=new Map();
    for(const app of data.applications||[]){const k=clean(app.term)+'|'+norm(app.subject);if(!appIndex.has(k))appIndex.set(k,new Set());const id=sid(app);if(id)appIndex.get(k).add(id)}
    const errors=[];
    const push=e=>{if(e)errors.push(e)};
    const missingRule=rules.find(r=>clean(r?.['규칙ID'])==='CHK-2026-MISSING-SCOPE')||rules.find(r=>clean(r?.['오류유형'])==='미선택 오류');
    const overRule=rules.find(r=>clean(r?.['오류유형'])==='과다선택 오류');
    const dupRule=rules.find(r=>clean(r?.['오류유형'])==='선택군 중복선택 오류');
    const crossDupRule=rules.find(r=>clean(r?.['오류유형'])==='학기간 동일과목 중복');
    for(const row of rows){
      const student=row?.__student||{},id=sid(row),sel=selectionById.get(id)||{};
      for(const grade of ['2','3']){
        const terms=grade==='2'?['2-1','2-2']:['3-1','3-2'];
        const all=terms.flatMap(t=>sel[t]||[]).filter(x=>clean(x));
        if(!all.length){push(mkError(student,'미선택 오류','', '',missingRule,'해당 학년 선택과목이 비어 있습니다.',{grade,terms,severity:'오류'}));continue}
        for(const br of blockRules.filter(r=>gradeOfTerm(clean(r?.['학기']))===grade)){
          const term=clean(br?.['학기']);if(!terms.includes(term))continue;const allowed=new Set(split(br?.['포함과목']).map(norm)),picked=(sel[term]||[]).filter(s=>allowed.has(norm(s))),need=Number(br?.['택수']||0);
          if(need>0&&picked.length<need)push(mkError(student,'미선택 오류',term,'',missingRule||br,clean(br?.['선택군명'])+' 선택 수가 '+picked.length+'/'+need+'입니다.',{groupId:clean(br?.['선택군ID'])}));
          if(need>0&&picked.length>need)push(mkError(student,'과다선택 오류',term,'',overRule||br,clean(br?.['선택군명'])+' 선택 수가 '+picked.length+'/'+need+'입니다.',{groupId:clean(br?.['선택군ID'])}));
          for(const d of dup(picked))push(mkError(student,'선택군 중복선택 오류',term,d,dupRule||br,term+' '+d+' 과목이 같은 선택군에서 중복 선택되었습니다.',{groupId:clean(br?.['선택군ID'])}));
        }
      }
      for(const [a,b] of [['2-1','2-2'],['3-1','3-2']]){const left=new Map((sel[a]||[]).map(x=>[norm(x),x]));for(const x of sel[b]||[])if(left.has(norm(x)))push(mkError(student,'학기간 동일과목 중복',b,x,crossDupRule,a+'과 '+b+'에 동일 과목 '+x+'을(를) 선택했습니다.'))}
      for(const rule of [...linkRules,...hierRules]){const flow=termFlow(rule),from=flow[0],to=flow[1];if(!from||!to)continue;const prereqs=split(rule?.['선수과목']),advanced=split(rule?.['후속·심화과목']);const prior=new Set((sel[from]||[]).map(norm));for(const subject of sel[to]||[]){if(!advanced.some(x=>norm(x)===norm(subject)))continue;if(prereqs.length&&!prereqs.some(x=>prior.has(norm(x)))){const type=clean(rule?.['오류유형'])||(clean(rule?.['규칙유형'])==='과학위계'?'과학 위계오류':'계열 연계오류');push(mkError(student,type,to,subject,rule,clean(rule?.['오류메시지'])||subject+' 선택에 필요한 선수과목('+prereqs.join(', ')+') 이력이 없습니다.',{prerequisite:prereqs.join('|')}))}}}
      for(const rule of cancelled){const target=clean(rule?.['대상과목']),ruleTerm=clean(rule?.['학기']);for(const term of TERMS){if(ruleTerm&&/^[23]-[12]$/.test(ruleTerm)&&ruleTerm!==term)continue;if((sel[term]||[]).some(s=>norm(s)===norm(target)))push(mkError(student,'폐강과목 신청오류',term,target,rule,clean(rule?.['오류메시지'])||'폐강 확정 과목입니다. 다른 과목으로 변경이 필요합니다.',{decision:'폐강확정'}))}}
    }
    const seen=new Set();data.errors=errors.filter(e=>{const k=errorKey(e);if(seen.has(k))return false;seen.add(k);return true});

    const summary=new Map();
    const opening=rules.find(r=>clean(r?.['규칙유형'])==='개설기준');const threshold=Number(opening?.['개설기준인원']||21),capacity=Number(opening?.['정원']||30)||30;
    for(const group of data.subjects||[]){
      const key=clean(group.term)+'|'+norm(group.subject),currentSet=toSet(group.students||[]);let hierarchy=null,normalSet=currentSet,errorSet=new Set(),priorNormal=new Set(),selectable=new Set();
      if(['2-2','3-1'].includes(group.term)&&uepSubjectGroup08128(group.subject)==='과학'){
        const target=norm(group.subject);const hr=hierRules.find(rule=>{const flow=termFlow(rule),adv=split(rule?.['후속·심화과목']);return flow[1]===group.term&&adv.some(x=>norm(x)===target)});
        if(hr){const flow=termFlow(hr),basic=clean(hr?.['선수과목']),source=appIndex.get(flow[0]+'|'+norm(basic))||new Set();normalSet=intersect(currentSet,source);errorSet=minus(currentSet,source);selectable=new Set(source);if(group.term==='3-1'){const prior=appIndex.get('2-2|'+target)||new Set();priorNormal=intersect(prior,source);selectable=minus(source,priorNormal)}hierarchy={ruleId:clean(hr?.['규칙ID']),basic,maxPool:source.size,priorNormal:priorNormal.size,selectable:selectable.size,normal:normalSet.size,error:errorSet.size,unselected:Math.max(0,selectable.size-normalSet.size)}}
      }
      const normalStudents=(group.students||[]).filter(x=>normalSet.has(sid(x))),st=stats(hierarchy?normalStudents:(group.students||[]));const comp={문과:0,이과:0,미분류:0};if(!hierarchy)for(const x of group.students||[])comp[trackById.get(sid(x))||'미분류']++;
      const decisionRule=cancelled.find(r=>norm(r?.['대상과목'])===norm(group.subject)&&(!/^[23]-[12]$/.test(clean(r?.['학기']))||clean(r?.['학기'])===group.term));const actual=group.students?.length||0,validActual=hierarchy?hierarchy.normal:actual;
      summary.set(key,{id:'STATUS-2026-'+group.term+'-'+norm(group.subject),year:2026,grade:gradeOfTerm(group.term),term:group.term,groupId:clean(group.groupId||''),subject:group.subject,cardType:hierarchy?'과학위계':'일반',applicants:actual,sections:Math.max(1,Math.ceil(actual/capacity)),track:comp,stats:st,hierarchy,threshold,autoDecision:validActual<threshold?'폐강대상':'기준충족',managerDecision:clean(decisionRule?.['관리자결정'])||'자동판정',decisionAt:clean(decisionRule?.['결정일시']),decider:clean(decisionRule?.['결정자']),validActual,delta:validActual-threshold});
    }
    data.__selectionSummaryByKey=summary;data.selectionStatusRows=[...summary.values()];data.__selectionErrorSource='UEP-native-08195';data.__selectionNormalizerVersion='0.81.95';
    return data;
  }
  const wrapped=function(){return normalize(base.apply(this,arguments))};
  window.uepSelectionDataset=wrapped;try{uepSelectionDataset=wrapped}catch{}
  window.uepNormalizeSelections08195=normalize;
})();
/* UEP_08195_SELECTION_NORMALIZER_END */
`;
g+='\n'+normalizer+'\n';

// Make the card layer consume the normalized summary instead of recalculating hierarchy/track/stats.
const [ba0,ba1]=functionRange(g,'buildAnalysis');
const oldBuild=g.slice(ba0,ba1);
A(oldBuild.includes('group.uep08188'),'08188 buildAnalysis shape changed');
const newBuild=String.raw`function buildAnalysis(data){
    const summary=data?.__selectionSummaryByKey;
    for(const group of data?.subjects||[]){
      const s=summary instanceof Map?summary.get(group.term+'|'+norm(group.subject)):null;
      if(!s){const st=gradeStats(group.students||[]);group.uep08188={hier:null,stats:st,actual:group.students?.length||0,validActual:group.students?.length||0,delta:(group.students?.length||0)-21,comp:{문과:0,이과:0,미분류:group.students?.length||0}};continue;}
      const h=s.hierarchy?{basic:s.hierarchy.basic,maxPool:s.hierarchy.maxPool,validPrior:{size:s.hierarchy.priorNormal},invalidPrior:{size:0},selectable:{size:s.hierarchy.selectable},validCurrent:{size:s.hierarchy.normal},invalidCurrent:{size:s.hierarchy.error}}:null;
      group.uep08188={hier:h,stats:{bins:s.stats.bins,graded:s.stats.graded,avg:s.stats.avg,median:s.stats.median},actual:s.applicants,validActual:s.validActual,delta:s.delta,comp:h?null:s.track,decision:s.managerDecision,autoDecision:s.autoDecision};
    }
    return data;
  }`;
g=g.slice(0,ba0)+newBuild+g.slice(ba1);

const [ex0,ex1]=functionRange(g,'extra');
const oldExtra=g.slice(ex0,ex1);A(oldExtra.includes('uep-subject-distribution-08188'),'08188 extra shape changed');
const newExtra=String.raw`function extra(group){const m=group.uep08188||{},st=m.stats||{},hier=m.hier;let h='';if(hier){h=group.term==='3-1'?'<div class="uep-subject-flow-08188"><span>선수 풀 <b>'+hier.maxPool+'</b></span><span>2-2 정상 차감 <b>'+hier.validPrior.size+'</b></span><span>현재 선택가능 <b>'+hier.selectable.size+'</b></span><span>3-1 정상 <b>'+hier.validCurrent.size+'</b> / 오류 <b>'+hier.invalidCurrent.size+'</b></span></div>':'<div class="uep-subject-flow-08188"><span>'+esc(hier.basic)+' 선수 풀 <b>'+hier.maxPool+'</b></span><span>2-2 정상 <b>'+hier.validCurrent.size+'</b> / 오류 <b>'+hier.invalidCurrent.size+'</b></span></div>';}const stat=st.graded?'<div class="uep-subject-kem-08188"><span>평균 <b>'+Number(st.avg).toFixed(2)+'</b></span><span>중앙 <b>'+Number(st.median).toFixed(2)+'</b></span></div>':'';const decision='<div class="uep-subject-decision-08195"><small>개설결정</small><b>'+(m.decision||m.autoDecision||'자동판정')+'</b></div>';return h+(hier?'':trackMarkup(m.comp))+stat+'<div class="uep-subject-distribution-08188"><small>현재 성적대 분포'+(hier?' · 정상신청자 기준':'')+'</small>'+curve(st)+'</div>'+decision+'<div class="uep-openline-08188 '+(m.delta<0?'under':'over')+'">개설 기준 21명 · '+(m.delta>=0?'+':'')+m.delta+'명'+(hier?' (정상 신청 기준)':'')+'</div>';}`;
g=g.slice(0,ex0)+newExtra+g.slice(ex1);

// Add a pure renderer entry point for an admin decision. The bridge implementation below writes 41 directly.
const decisionRenderer=String.raw`
/* UEP_08195_SELECTION_DECISION_UI_START */
async function saveSelectionCourseDecision08195(term,subject,decision){
  if(!window.schoolBoard?.saveSelectionCourseDecision)return {ok:false,reason:'선택과목 결정 저장 브리지가 없습니다.'};
  const allowed=new Set(['자동판정','개설유지','폐강확정']);if(!allowed.has(String(decision||'')))return {ok:false,reason:'잘못된 관리자결정입니다.'};
  const writer=String(currentUser?.name||currentUser?.displayName||'').trim();
  const result=await window.schoolBoard.saveSelectionCourseDecision({term,subject,decision,writer});
  if(!result?.ok)return result;
  if(Array.isArray(result.selectionRules))readonlyCache={...(readonlyCache||{}),selectionRules:result.selectionRules};
  if(typeof refreshReadonlyCacheSilently==='function')await refreshReadonlyCacheSilently({force:true,rerender:false});
  render('records');return result;
}
window.saveSelectionCourseDecision08195=saveSelectionCourseDecision08195;
/* UEP_08195_SELECTION_DECISION_UI_END */
`;
g+='\n'+decisionRenderer+'\n';

// Discover the configured rule-spreadsheet identifier already used by the app. Never inject a school-specific ID here.
const ruleIdCandidates=['UEP_RULES_SPREADSHEET_ID','UEP_RULE_SPREADSHEET_ID','UEP_RULE_LOG_SPREADSHEET_ID','UEP_RULES_LOG_SPREADSHEET_ID'];
const ruleIdName=ruleIdCandidates.find(name=>new RegExp('(?:const|let|var)\\s+'+name+'\\s*=').test(m));
if(ruleIdName){
  const helper=String.raw`
/* UEP_08195_SELECTION_DECISION_BACKEND_START */
async function saveSelectionCourseDecision08195(payload={}){
  const term=String(payload.term||'').trim(),subject=String(payload.subject||'').trim(),decision=String(payload.decision||'').trim(),writer=String(payload.writer||'').trim();
  if(!/^[23]-[12]$/.test(term)||!subject)return {ok:false,reason:'학기/과목 정보가 없습니다.'};
  if(!['자동판정','개설유지','폐강확정'].includes(decision))return {ok:false,reason:'관리자결정 값이 올바르지 않습니다.'};
  const auth=await getReadonlySheetsAuth(),token=auth.token;
  const matrix=(await readSheetBatch(token,${ruleIdName},["'41_선택과목규칙'!A1:Z1000"]))?.[0]?.values||[];
  const headers=(matrix[2]||[]).map(v=>String(v||'').trim()),idx=Object.fromEntries(headers.map((h,i)=>[h,i]));
  const n=v=>String(v??'').normalize('NFKC').replace(/[\\s·ㆍ._*()\-]/g,'').trim();
  let pos=-1;for(let i=3;i<matrix.length;i++){const r=matrix[i]||[];if(n(r[idx['대상과목']])===n(subject)&&String(r[idx['학기']]||'').trim()===term&&String(r[idx['규칙유형']]||'').trim()==='관리자결정'){pos=i;break;}}
  const now=new Date().toISOString();
  if(pos<0){
    const row=new Array(26).fill('');row[idx['규칙ID']]='DEC-'+Date.now();row[idx['규칙유형']]='관리자결정';row[idx['입학연도']]=new Date().getFullYear();row[idx['대상학년']]=term.charAt(0);row[idx['학기']]=term;row[idx['활성']]='Y';row[idx['대상과목']]=subject;row[idx['관리자결정']]=decision;row[idx['결정일시']]=now;row[idx['결정자']]=writer;row[idx['오류메시지']]=decision==='폐강확정'?'폐강 확정 과목입니다. 다른 과목으로 변경이 필요합니다.':'';
    await appendSheetValues(token,${ruleIdName},"'41_선택과목규칙'!A:Z",[row]);
  }else{
    const rowNo=pos+1;await updateSheetValues(token,${ruleIdName},"'41_선택과목규칙'!W"+rowNo+":Y"+rowNo,[[decision,now,writer]]);
  }
  const fresh=(await readSheetBatch(token,${ruleIdName},["'41_선택과목규칙'!A1:Z1000"]))?.[0]?.values||[];const hh=(fresh[2]||[]).map(v=>String(v||'').trim());const selectionRules=fresh.slice(3).filter(r=>r.some(v=>String(v||'').trim())).map(r=>Object.fromEntries(hh.map((h,i)=>[h,r[i]??''])));
  if(liveDataCache)liveDataCache={...liveDataCache,selectionRules};
  return {ok:true,selectionRules,term,subject,decision,decidedAt:now,decider:writer};
}
/* UEP_08195_SELECTION_DECISION_BACKEND_END */
`;
  const ipcAnchor='ipcMain.handle(';
  A(m.includes(ipcAnchor),'ipcMain handler anchor missing');
  m=m.replace(ipcAnchor,helper+'\n'+`ipcMain.handle("selection:saveCourseDecision",async(event,payload)=>{try{return await saveSelectionCourseDecision08195(payload)}catch(error){return {ok:false,reason:error?.message||'선택과목 결정 저장 실패'}}});\n`+ipcAnchor);
  const preAnchor='contextBridge.exposeInMainWorld';A(pre.includes(preAnchor),'preload bridge anchor missing');
  const methodAnchor='{' ;const exposeAt=pre.indexOf(preAnchor),braceAt=pre.indexOf(methodAnchor,exposeAt);A(braceAt>0,'preload exposed object missing');
  pre=pre.slice(0,braceAt+1)+'\n  saveSelectionCourseDecision: payload => ipcRenderer.invoke("selection:saveCourseDecision",payload),'+pre.slice(braceAt+1);
}else{
  console.warn('0.81.95: configured rule spreadsheet identifier not found; decision write bridge not installed. Normalizer/card changes still applied.');
}

fs.writeFileSync(gFile,g,'utf8');fs.writeFileSync(mFile,m,'utf8');fs.writeFileSync(preFile,pre,'utf8');
const pkg=JSON.parse(fs.readFileSync(pFile,'utf8'));pkg.version='0.81.95';fs.writeFileSync(pFile,JSON.stringify(pkg,null,2)+'\n','utf8');
console.log('patched UEP 0.81.95: UEP-native selection normalizer + normalized cards + rule-based decision bridge');
