const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const pp=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.37["'];/.test(g),'0.82.37 base not found');
must((g.match(/uep08223UniversityRegions/g)||[]).length===3,'unexpected university-region reference count');
must(!/function\s+uep08223UniversityRegions\s*\(/.test(g),'region helper already exists');

g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.37["'];/,()=> 'const APP_VERSION = "0.82.38";')
   .replace(/const CURRENT='0\.82\.37';/g,()=>"const CURRENT='0.82.38';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.38';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n','utf8');}

const anchor='function uep08223TodayNav(university){';
must(g.includes(anchor),'today nav anchor not found');
const helper=`function uep08223UniversityRegions(university){
  const text=[university?.['대학명'],university?.['캠퍼스']].filter(Boolean).join(' ');
  const regions=[];
  const add=r=>{if(r&&!regions.includes(r))regions.push(r);};
  const rules=[
    ['서울',/서울|관악|신촌|광운|숭실|서강|성균관.*서울|한양.*서울/],
    ['경기',/경기|수원|안산|고양|죽전|용인|안성|평택|ERICA|글로벌|메디컬/],
    ['인천',/인천|송도/],
    ['충북',/충북|청주|충주|증평|개신|글로컬/],
    ['충남',/충남|천안|아산|당진|서산|태안|예산/],
    ['대전',/대전|KAIST|한국과학기술원/],
    ['세종',/세종/],
    ['강원',/강원|원주/],
    ['부산',/부산/],
    ['대구',/대구|DGIST|대구경북과학기술원/],
    ['광주',/광주|GIST|광주과학기술원/],
    ['전북',/전북|전주/],
    ['전남',/전남|나주|여수/],
    ['경북',/경북|포항|경주|경산|상주/],
    ['경남',/경남|진주|통영|창원|양산|밀양/]
  ];
  for(const [region,re] of rules)if(re.test(text))add(region);
  const name=String(university?.['대학명']||'');
  if(/명지대학교/.test(name)){add('서울');add('경기');}
  if(/가천대학교/.test(name))add('경기');
  if(/한국교통대학교/.test(name)){add('충북');add('경기');}
  if(/경희대학교/.test(name)){add('서울');add('경기');}
  if(/성균관대학교/.test(name)){add('서울');add('경기');}
  if(!regions.length)add('기타');
  return regions;
}
`;
g=g.replace(anchor,()=>helper+anchor);

g += `\n/* UEP_08238_UNIVERSITY_REGION_HELPER */\n// Restores the missing pure region resolver used by uep08223TodayNav. No DOM interception.\n`;
g += `\n/* UEP_08238_RELEASE_NOTES */\n(function(){const VERSION='0.82.38',KEY='uep:release-notes:'+VERSION;function show(){try{if(localStorage.getItem(KEY)==='shown')return;}catch(e){}if(document.getElementById('uep-release-08238'))return;const o=document.createElement('div');o.id='uep-release-08238';o.className='uep-release-overlay';o.innerHTML='<div class="uep-release-card"><div class="uep-release-kicker">UEP 업데이트</div><h2>v0.82.38 수정사항</h2><ul><li>오늘의 대학 상세에서 호출되지만 정의가 빠져 있던 지역 판별 함수를 복구했습니다.</li><li>구글시트 연결 후 실제 대학행이 존재할 때 상세 팝업이 열리지 않던 원인을 제거했습니다.</li><li>대입기초·전형이해·오늘의 대학은 기존 네이티브 라우터를 그대로 사용합니다.</li><li>전역 클릭 감지·MutationObserver·텍스트 후처리 코드는 추가하지 않았습니다.</li></ul><button type="button">확인</button></div>';const close=()=>{try{localStorage.setItem(KEY,'shown');}catch(e){}o.remove();};o.querySelector('button').onclick=close;o.onclick=e=>{if(e.target===o)close();};document.body.appendChild(o);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(show,900),{once:true});else setTimeout(show,900);})();\n`;

must(/function\s+uep08223UniversityRegions\s*\(/.test(g),'region helper insertion failed');
must((g.match(/uep08223UniversityRegions/g)||[]).length===4,'unexpected post-patch region helper/reference count');
must(g.includes('UEP_08238_UNIVERSITY_REGION_HELPER'),'patch marker missing');
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.38 missing university region helper restored');
