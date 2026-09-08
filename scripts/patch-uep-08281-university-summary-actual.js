const fs=require('fs'),path=require('path');
const root=process.argv[2]; if(!root) throw new Error('app root required');
const p=path.join(root,'gyomuon.js');
let s=fs.readFileSync(p,'utf8');
const before=s;
const replaceOnce=(oldText,newText,label)=>{
  const i=s.indexOf(oldText);
  if(i<0) throw new Error('missing anchor: '+label);
  if(s.indexOf(oldText,i+1)>=0) throw new Error('ambiguous anchor: '+label);
  s=s.slice(0,i)+newText+s.slice(i+oldText.length);
};

s=s.replaceAll('0.82.80','0.82.81');

replaceOnce(
`  const coreMinimumGroups=minimumGroups.filter(([unit])=>/일반.*(인문|자연)|인문.*자연|사범|의예|약학|수의|간호/.test(unit)&&!/예술|체육|특성화|농어촌|만학/.test(unit));
  const otherMinimumGroups=minimumGroups.filter(x=>!coreMinimumGroups.includes(x));
  const minHtml=minimumGroups.length?'<div class="uep-uni-min-core">'+(coreMinimumGroups.length?coreMinimumGroups:minimumGroups.slice(0,6)).map(minCard).join('')+'</div>'+(otherMinimumGroups.length?'<details class="uep-uni-min-more"><summary>기타 모집단위 수능최저 '+otherMinimumGroups.length+'개 보기</summary><div class="uep-uni-minimum-grid">'+otherMinimumGroups.map(minCard).join('')+'</div></details>':''):'<div class="uep-uni-detail-pending"><b>모집단위별 기준 검증중</b><span>공식 원문 숫자가 확인된 기준만 표시합니다.</span></div>';`,
`  const generalMinimumGroups=minimumGroups.filter(([unit])=>{const u=uep08273Text(unit);return /일반.*(인문|자연)|인문.*자연|인문·자연|일반계열/.test(u)&&!/의예|의학|약학|수의|간호|사범|예술|체육|특성화|농어촌|만학/.test(u);});
  const fallbackGeneralGroup=minimumGroups.find(([unit])=>!/의예|의학|약학|수의|간호|사범|예술|체육|특성화|농어촌|만학/.test(uep08273Text(unit)));
  const coreMinimumGroups=generalMinimumGroups.length?generalMinimumGroups:(fallbackGeneralGroup?[fallbackGeneralGroup]:[]);
  const otherMinimumGroups=minimumGroups.filter(x=>!coreMinimumGroups.includes(x));
  const minHtml=minimumGroups.length?'<div class="uep-uni-min-core">'+coreMinimumGroups.map(minCard).join('')+'</div>'+(otherMinimumGroups.length?'<details class="uep-uni-min-more"><summary>기타 모집단위 수능최저 '+otherMinimumGroups.length+'개 보기</summary><div class="uep-uni-minimum-grid">'+otherMinimumGroups.map(minCard).join('')+'</div></details>':''):'<div class="uep-uni-detail-pending"><b>모집단위별 기준 검증중</b><span>공식 원문 숫자가 확인된 기준만 표시합니다.</span></div>';`,
'minimum grouping');

replaceOnce(
`  const admissionSource=activeAdmissions.map(r=>[r['전형유형'],r['대전형'],r['전형명'],r['선발방식']||r['선발방법'],r['평가구조요약']||r['전형방법'],r['서류평가'],r['교과세특'],r['비고']].map(uep08273Text).join(' ')).join(' ');
  const qualitativeLabel=/교과세특/.test(admissionSource)&&/서류/.test(admissionSource)?'교과세특·서류 반영':/교과세특/.test(admissionSource)?'교과세특 반영':/서류/.test(admissionSource)?'교과전형 서류 반영':'교과 정량평가 중심';`,
`  const admissionSource=activeAdmissions.map(r=>[r['전형유형'],r['대전형'],r['전형명'],r['선발방식']||r['선발방법'],r['평가구조요약']||r['전형방법'],r['서류평가'],r['교과세특'],r['비고']].map(uep08273Text).join(' ')).join(' ');
  const subjectAdmissions=activeAdmissions.filter(r=>/학생부교과/.test([r['전형유형'],r['대전형'],r['전형명']].map(uep08273Text).join(' ')));
  const subjectAdmissionSource=subjectAdmissions.map(r=>[r['전형명'],r['선발방식']||r['선발방법'],r['평가구조요약']||r['전형방법'],r['서류평가'],r['교과세특'],r['비고']].map(uep08273Text).join(' ')).join(' ');
  const hasSubjectDocument=/(서류평가|서류\s*\d|서류\s*%|서류\s*반영|정성평가|종합평가)/.test(subjectAdmissionSource);
  const hasSubjectSpecificRecord=/교과세특/.test(subjectAdmissionSource);
  const qualitativeLabel=hasSubjectSpecificRecord&&hasSubjectDocument?'교과세특·서류 반영':hasSubjectSpecificRecord?'교과세특 반영':hasSubjectDocument?'교과전형 서류 반영':'교과 정량평가 중심';`,
'qualitative badge');

replaceOnce(
`    '<section class="uep-uni-section uep-uni-course-section"><div class="uep-uni-section-title"><div><small>COURSE</small><h3>관련·권장과목</h3></div><span>공식 과목 조합 → 모집단위</span></div><div class="uep-uni-recommend-grid">'+courseHtml+'</div></section>'+`,
`    '<details class="uep-uni-section uep-uni-course-section uep-uni-course-disclosure"><summary><span><small>COURSE</small><b>관련·권장과목 '+recommendationGroups.length+'개 보기</b></span><em>공식 과목 조합 → 모집단위</em></summary><div class="uep-uni-recommend-grid">'+courseHtml+'</div></details>'+`,
'course disclosure');

const pkgPath=path.join(root,'package.json');
const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8')); pkg.version='0.82.81'; fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');

if(s===before) throw new Error('no renderer changes');
fs.writeFileSync(p,s);
console.log('UEP 0.82.81 actual university summary patch applied');
