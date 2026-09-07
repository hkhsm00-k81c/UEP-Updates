const fs=require('fs'),path=require('path');
const root=process.argv[2]; if(!root)throw new Error('app root required');
const gp=path.join(root,'gyomuon.js'),cp=path.join(root,'gyomuon.css'),pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8'),c=fs.readFileSync(cp,'utf8');
const must=(x,m)=>{if(!x)throw new Error(m)};
must(g.includes('0.82.72'),'expected 0.82.72 base');
g=g.replaceAll('0.82.72','0.82.73');
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.73';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n')}
const pl=path.join(root,'package-lock.json');if(fs.existsSync(pl)){let x=fs.readFileSync(pl,'utf8').replaceAll('0.82.72','0.82.73');fs.writeFileSync(pl,x)}

const anchor="  const logoUrl=String(university['로고URL']||university['대학로고URL']||'').trim();";
must(g.includes(anchor),'0.82.69+ university renderer anchor missing');
const insert=String.raw`  const uep08273Text=v=>String(v??'').trim();
  const uep08273Yes=v=>/^(Y|YES|O|있음|반영|적용)$/i.test(uep08273Text(v))||/반영|적용/.test(uep08273Text(v));
  const achievementRaw=calc?uep08273Text(calc['성취도배점/환산']||calc['성취도반영']||calc['성취도']):'';
  const achievementOn=achievementRaw&&!/미반영|반영\s*안|없음|해당없음|^N$/i.test(achievementRaw);
  const admissionSource=[...majorRows,...restrictedRows].map(r=>[r['전형유형'],r['전형명'],r['선발방법'],r['전형방법'],r['서류평가'],r['교과세특'],r['비고']].map(uep08273Text).join(' ')).join(' ');
  const qualitativeLabel=/교과세특/.test(admissionSource)&&/서류/.test(admissionSource)?'교과세특·서류 반영':/교과세특/.test(admissionSource)?'교과세특 반영':/서류/.test(admissionSource)?'교과전형 서류 반영':'교과 정량평가 중심';
  const doctorLabel=/지역.{0,3}의사|지역의사/.test(admissionSource+' '+minimums.map(r=>uep08273Text(r['전형명'])+' '+uep08273Text(r['수능최저원문'])).join(' '))?'지역의사제 있음':'지역의사제 미확인';
  const generalMinRows=minimums.filter(r=>{const u=uep08273Text(r['모집단위']);return /일반.*(인문|자연)|인문.*자연|일반계열/.test(u)&&!/의예|약학|수의|간호/.test(u)});
  const repMin=generalMinRows[0]||minimums.find(r=>!/의예|약학|수의|간호|예술|체육/.test(uep08273Text(r['모집단위'])))||null;
  const repMinText=repMin?uep08273Text(repMin['수능최저원문']||'세부 기준 확인'):'공식 기준 확인';
  const profileBadges=[
    ['achievement',achievementOn?'성취도 반영':'성취도 반영 미확인',achievementOn?'내신 산정에서 반영':'공식 산정식 확인'],
    ['qualitative',qualitativeLabel,'교과전형 기준'],
    ['doctor',doctorLabel,'의예과 관련 전형'],
    ['minimum','대표 수능최저',repMinText],
    ['unho',results.length?'운호고 합격이력 있음':'운호고 합격이력 없음',results.length?results.length+'건 연결':'연결 자료 없음']
  ];
  const profileBadgeHtml='<div class="uep-uni-profile-badges">'+profileBadges.map(([tone,title,sub])=>'<div class="uep-uni-profile-badge '+tone+'"><b>'+escapeHtml(title)+'</b><span>'+escapeHtml(sub)+'</span></div>').join('')+'</div>';
`;
g=g.replace(anchor,insert+anchor);

const oldIdentity="  const identityHtml='<section class=\"uep-uni-identity\">'+identityMark+'<div><small>UNIVERSITY PROFILE</small><h2>'+escapeHtml(displayName)+'</h2><p>'+escapeHtml([university['캠퍼스'],university['기준학년도']?university['기준학년도']+' 입학전형':null].filter(Boolean).join(' · '))+'</p></div><span>'+escapeHtml(university['자료상태']||'교육용 참고')+'</span></section>';";
must(g.includes(oldIdentity),'identity block missing');
const newIdentity="  const identityMeta=[university['설립구분']||university['국공사립'],university['설립연도']?university['설립연도']+' 설립':null,university['소재지']||university['지역'],university['캠퍼스']].filter(Boolean);\n  const identityHtml='<section class=\"uep-uni-identity uep-uni-identity-08273\">'+identityMark+'<div class=\"uep-uni-identity-main\"><small>UNIVERSITY PROFILE</small><h2>'+escapeHtml(displayName)+'</h2><p>'+escapeHtml(identityMeta.join(' · ')||([university['캠퍼스'],university['기준학년도']?university['기준학년도']+' 입학전형':null].filter(Boolean).join(' · ')))+'</p></div><span>'+escapeHtml(university['자료상태']||'교육용 참고')+'</span>'+profileBadgeHtml+'</section>';";
g=g.replace(oldIdentity,newIdentity);

