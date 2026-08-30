const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};
A(g.includes('UEP_08195_SELECTION_NORMALIZER_START'),'0.81.95 normalizer must be installed first');
const old="const termFlow=r=>{const raw=clean(r?.['연계학기']||r?.['학기']);const p=raw.split(/→|->/).map(x=>x.trim()).filter(Boolean);return p.length>1?p:[clean(r?.['학기']),clean(r?.['연계학기'])].filter(Boolean)};";
const replacement="const termFlow=r=>{const term=clean(r?.['학기']),linked=clean(r?.['연계학기']);for(const raw of [term,linked]){const p=raw.split(/→|->/).map(x=>x.trim()).filter(Boolean);if(p.length>1)return[p[0],p[p.length-1]]}if(/^[23]-[12]$/.test(term)&&/^[23]-[12]$/.test(linked))return[term,linked];return[term,linked].filter(x=>/^[23]-[12]$/.test(x))};";
A(g.includes(old),'termFlow anchor changed');
g=g.replace(old,replacement);
if(!g.includes('UEP_08195_PRIORTERM_FIX_START')){
  const marker="/* UEP_08195_SELECTION_NORMALIZER_START */";
  g=g.replace(marker,marker+"\n/* UEP_08195_PRIORTERM_FIX_START: 학기/연계학기 어느 쪽에 화살표가 있어도 선수학기를 정확히 해석 */");
}
fs.writeFileSync(gFile,g,'utf8');
console.log('patched UEP 0.81.95 prior-term flow parsing for linked/science prerequisite checks');
