const fs=require('fs');
const g='app/resources/app/gyomuon.js';
let s=fs.readFileSync(g,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

// 0.80.66 and 0.80.67 were successive approval-popup repair layers. 0.80.68 is the final implementation and stays.
const start66=s.indexOf('// UEP 0.80.66 - 빠른열기 결재라인 팝업 안전 범위 UI 보정');
const start68=s.indexOf('// UEP 0.80.68 - 빠른열기 결재라인 왼쪽 카드 직접 보정');
must(start66>=0&&start68>start66,'approval repair chain markers missing');
s=s.slice(0,start66)+`// UEP 0.81.72: 0.80.66~0.80.67 중복 결재라인 DOM 감시 제거. 최종 0.80.68 보정만 유지.\n`+s.slice(start68);

// Operational refresh should redraw only pages that actually consume the operational domains.
const anchor='let operationalRefreshInFlight=null;\nasync function refreshOperationalCacheSilently({rerender=true}={}){';
must(s.includes(anchor),'operational refresh anchor missing');
const helper=`const OPERATIONAL_RENDER_PAGES08172=new Set(['dashboard','attendance','students','alerts','work','duties','settings']);\nfunction operationalPageNeedsRender08172(page){return OPERATIONAL_RENDER_PAGES08172.has(String(page||''));}\n`;
s=s.replace(anchor,helper+anchor);
const old=`      if(rerender&&state.activePage)render(state.activePage);`;
const neu=`      if(rerender&&state.activePage&&operationalPageNeedsRender08172(state.activePage))render(state.activePage);`;
must(s.includes(old),'operational unconditional rerender missing');
s=s.replace(old,neu);

fs.writeFileSync(g,s,'utf8');
console.log('UEP 0.81.72 R7 render scope cleanup applied');