const oldCalc="  const calcHtml=calc?'<div class=\"uep-uni-calc-highlight\">'+calcBadge('반영학년',calc['반영학년'])+calcBadge('반영교과·과목',calc['반영교과/과목'])+calcBadge('이수학점·가중',calc['이수학점가중'])+'</div><details class=\"uep-uni-calc-details\"><summary>세부 산식 보기</summary><div class=\"uep-uni-detail-stack\">'+detailLine('등급점수',calc['석차등급배점'])+detailLine('성취도점수',calc['성취도배점/환산'])+detailLine('등급 미기재',calc['석차등급미기재과목처리'])+detailLine('최종 산식',calc['내신산식'])+'</div></details>':'<div class=\"uep-uni-detail-pending\"><b>정확한 숫자 산식 검증중</b><span>등급별 점수·성취도별 점수·가중치가 공식 원문에서 확인된 뒤 표시합니다.</span></div>';";
must(g.includes(oldCalc),'calc renderer missing');
const newCalc="  const calcHtml=calc?'<div class=\"uep-uni-calc-hero\"><div class=\"uep-uni-calc-primary\"><small>가장 중요한 산정 기준</small><strong>'+escapeHtml(achievementRaw?(achievementOn?'석차등급 + 성취도 반영':'성취도 미반영'):'성취도 반영 여부 확인')+'</strong><p>'+escapeHtml(achievementRaw||'공식 산정식에서 성취도 반영 여부를 확인합니다.')+'</p></div><div class=\"uep-uni-calc-highlight\">'+calcBadge('반영학년',calc['반영학년'])+calcBadge('반영교과·과목',calc['반영교과/과목'])+calcBadge('이수학점 가중',uep08273Yes(calc['이수학점가중'])?'가중 반영':calc['이수학점가중'])+'</div></div><details class=\"uep-uni-calc-details\"><summary>세부 산식 자세히 보기</summary><div class=\"uep-uni-detail-stack\">'+detailLine('등급점수',calc['석차등급배점'])+detailLine('등급 미기재',calc['석차등급미기재과목처리'])+detailLine('최종 산식',calc['내신산식'])+'</div></details>':'<div class=\"uep-uni-detail-pending\"><b>내신 산정 기준 검증중</b><span>공식 원문 확인 후 표시합니다.</span></div>';";
g=g.replace(oldCalc,newCalc);

// 핵심 모집단위는 기본 노출, 나머지는 접기. 원문 최저조건은 그대로 보존한다.
const oldMin="  const minHtml=minimumGroups.length?minimumGroups.map(([unit,rows])=>'<article class=\"uep-uni-min-card\"><header><h4>'+escapeHtml(unit)+'</h4><span>'+rows.length+'개 전형</span></header><div class=\"uep-uni-min-track-list\">'+rows.map(r=>'<div class=\"uep-uni-min-track\"><b>'+escapeHtml(uep08269TrackLabel(r))+'</b><p>'+escapeHtml(r['수능최저원문']||'공식 기준 확인 필요')+'</p></div>').join('')+'</div></article>').join(''):'<div class=\"uep-uni-detail-pending\"><b>모집단위별 기준 검증중</b><span>공식 원문 숫자가 확인된 기준만 표시합니다.</span></div>';";
must(g.includes(oldMin),'minimum renderer missing');
const newMin="  const minCard=([unit,rows])=>'<article class=\"uep-uni-min-card\"><header><h4>'+escapeHtml(unit)+'</h4><span>'+rows.length+'개 전형</span></header><div class=\"uep-uni-min-track-list\">'+rows.map(r=>'<div class=\"uep-uni-min-track\"><b>'+escapeHtml(uep08269TrackLabel(r))+'</b><p>'+escapeHtml(r['수능최저원문']||'공식 기준 확인 필요')+'</p></div>').join('')+'</div></article>';\n  const coreMinimumGroups=minimumGroups.filter(([unit])=>/일반.*(인문|자연)|인문.*자연|사범|의예|약학|수의|간호/.test(unit)&&!/예술|체육|특성화|농어촌|만학/.test(unit));\n  const otherMinimumGroups=minimumGroups.filter(x=>!coreMinimumGroups.includes(x));\n  const minHtml=minimumGroups.length?'<div class=\"uep-uni-min-core\">'+(coreMinimumGroups.length?coreMinimumGroups:minimumGroups.slice(0,6)).map(minCard).join('')+'</div>'+(otherMinimumGroups.length?'<details class=\"uep-uni-min-more\"><summary>기타 모집단위 수능최저 '+otherMinimumGroups.length+'개 보기</summary><div class=\"uep-uni-minimum-grid\">'+otherMinimumGroups.map(minCard).join('')+'</div></details>':''):'<div class=\"uep-uni-detail-pending\"><b>모집단위별 기준 검증중</b><span>공식 원문 숫자가 확인된 기준만 표시합니다.</span></div>';";
g=g.replace(oldMin,newMin);

