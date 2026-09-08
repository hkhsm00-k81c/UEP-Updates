const fs=require('fs'),path=require('path');
const root=process.argv[2];if(!root)throw new Error('app root required');
const gp=path.join(root,'gyomuon.js'),mp=path.join(root,'electron','main.cjs'),pp=path.join(root,'package.json'),lp=path.join(root,'package-lock.json');
let g=fs.readFileSync(gp,'utf8'),m=fs.readFileSync(mp,'utf8');
const must=(x,msg)=>{if(!x)throw new Error(msg)};

must(g.includes('0.82.75'),'expected renderer 0.82.75');
const helper="  const uep08273Text=v=>String(v??'').trim();\n  const uep08273Yes=v=>/^(Y|YES|O|있음|반영|적용)$/i.test(uep08273Text(v))||/반영|적용/.test(uep08273Text(v));\n  const achievementRaw=calc?uep08273Text(calc['성취도배점/환산']||calc['성취도반영']||calc['성취도']):'';\n  const achievementOn=achievementRaw&&!/미반영|반영\\s*안|없음|해당없음|^N$/i.test(achievementRaw);\n";
const helperCrlf=helper.replace(/\n/g,'\r\n');
const exact=g.includes(helper)?helper:(g.includes(helperCrlf)?helperCrlf:null);
must(exact,'expected 0.82.73 achievement helper block');
const calcAnchor="  const detailLine=(label,value)=>value?'<div class=\"uep-uni-detail-line\"><b>'+escapeHtml(label)+'</b><span>'+escapeHtml(value)+'</span></div>':'';";
const calcPos=g.indexOf(calcAnchor);
const helperPos=g.indexOf(exact);
must(calcPos>=0,'grade calculation anchor missing');
must(helperPos>calcPos,'expected helper block to be after calc markup (TDZ regression)');

// Move the existing helper definitions before their first use. No data interpretation changes.
g=g.slice(0,helperPos)+g.slice(helperPos+exact.length);
const insertPos=g.indexOf(calcAnchor);
g=g.slice(0,insertPos)+exact+g.slice(insertPos);

const fnStart=g.indexOf('function openDashboardUniversityDetail');
const calcUse=g.indexOf('const calcHtml=',fnStart);
const declRaw=g.indexOf('const achievementRaw=',fnStart);
const declYes=g.indexOf('const uep08273Yes=',fnStart);
must(fnStart>=0&&declRaw>=0&&declYes>=0&&calcUse>=0,'university detail markers missing after patch');
must(declRaw<calcUse&&declYes<calcUse,'achievement helpers still initialize after first use');
must((g.match(/const achievementRaw=/g)||[]).length===1,'achievementRaw duplicated');
must((g.match(/const uep08273Yes=/g)||[]).length===1,'uep08273Yes duplicated');

for(const p of [gp,mp,pp,lp]){
  if(!fs.existsSync(p))continue;
  let x=p===gp?g:(p===mp?m:fs.readFileSync(p,'utf8'));
  x=x.replaceAll('0.82.75','0.82.76');
  fs.writeFileSync(p,x,'utf8');
  if(p===gp)g=x;if(p===mp)m=x;
}
console.log('UEP 0.82.76 university detail TDZ fix applied');
