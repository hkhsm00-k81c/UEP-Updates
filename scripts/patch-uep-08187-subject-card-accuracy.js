const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app',gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};
A(g.includes('const APP_VERSION = "0.81.87";'),'0.81.87 anchor missing');
A(g.includes('UEP_08187_SUBJECT_CARD_INSIGHT_START'),'0.81.87 insight patch missing');
const START='/* UEP_08187_SUBJECT_CARD_ACCURACY_START */',END='/* UEP_08187_SUBJECT_CARD_ACCURACY_END */';
A(!g.includes(START),'accuracy patch already applied');
function install08187Accuracy(){
  if(typeof window==='undefined'||window.__UEP08187SubjectCardAccuracyInstalled)return;
  window.__UEP08187SubjectCardAccuracyInstalled=true;
  const OPEN_LINE=21;
  const oldDataset=uepSelectionDataset;
  const norm=v=>String(v??'').normalize('NFKC').replace(/\s+/g,'').replace(/\*/g,'').trim();
  const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const sid=x=>String(x?.student?.id||x?.student?.studentNo||x?.id||x?.studentNo||'').trim();
  const setOf=rows=>new Set((rows||[]).map(sid).filter(Boolean));
  const intersect=(a,b)=>new Set([...a].filter(x=>b.has(x)));
  const minus=(a,b)=>new Set([...a].filter(x=>!b.has(x)));
  function hierarchySpec(data,group){
    if(!group||uepSubjectGroup08128(group.subject)!=='과학'||!['2-2','3-1'].includes(group.term))return null;
    const rules=typeof uepSelectionRules08129==='function'?uepSelectionRules08129():[];
    const target=norm(group.subject);
    for(const rule of rules.filter(r=>String(r?.['규칙유형']||'')==='과학위계')){
      const raw=String(rule?.['학기']||''),parts=raw.split(/→|->/).map(x=>x.trim());
      const fromTerm=parts[0],toTerm=String(rule?.['연계학기']||parts[1]||'').trim();
      const basic=String(rule?.['선수과목']||'').trim();
      const advanced=String(rule?.['후속·심화과목']||'').split('|').map(x=>x.trim()).filter(Boolean);
      if(!fromTerm||toTerm!==group.term||!basic||!advanced.some(x=>norm(x)===target))continue;
      const sourceSet=setOf((data?.applications||[]).filter(a=>a.term===fromTerm&&norm(a.subject)===norm(basic)));
      const currentSet=setOf(group.students||[]);
      const validCurrent=intersect(currentSet,sourceSet),invalidCurrent=minus(currentSet,sourceSet);
      let priorSet=new Set(),validPrior=new Set(),invalidPrior=new Set(),selectable=new Set(sourceSet);
      if(group.term==='3-1'){
        priorSet=setOf((data?.applications||[]).filter(a=>a.term==='2-2'&&norm(a.subject)===target));
        validPrior=intersect(priorSet,sourceSet);
        invalidPrior=minus(priorSet,sourceSet);
        selectable=minus(sourceSet,validPrior);
      }
      return {fromTerm,basic,maxPool:sourceSet.size,sourceSet,currentSet,validCurrent,invalidCurrent,priorSet,validPrior,invalidPrior,selectable};
    }
    return null;
  }
  function gradeStats(students){
    const vals=(students||[]).map(x=>Number(x?.avg)).filter(Number.isFinite).map(x=>Math.max(1,Math.min(5,x)));
    const bins=[0,0,0,0,0];vals.forEach(v=>bins[Math.max(0,Math.min(4,Math.round(v)-1))]++);
    const sorted=[...vals].sort((a,b)=>a-b),avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
    const median=!sorted.length?null:(sorted.length%2?sorted[(sorted.length-1)/2]:(sorted[sorted.length/2-1]+sorted[sorted.length/2])/2);
    return {bins,graded:vals.length,avg,median};
  }
  function curve(stats){
    const bins=stats?.bins||[0,0,0,0,0],max=Math.max(1,...bins),xs=[8,31,54,77,100],ys=bins.map(v=>30-(v/max)*22),points=xs.map((x,i)=>x+','+ys[i].toFixed(1)).join(' ');
    return '<div class="uep-grade-curve-08187" title="1~5등급 분포 · 성적자료 '+stats.graded+'명"><svg viewBox="0 0 108 42" preserveAspectRatio="none"><path d="M8 31H100"/><polyline points="'+points+'"/>'+xs.map((x,i)=>'<circle cx="'+x+'" cy="'+ys[i].toFixed(1)+'" r="1.8"/>').join('')+'</svg><div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div></div>';
  }
  function studentTrack(app){
    const row=app?.row||{},student=app?.student||{};
    const explicit=String(row?.['희망계열']||student?.careerTrack||student?.track||'').trim();
    const major=String(row?.['희망전공']||student?.desiredMajor||'').trim();
    const text=(explicit+' '+major).replace(/\s+/g,'');
    if(/자연|이과|공학|의학|의예|치의|한의|약학|수의|간호|보건|과학|수학|컴퓨터|소프트웨어|AI|인공지능/.test(text))return '이과';
    if(/인문|문과|사회|상경|경영|경제|법|행정|정치|언론|미디어|어문|국어|영어|역사|지리|교육/.test(text))return '문과';
    const r=row;
    let sci=0,soc=0;
    for(const term of ['2-1','2-2'])for(const subject of (typeof uepSelectionTermSubjects==='function'?uepSelectionTermSubjects(r,term):[])){
      const cg=String(typeof uepSelectionCurriculumGroup08129==='function'?uepSelectionCurriculumGroup08129(subject):'');
      if(/과학/.test(cg)||/물리|화학|생명|지구|역학|전자기|세포|물질대사|유전|행성우주/.test(subject))sci++;
      else if(/사회/.test(cg)||/세계사|윤리|지리|정치|경제|사회|역사/.test(subject))soc++;
    }
    if(sci>soc)return '이과';
    if(soc>sci)return '문과';
    return '미분류';
  }
  function composition(group){
    const out={문과:0,이과:0,미분류:0};
    for(const app of group.students||[])out[studentTrack(app)]++;
    return out;
  }
  function showTrack(group){
    if(!['2-1','2-2'].includes(group.term))return false;
    const broad=uepSubjectGroup08128(group.subject),cg=String(typeof uepSelectionCurriculumGroup08129==='function'?uepSelectionCurriculumGroup08129(group.subject):'');
    const x=String(group.subject||'');
    const koreanEnglish=/국어|영어/.test(cg)||/독서|문학|언어|화법|작문|영어|미디어 영어|세계 문화와 영어/.test(x);
    return (broad==='국·영·수'&&koreanEnglish)||broad==='사회';
  }
  function meta(data,group){
    const hier=hierarchySpec(data,group),stats=gradeStats(group.students),actual=group.students.length,validActual=hier?hier.validCurrent.size:actual;
    return {hier,stats,actual,validActual,delta:validActual-OPEN_LINE,comp:showTrack(group)?composition(group):null};
  }
  uepSelectionDataset=function(){
    const base=oldDataset.apply(this,arguments);
    for(const group of base?.subjects||[])group.uep08187Accuracy=meta(base,group);
    return base;
  };
  uepSubjectStatus=function(group){
    const m=group?.uep08187Accuracy,n=m?.validActual??group?.students?.length??0;
    if(n<OPEN_LINE)return '<i class="subject-risk watch">개설선 '+(OPEN_LINE-n)+'명 부족</i>';
    if(Math.ceil(n/Math.max(1,group.sectionCount||1))>30)return '<i class="subject-risk crowd">과밀가능</i>';
    return '<i class="subject-risk stable">개설선 +'+(n-OPEN_LINE)+'명</i>';
  };
  function trackMarkup(comp){
    if(!comp)return '';
    const total=comp.문과+comp.이과+comp.미분류||1;
    const pct=n=>Math.round(n*100/total);
    return '<div class="uep-trackmix-08187"><small>신청자 계열 구성</small><div><span>문과 <b>'+comp.문과+'</b><em>'+pct(comp.문과)+'%</em></span><span>이과 <b>'+comp.이과+'</b><em>'+pct(comp.이과)+'%</em></span><span>미분류 <b>'+comp.미분류+'</b><em>'+pct(comp.미분류)+'%</em></span></div></div>';
  }
  function extraMeta(data,group){
    const m=group.uep08187Accuracy||meta(data,group),isKEM=uepSubjectGroup08128(group.subject)==='국·영·수'&&['2-1','2-2'].includes(group.term);
    let hierarchy='';
    if(m.hier){
      if(group.term==='3-1')hierarchy='<div class="uep-subject-flow-08187"><span>선수 풀 <b>'+m.hier.maxPool+'</b></span><span>2-2 정상 <b>'+m.hier.validPrior.size+'</b> / 오류 <b>'+m.hier.invalidPrior.size+'</b></span><span>선택가능 <b>'+m.hier.selectable.size+'</b></span><span>신청 정상 <b>'+m.hier.validCurrent.size+'</b> / 오류 <b>'+m.hier.invalidCurrent.size+'</b></span></div>';
      else hierarchy='<div class="uep-subject-flow-08187"><span>'+esc(m.hier.basic)+' 선수 풀 <b>'+m.hier.maxPool+'</b></span><span>신청 정상 <b>'+m.hier.validCurrent.size+'</b> / 오류 <b>'+m.hier.invalidCurrent.size+'</b></span></div>';
    }
    const stat=isKEM&&m.stats.graded?'<div class="uep-subject-kem-08187"><span>평균 <b>'+m.stats.avg.toFixed(2)+'</b></span><span>중앙 <b>'+m.stats.median.toFixed(2)+'</b></span></div>':'';
    return hierarchy+trackMarkup(m.comp)+stat+'<div class="uep-subject-distribution-08187"><small>현재 성적대 분포</small>'+curve(m.stats)+'</div><div class="uep-openline-08187 '+(m.delta<0?'under':'over')+'">개설 기준 '+OPEN_LINE+'명 · '+(m.delta>=0?'+':'')+m.delta+'명'+(m.hier?' (정상 신청 기준)':'')+'</div>';
  }
  uepSubjectApplicationView=function(){
    const data=uepSelectionDataset(),terms=['2-1','2-2','3-1','3-2'],groups=data.subjects.filter(x=>x.term===curriculumTermFilter),order=['국·영·수','사회','과학','음·미·체','일본어·중국어·한문·정보','기타'],bucket=new Map(order.map(x=>[x,[]]));
    groups.forEach(g=>bucket.get(uepSubjectGroup08128(g.subject))?.push(g));
    const style='<style id="uep-style-08187-accuracy">.subject-card-grid>button{min-height:238px;align-content:start}.uep-subject-flow-08187{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:8px}.uep-subject-flow-08187 span,.uep-subject-kem-08187 span{padding:5px 6px;border-radius:8px;background:#f1f7f5;font-size:10px;line-height:1.2;color:#52645f}.uep-subject-flow-08187 b,.uep-subject-kem-08187 b{font-size:12px;color:#173f36}.uep-subject-kem-08187{display:flex;gap:6px;margin-top:8px}.uep-trackmix-08187{margin-top:8px;padding:7px;border:1px solid #e1ebe8;border-radius:10px;background:#f8fbfa}.uep-trackmix-08187>small{display:block;text-align:left;font-size:9px;color:#667b75;margin-bottom:4px}.uep-trackmix-08187>div{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.uep-trackmix-08187 span{font-size:9px;text-align:left}.uep-trackmix-08187 b{display:block;font-size:13px}.uep-trackmix-08187 em{display:block;font-size:8px;font-style:normal;color:#7b8b86}.uep-subject-distribution-08187{margin-top:8px;padding:6px 7px;border:1px solid #e1ebe8;border-radius:10px;background:#fbfdfc}.uep-subject-distribution-08187>small{display:block;text-align:left;color:#667b75;font-size:9px}.uep-grade-curve-08187 svg{width:100%;height:34px;overflow:visible}.uep-grade-curve-08187 path{stroke:#d7e2df;stroke-width:1;fill:none}.uep-grade-curve-08187 polyline{stroke:currentColor;stroke-width:2;fill:none;vector-effect:non-scaling-stroke}.uep-grade-curve-08187 circle{fill:currentColor}.uep-grade-curve-08187>div{display:grid;grid-template-columns:repeat(5,1fr);font-size:8px;color:#83928e;text-align:center;margin-top:-2px}.uep-openline-08187{margin-top:6px;font-size:10px;font-weight:800;text-align:left}.uep-openline-08187.over{color:#287565}.uep-openline-08187.under{color:#b45b43}</style>';
    return style+'<div class="term-picker-cards">'+terms.map(t=>'<button data-curriculum-term="'+t+'" class="'+(curriculumTermFilter===t?'active':'')+'"><b>'+t.replace('-','학년 ')+'학기</b><span>'+data.subjects.filter(x=>x.term===t).length+'과목</span></button>').join('')+'</div>'+order.filter(k=>bucket.get(k).length).map(k=>'<section class="subject-group-section group-'+k.replace(/[^가-힣A-Za-z0-9]/g,'')+'"><header><h3>'+k+'</h3><span>'+bucket.get(k).length+'과목</span></header><div class="subject-card-grid">'+bucket.get(k).sort((a,b)=>a.subject.localeCompare(b.subject,'ko')).map(g=>'<button data-curriculum-subject="'+esc(g.key)+'"><small>'+g.term+'</small><b>'+esc(g.subject)+'</b><span>신청 '+g.students.length+'명 · 예상 '+g.sectionCount+'분반</span>'+extraMeta(data,g)+uepSubjectStatus(g)+'</button>').join('')+'</div></section>').join('');
  };
}
g+='\n'+START+'\n('+install08187Accuracy.toString()+')();\n'+END+'\n';
fs.writeFileSync(gFile,g,'utf8');
console.log('UEP 0.81.87 subject-card accuracy patch applied');
