const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const p=path.join(root,'resources','app','gyomuon.js');
let s=fs.readFileSync(p,'utf8');
if(!s.includes('const APP_VERSION = "0.82.18";')) throw new Error('0.82.18 base not found');
s=s.replace('const APP_VERSION = "0.82.18";','const APP_VERSION = "0.82.19";');
// UEP_08219_ADMISSIONS_LIVE
// Keep the stable 0.82.18 School Read API/login path intact. Add admissions ranges to the existing school batch-read request.
const rangeMarker="'56_대학입시마스터!A:R'";
if(!s.includes(rangeMarker)){
  const candidates=["'55_대학입결DB!A:Z'",'"55_대학입결DB!A:Z"',"'54_수능최저DB!A:Z'",'"54_수능최저DB!A:Z"'];
  let hit=candidates.find(x=>s.includes(x));
  if(!hit) throw new Error('admissions range insertion anchor not found');
  const quote=hit[0];
  const extra=[
    `${quote}52_대입기초!A:Z${quote}`,
    `${quote}53_전형이해!A:Z${quote}`,
    `${quote}53A_전형세부유형DB!A:R${quote}`,
    `${quote}53B_전형유형별대학DB!A:Z${quote}`,
    `${quote}54_수능최저DB!A:Z${quote}`,
    `${quote}55_대학입결DB!A:Z${quote}`,
    `${quote}56_대학입시마스터!A:R${quote}`
  ].join(',');
  s=s.replace(hit,extra);
}
// expose a stable range manifest for dashboard admissions readers; existing renderers can consume the same batch-read cache.
const manifest=`\n/* UEP_08219_ADMISSIONS_LIVE */\nconst UEP_ADMISSIONS_LIVE_RANGES = Object.freeze({\n basics:'52_대입기초!A:Z',\n types:'53_전형이해!A:Z',\n typeDetail:'53A_전형세부유형DB!A:R',\n typeUniversity:'53B_전형유형별대학DB!A:Z',\n csatMinimum:'54_수능최저DB!A:Z',\n schoolResults:'55_대학입결DB!A:Z',\n universityMaster:'56_대학입시마스터!A:R'\n});\n`;
if(!s.includes('UEP_08219_ADMISSIONS_LIVE')) s+=manifest;
fs.writeFileSync(p,s,'utf8');
console.log('patched',p);
