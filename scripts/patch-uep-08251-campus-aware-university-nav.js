const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'gyomuon.js'),pp=path.join(root,'package.json');
let g=fs.readFileSync(gp,'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};
must(/APP_VERSION\s*=\s*["']0\.82\.50["']/.test(g),'0.82.50 base not found');
g=g.replace(/APP_VERSION\s*=\s*["']0\.82\.50["']/,'APP_VERSION="0.82.51"').replace(/const CURRENT='0\.82\.50';/g,"const CURRENT='0.82.51';");
if(fs.existsSync(pp)){const p=JSON.parse(fs.readFileSync(pp,'utf8'));p.version='0.82.51';fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');}

const start=g.indexOf('function uep08223UniversityRegions(university){');
const end=g.indexOf('function uep08223TodayNav(university){',start);
must(start>=0&&end>start,'region resolver block not found');
const helper=String.raw`function uep08251CampusRegion(segment,name=''){
  const s=String(segment||'').replace(/캠퍼스$/,'').trim(),n=String(name||'').trim();
  if(!s)return '';
  if(s==='글로벌'&&/한국외국어대학교|가천대학교/.test(n))return '경기';
  if(s==='메디컬'&&/가천대학교/.test(n))return '인천';
  const rules=[['서울',/서울|관악|신촌/],['경기',/경기|수원|안산|고양|죽전|용인|안성|평택|다빈치|국제|의정부|의왕|성남/],['인천',/인천|송도/],['충북',/충북|청주|충주|증평|개신|글로컬/],['충남',/충남|천안|아산|당진|서산|태안|예산|논산|공주/],['대전',/대전/],['세종',/세종/],['강원',/강원|원주|미래/],['부산',/부산/],['대구',/대구/],['광주',/광주/],['전북',/전북|전주/],['전남',/전남|나주|여수/],['경북',/경북|포항|경주|경산|상주|WISE/],['경남',/경남|진주|통영|창원|양산|밀양|울산/]];
  for(const [r,re] of rules)if(re.test(s))return r;
  return '';
}
function uep08223UniversityRegions(university){
  const name=String(university?.['대학명']||'').trim(),campus=String(university?.['캠퍼스']||'').trim();
  const regions=[],add=r=>{if(r&&!regions.includes(r))regions.push(r)};
  const parts=campus.split(/[\/·,]/).map(x=>x.trim()).filter(Boolean);
  for(const part of parts)add(uep08251CampusRegion(part,name));
  if(regions.length)return regions;
  if(name==='세종대학교')return ['서울'];
  if(/울산과학기술원|UNIST/i.test(name))return ['경남'];
  const fallback=[['서울',/서울|광운|숭실|서강/],['경기',/경기|ERICA|가천|명지/],['인천',/인천/],['충북',/충북|교원|청주/],['충남',/충남/],['대전',/대전|KAIST|한국과학기술원/],['세종',/^고려대학교 세종|세종캠퍼스/],['강원',/강원|미래캠퍼스/],['부산',/부산|해양/],['대구',/대구|DGIST/],['광주',/광주|GIST/],['전북',/전북/],['전남',/전남|에너지공과/],['경북',/경북|포항|한동|WISE/],['경남',/경남/]];
  for(const [r,re] of fallback)if(re.test(name))add(r);
  if(!regions.length)add('기타');return regions;
}
function uep08251UniversityDisplayNameForRegion(university,region){
  const name=String(university?.['대학명']||'').trim(),campus=String(university?.['캠퍼스']||'').trim();
  if(!name)return '';
  const parts=campus.split(/[\/·,]/).map(x=>x.trim()).filter(Boolean);
  if(parts.length>1){
    const active=String(region||'').trim();
    const selected=parts.find(p=>uep08251CampusRegion(p,name)===active)||parts[0];
    const clean=selected.replace(/캠퍼스$/,'').trim();
    if(clean&&name!==clean&&!name.includes(clean))return name+' '+clean+'캠퍼스';
  }
  return uep08244UniversityDisplayName(university)||name;
}
`;
g=g.slice(0,start)+helper+g.slice(end);

const navOld="escapeHtml(uep08244UniversityDisplayName(u))";
must(g.includes(navOld),'today-nav display call not found');
g=g.replace(navOld,"escapeHtml(uep08251UniversityDisplayNameForRegion(u,active))");
const titleOld="displayName=uep08244UniversityDisplayName(university)||name";
must(g.includes(titleOld),'detail display name call not found');
g=g.replace(titleOld,"displayName=uep08251UniversityDisplayNameForRegion(university,window.__uepAdmissionRegion)||name");

const notesRe=/const UEP_08221_RELEASE_NOTES=\[[\s\S]*?\];/;
must(notesRe.test(g),'shared release notes list not found');
g=g.replace(notesRe,`const UEP_08221_RELEASE_NOTES=[
  '한양대학교 ERICA의 묶음 전형을 53B 실제 전형 단위로 분리해 카드가 각각 표시되도록 정리했습니다.',
  '지역 선택 시 복수 캠퍼스 대학은 해당 지역의 캠퍼스명만 표시합니다.',
  '예: 경기에서는 성균관대 수원, 중앙대 다빈치, 경희대 국제, 한국외대 글로벌, 가천대 글로벌캠퍼스로 표시합니다.',
  '인천에서는 가천대학교 메디컬캠퍼스를 별도로 판별합니다.',
  '로그인 단계화와 대학 데이터 3차 백그라운드 연결 구조는 그대로 유지합니다.'
];`);

g+='\n/* UEP_08251_CAMPUS_AWARE_NAV: campus-segment region resolver + region-specific university labels */\n';
fs.writeFileSync(gp,g,'utf8');
console.log('UEP 0.82.51 campus-aware navigation patch PASS');
