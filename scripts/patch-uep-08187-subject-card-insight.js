const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app',gFile=path.join(root,'resources','app','gyomuon.js'),pFile=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};
A(g.includes('const APP_VERSION = "0.81.86";'),'0.81.86 anchor missing');
A(g.includes('UEP_08186_GRADE_TRANSFER_START'),'0.81.86 grade source patch missing');
A(g.includes('function uepSubjectApplicationView()'),'subject application view missing');
A(g.includes('function uepSubjectStatus(group)'),'subject status helper missing');
g=g.replace('const APP_VERSION = "0.81.86";','const APP_VERSION = "0.81.87";');
const START='/* UEP_08187_SUBJECT_CARD_INSIGHT_START */',END='/* UEP_08187_SUBJECT_CARD_INSIGHT_END */';
A(!g.includes(START),'already patched');
function install08187(){
  if(typeof window==='undefined'||window.__UEP08187SubjectCardInsightInstalled)return;
  window.__UEP08187SubjectCardInsightInstalled=true;
  const V='0.81.87',OPEN_LINE=21,SEEN='uep.updateNotes.lastShownVersion';
  const oldDataset=uepSelectionDataset;
  const norm=v=>String(v??'').normalize('NFKC').replace(/\s+/g,'').replace(/\*/g,'').trim();
  const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const distinctCount=rows=>new Set((rows||[]).map(x=>String(x?.student?.id||x?.student?.studentNo||'')).filter(Boolean)).size;
  function scienceHierarchySpec(data,group){
    if(!group||uepSubjectGroup08128(group.subject)!=='과학'||!['2-2','3-1'].includes(group.term))return null;
    const rules=typeof uepSelectionRules08129==='function'?uepSelectionRules08129():[];
    const targetNorm=norm(group.subject);
    for(const rule of rules.filter(r=>String(r?.['규칙유형']||'')==='과학위계')){
      const raw=String(rule?.['학기']||''),parts=raw.split(/→|->/).map(x=>x.trim());
      const fromTerm=parts[0],toTerm=String(rule?.['연계학기']||parts[1]||'').trim();
      const basic=String(rule?.['선수과목']||'').trim();
      const advanced=String(rule?.['후속·심화과목']||'').split('|').map(x=>x.trim()).filter(Boolean);
      if(!fromTerm||toTerm!==group.term||!basic||!advanced.some(x=>norm(x)===targetNorm))continue;
      const sourceApps=(data?.applications||[]).filter(a=>a.term===fromTerm&&norm(a.subject)===norm(basic));
      const maxPool=distinctCount(sourceApps);
      const priorSame=group.term==='3-1'?distinctCount((data?.applications||[]).filter(a=>a.term==='2-2'&&norm(a.subject)===targetNorm)):0;
      return {fromTerm,basic,maxPool,priorSame,selectable:Math.max(0,maxPool-priorSame)};
    }
    return null;
  }
  function gradeStats(students){
    const vals=(students||[]).map(x=>Number(x?.avg)).filter(Number.isFinite).map(x=>Math.max(1,Math.min(5,x)));
    const bins=[0,0,0,0,0];
    vals.forEach(v=>bins[Math.max(0,Math.min(4,Math.round(v)-1))]++);
    const sorted=[...vals].sort((a,b)=>a-b);
    const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
    const median=!sorted.length?null:(sorted.length%2?sorted[(sorted.length-1)/2]:(sorted[sorted.length/2-1]+sorted[sorted.length/2])/2);
    return {bins,graded:vals.length,avg,median};
  }
  function curve(stats){
    const bins=stats?.bins||[0,0,0,0,0],max=Math.max(1,...bins),xs=[8,31,54,77,100],ys=bins.map(v=>30-(v/max)*22),points=xs.map((x,i)=>x+','+ys[i].toFixed(1)).join(' ');
    return '<div class="uep-grade-curve-08187" title="1~5등급 분포 · 성적자료 '+stats.graded+'명"><svg viewBox="0 0 108 42" preserveAspectRatio="none" aria-label="등급분포"><path d="M8 31H100"/><polyline points="'+points+'"/>'+xs.map((x,i)=>'<circle cx="'+x+'" cy="'+ys[i].toFixed(1)+'" r="1.8"/>').join('')+'</svg><div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div></div>';
  }
  function cardMeta(data,group){
    const stats=gradeStats(group.students),hier=scienceHierarchySpec(data,group),actual=group.students.length,delta=actual-OPEN_LINE;
    return {stats,hier,actual,delta};
  }
  uepSelectionDataset=function(){
    const base=oldDataset.apply(this,arguments);
    for(const group of base?.subjects||[])group.uep08187=cardMeta(base,group);
    return base;
  };
  uepSubjectStatus=function(group){
    const n=group?.students?.length||0;
    if(n<OPEN_LINE)return '<i class="subject-risk watch">개설선 '+(OPEN_LINE-n)+'명 부족</i>';
    if(Math.ceil(n/Math.max(1,group.sectionCount||1))>30)return '<i class="subject-risk crowd">과밀가능</i>';
    return '<i class="subject-risk stable">개설선 +'+(n-OPEN_LINE)+'명</i>';
  };
  function extraMeta(data,group){
    const m=group.uep08187||cardMeta(data,group),isKEM=uepSubjectGroup08128(group.subject)==='국·영·수'&&['2-1','2-2'].includes(group.term);
    let hierarchy='';
    if(m.hier){
      hierarchy=group.term==='3-1'
        ?'<div class="uep-subject-flow-08187"><span>최대 <b>'+m.hier.maxPool+'</b></span><span>2-2 동일과목 <b>'+m.hier.priorSame+'</b></span><span>선택가능 <b>'+m.hier.selectable+'</b></span><span>신청 <b>'+m.actual+'</b></span></div>'
        :'<div class="uep-subject-flow-08187"><span>'+esc(m.hier.basic)+' 기준 최대 <b>'+m.hier.maxPool+'</b></span><span>신청 <b>'+m.actual+'</b></span></div>';
    }
    const stat=isKEM&&m.stats.graded?'<div class="uep-subject-kem-08187"><span>평균 <b>'+m.stats.avg.toFixed(2)+'</b></span><span>중앙 <b>'+m.stats.median.toFixed(2)+'</b></span></div>':'';
    return hierarchy+stat+'<div class="uep-subject-distribution-08187"><small>현재 성적대 분포</small>'+curve(m.stats)+'</div><div class="uep-openline-08187 '+(m.delta<0?'under':'over')+'">개설 기준 '+OPEN_LINE+'명 · '+(m.delta>=0?'+':'')+m.delta+'명</div>';
  }
  uepSubjectApplicationView=function(){
    const data=uepSelectionDataset(),terms=['2-1','2-2','3-1','3-2'],groups=data.subjects.filter(x=>x.term===curriculumTermFilter),order=['국·영·수','사회','과학','음·미·체','일본어·중국어·한문·정보','기타'],bucket=new Map(order.map(x=>[x,[]]));
    groups.forEach(g=>bucket.get(uepSubjectGroup08128(g.subject))?.push(g));
    const style='<style id="uep-style-08187">.subject-card-grid>button{min-height:218px;align-content:start}.subject-card-grid>button>b{margin-bottom:2px}.uep-subject-flow-08187{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:8px}.uep-subject-flow-08187 span,.uep-subject-kem-08187 span{padding:5px 6px;border-radius:8px;background:#f1f7f5;font-size:10px;line-height:1.2;color:#52645f}.uep-subject-flow-08187 b,.uep-subject-kem-08187 b{font-size:12px;color:#173f36}.uep-subject-kem-08187{display:flex;gap:6px;margin-top:8px}.uep-subject-distribution-08187{margin-top:8px;padding:6px 7px;border:1px solid #e1ebe8;border-radius:10px;background:#fbfdfc}.uep-subject-distribution-08187>small{display:block;text-align:left;color:#667b75;font-size:9px}.uep-grade-curve-08187 svg{width:100%;height:34px;overflow:visible}.uep-grade-curve-08187 path{stroke:#d7e2df;stroke-width:1;fill:none}.uep-grade-curve-08187 polyline{stroke:currentColor;stroke-width:2;fill:none;vector-effect:non-scaling-stroke}.uep-grade-curve-08187 circle{fill:currentColor}.uep-grade-curve-08187>div{display:grid;grid-template-columns:repeat(5,1fr);font-size:8px;color:#83928e;text-align:center;margin-top:-2px}.uep-openline-08187{margin-top:6px;font-size:10px;font-weight:800;text-align:left}.uep-openline-08187.over{color:#287565}.uep-openline-08187.under{color:#b45b43}</style>';
    return style+'<div class="term-picker-cards">'+terms.map(t=>'<button data-curriculum-term="'+t+'" class="'+(curriculumTermFilter===t?'active':'')+'"><b>'+t.replace('-','학년 ')+'학기</b><span>'+data.subjects.filter(x=>x.term===t).length+'과목</span></button>').join('')+'</div>'+order.filter(k=>bucket.get(k).length).map(k=>'<section class="subject-group-section group-'+k.replace(/[^가-힣A-Za-z0-9]/g,'')+'"><header><h3>'+k+'</h3><span>'+bucket.get(k).length+'과목</span></header><div class="subject-card-grid">'+bucket.get(k).sort((a,b)=>a.subject.localeCompare(b.subject,'ko')).map(g=>'<button data-curriculum-subject="'+esc(g.key)+'"><small>'+g.term+'</small><b>'+esc(g.subject)+'</b><span>신청 '+g.students.length+'명 · 예상 '+g.sectionCount+'분반</span>'+extraMeta(data,g)+uepSubjectStatus(g)+'</button>').join('')+'</div></section>').join('');
  };
  function closeNote(){document.getElementById('uepUpdateNotes08187')?.remove();try{localStorage.setItem(SEEN,V);localStorage.setItem('uep.releaseNotes.seen',V)}catch{}}
  function showNote(){
    try{if(String(APP_VERSION)!==V||localStorage.getItem(SEEN)===V)return}catch{return}
    document.getElementById('uepUpdateNotes08186')?.remove();
    const l=document.createElement('div');l.id='uepUpdateNotes08187';l.style.cssText='position:fixed;inset:0;z-index:2147483007;background:rgba(20,31,35,.38);display:flex;align-items:center;justify-content:center;padding:24px';
    l.innerHTML='<div style="width:min(680px,92vw);background:#fff;border-radius:22px;padding:24px;box-shadow:0 26px 70px rgba(0,0,0,.22)"><h2>UEP 0.81.87 선택과목 카드 분석</h2><ul><li>모든 과목카드에 신청학생의 1학기말 성적 분포를 표시합니다.</li><li>2-2·3-1 과학 위계과목은 규칙로그의 과학위계 규칙을 이용해 최대 가능인원과 선택가능인원을 계산합니다.</li><li>3-1은 2-2 동일과목 선택인원을 별도로 보여주고, 개설 기준 21명과의 차이를 표시합니다.</li><li>2-1·2-2 국·영·수 선택과목은 신청학생 평균·중앙 등급을 함께 표시합니다.</li></ul><button type="button" style="float:right;border:0;border-radius:12px;background:#167866;color:#fff;padding:10px 18px;font-weight:900;cursor:pointer">확인</button><div style="clear:both"></div></div>';
    document.body.appendChild(l);l.querySelector('button').onclick=closeNote;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(showNote,900),{once:true});else setTimeout(showNote,900);
}
g+='\n'+START+'\n('+install08187.toString()+')();\n'+END+'\n';
fs.writeFileSync(gFile,g,'utf8');
const pkg=JSON.parse(fs.readFileSync(pFile,'utf8'));A(pkg.version==='0.81.86','package anchor missing');pkg.version='0.81.87';fs.writeFileSync(pFile,JSON.stringify(pkg,null,2)+'\n','utf8');
console.log('UEP 0.81.87 subject-card insight patch applied');