g=g.replace('<div class="uep-uni-minimum-grid">\'+minHtml+\'</div>','<div class="uep-uni-minimum-layout">\'+minHtml+\'</div>');

const marker='/* UEP_08273_UNIVERSITY_VISUAL_COUNSEL */';must(!c.includes(marker),'08273 css already present');
c+=String.raw`
/* UEP_08273_UNIVERSITY_VISUAL_COUNSEL */
.uep-uni-identity-08273{grid-template-columns:auto minmax(0,1fr) auto;overflow:hidden}.uep-uni-profile-badges{grid-column:1/-1;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:2px}.uep-uni-profile-badge{min-height:58px;padding:10px 12px;border-radius:13px;border:1px solid #dce6ef;background:#f8fbfe;display:flex;flex-direction:column;justify-content:center}.uep-uni-profile-badge b{font-size:13px;line-height:1.3}.uep-uni-profile-badge span{margin-top:3px;font-size:11px;line-height:1.35;color:#61758a}.uep-uni-profile-badge.achievement{background:#eefaf3;border-color:#c8ead5}.uep-uni-profile-badge.qualitative{background:#fff1f5;border-color:#f4ccd8}.uep-uni-profile-badge.doctor{background:#fff8e8;border-color:#eedca8}.uep-uni-profile-badge.minimum{background:#eef6ff;border-color:#c9ddf6}.uep-uni-profile-badge.unho{background:#f4f0ff;border-color:#d9cff7}
.uep-uni-calc-hero{display:grid;grid-template-columns:minmax(260px,1.2fr) minmax(0,2fr);gap:12px}.uep-uni-calc-primary{padding:18px;border:1px solid #d9d2f4;border-radius:16px;background:linear-gradient(135deg,#f6f2ff,#fff)}.uep-uni-calc-primary small{font-weight:850;color:#7458bd}.uep-uni-calc-primary strong{display:block;margin-top:5px;font-size:23px;line-height:1.25;color:#302060}.uep-uni-calc-primary p{margin:8px 0 0;font-size:12px;line-height:1.5;color:#655b79}.uep-uni-calc-hero .uep-uni-calc-highlight{grid-template-columns:repeat(3,minmax(0,1fr))}
.uep-uni-minimum-layout{display:block}.uep-uni-min-core{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.uep-uni-min-track p{font-size:15px!important;font-weight:850!important;line-height:1.45!important;color:#d81b60!important}.uep-uni-min-more{margin-top:12px}.uep-uni-min-more>summary{cursor:pointer;padding:11px 14px;border:1px solid #efd3df;border-radius:12px;background:#fff7fa;color:#a62b59;font-size:13px;font-weight:850}.uep-uni-min-more[open]>summary{margin-bottom:12px}
.uep-uni-recommend-card{min-height:150px}.uep-uni-result-disclosure>summary{min-height:68px}
@media(max-width:980px){.uep-uni-profile-badges{grid-template-columns:repeat(2,minmax(0,1fr))}.uep-uni-calc-hero{grid-template-columns:1fr}.uep-uni-min-core{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:680px){.uep-uni-profile-badges,.uep-uni-min-core{grid-template-columns:1fr}.uep-uni-calc-hero .uep-uni-calc-highlight{grid-template-columns:1fr}}
`;
fs.writeFileSync(gp,g);fs.writeFileSync(cp,c);console.log('UEP 0.82.73 university visual counseling patch applied');
