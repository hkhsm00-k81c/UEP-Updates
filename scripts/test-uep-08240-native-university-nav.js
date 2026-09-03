const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {JSDOM}=require('jsdom');
const g=fs.readFileSync(path.join(process.argv[2]||'app','resources','app','gyomuon.js'),'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(g.includes('const APP_VERSION = "0.82.40";'),'version mismatch');
must(!g.includes('setTimeout(uep08223BindUniversityNavigation,0);'),'broken native binder call remains');
must(!g.includes('/* UEP_08239_UNIVERSITY_NAV_BINDINGS */'),'0.82.39 wrapper remains');
for(const s of ["layer.querySelectorAll('[data-uep-region]')","layer.querySelectorAll('[data-uep-university]')","layer.querySelectorAll('[data-uep-prev]')","layer.querySelectorAll('[data-uep-next]')"])must(g.includes(s),'native binding missing: '+s);
must(!/MutationObserver/.test(g.slice(g.indexOf('function openDashboardUniversityDetail'),g.indexOf('function dashboardStudentStatusCompactMarkup'))),'MutationObserver leaked into native university renderer');

function extractFunction(src,name){
  const start=src.indexOf('function '+name+'(');must(start>=0,'function missing: '+name);
  const brace=src.indexOf('{',start);let depth=0,quote=null,escape=false,templateDepth=0;
  for(let i=brace;i<src.length;i++){
    const c=src[i],n=src[i+1];
    if(quote){
      if(escape){escape=false;continue;}
      if(c==='\\'){escape=true;continue;}
      if(quote==='`'&&c==='$'&&n==='{'){templateDepth++;i++;continue;}
      if(quote==='`'&&templateDepth&&c==='}'){templateDepth--;continue;}
      if(c===quote&&templateDepth===0)quote=null;
      continue;
    }
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='/'&&n==='/'){i=src.indexOf('\n',i);if(i<0)break;continue;}
    if(c==='/'&&n==='*'){i=src.indexOf('*/',i+2)+1;continue;}
    if(c==='{')depth++;
    if(c==='}'&&--depth===0)return src.slice(start,i+1);
  }
  throw new Error('unterminated function: '+name);
}

const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://uep.local'});
const universities=[
  {'대학명':'서울A대','지역':'서울','기준학년도':'2028'},
  {'대학명':'서울B대','지역':'서울','기준학년도':'2028'},
  {'대학명':'부산C대','지역':'부산','기준학년도':'2028'}
];
const context={
  window:dom.window,document:dom.window.document,console,setTimeout:fn=>fn(),
  dashboardAdmissionTodayUniversity:()=>universities[0],
  dashboardAdmissionUniversities:()=>universities,
  dashboardAdmissionNormalizeUniversity:v=>String(v||'').replace(/대학교/g,'대').replace(/\s|\(.*?\)/g,''),
  dashboardAdmissionStructureRows:()=>[],dashboardAdmissionRows:()=>[],dashboardAdmissionMethod:()=>'',
  uep08223UniversityRegions:u=>[String(u['지역']||'기타')],
  escapeHtml:v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),
  openDashboardAdmissionDialog:(title,body)=>{context.openDashboardAdmissionDialogBase(title,body);},
  openDashboardAdmissionDialogBase:(title,body)=>{const old=dom.window.document.querySelector('.dashboard-admission-layer');if(old)old.remove();const layer=dom.window.document.createElement('div');layer.className='dashboard-admission-layer';layer.innerHTML='<div class="dashboard-admission-dialog"><h2>'+title+'</h2><div class="dashboard-admission-body">'+body+'</div></div>';dom.window.document.body.appendChild(layer);},
};
context.window.__uepAdmissionReturn='today';
vm.createContext(context);
vm.runInContext(extractFunction(g,'uep08223TodayNav'),context);
vm.runInContext(extractFunction(g,'openDashboardUniversityDetail'),context);

const click=selector=>{const el=dom.window.document.querySelector(selector);must(el,'DOM element missing: '+selector);el.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true}));};
const title=()=>dom.window.document.querySelector('.dashboard-admission-dialog h2')?.textContent||'';

context.openDashboardUniversityDetail(universities[0]);
must(title()==='서울A대','initial university detail did not render');
let region=dom.window.document.querySelector('[data-uep-region="부산"]');must(region,'region button not rendered from actual nav');
click('[data-uep-region="부산"]');must(title()==='부산C대','region click did not open first university in region');

context.openDashboardUniversityDetail(universities[0]);
click('[data-uep-university="서울B대"]');must(title()==='서울B대','university click failed');

context.window.__uepAdmissionRegion='서울';context.openDashboardUniversityDetail(universities[0]);
click('[data-uep-prev]');must(title()==='서울B대','previous university click failed');

context.window.__uepAdmissionRegion='서울';context.openDashboardUniversityDetail(universities[0]);
click('[data-uep-next]');must(title()==='서울B대','next university click failed');

console.log('UEP 0.82.40 actual DOM navigation PASS: region -> university -> prev -> next');
