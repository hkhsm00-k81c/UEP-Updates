const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const rendererPath=path.join(root,'gyomuon.js');
const mainPath=path.join(root,'electron','main.cjs');
const packagePath=path.join(root,'package.json');
function read(p){return fs.readFileSync(p,'utf8');}
function write(p,s){fs.writeFileSync(p,s,'utf8');}
function must(c,m){if(!c)throw new Error(m);}
function replaceOnce(text,from,to,label){const i=text.indexOf(from);must(i>=0,label+' source pattern not found');must(text.indexOf(from,i+from.length)<0,label+' source pattern not unique');return text.slice(0,i)+to+text.slice(i+from.length);}
function replaceFunction(text,name,newSource){
  const start=text.indexOf('function '+name+'(');must(start>=0,name+' not found');
  const brace=text.indexOf('{',start);must(brace>=0,name+' brace not found');
  let depth=0,end=-1;let quote='',esc=false;
  for(let i=brace;i<text.length;i++){
    const ch=text[i];
    if(quote){if(esc){esc=false;continue;}if(ch==='\\'){esc=true;continue;}if(ch===quote)quote='';continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='{')depth++;else if(ch==='}'){depth--;if(depth===0){end=i+1;break;}}
  }
  must(end>0,name+' end not found');return text.slice(0,start)+newSource+text.slice(end);
}
function injectBeforeReturnsInFunction(text,name,statement){
  const start=text.indexOf('function '+name+'(');must(start>=0,name+' not found');
  const next=text.indexOf('\nfunction ',start+10);const end=next>=0?next:text.length;
  const block=text.slice(start,end);must(block.includes('return true;'),name+' return true not found');
  const patched=block.replace(/return true;/g,statement+'return true;');
  return text.slice(0,start)+patched+text.slice(end);
}

let renderer=read(rendererPath), main=read(mainPath);
const pkg=JSON.parse(read(packagePath));
must(pkg.version==='0.82.91',`baseline package version mismatch: ${pkg.version}`);
pkg.version='0.82.92';
renderer=replaceOnce(renderer,'const APP_VERSION="0.82.91"; /* UEP_08291_BOARD_DB_WRITE */','const APP_VERSION="0.82.92"; /* UEP_08292_BOARD_TARGET_ACADEMIC_STAGE */','runtime version');

// 1) Board target parsing: normalize NBSP/middle dots/spacing and parse the visible class label robustly.
main=replaceFunction(main,'boardTarget08291',String.raw`function boardTarget08291(raw,user){
  const normalize=v=>String(v??'').replace(/\u00a0/g,' ').replace(/[·ㆍ]/g,' ').replace(/\s+/g,' ').trim();
  const digit=v=>normalize(v).match(/\d{1,2}/)?.[0]||'';
  const target=normalize(boardSafeText08291(raw,80))||'내 반';
  if(target==='내 반'){
    const grade=digit(user?.grade), classNo=digit(user?.homeroom);
    if(!grade||!classNo)throw boardWriteError08291('담임 학년·반 정보를 확인해 주세요.','UEP_BOARD_HOMEROOM_INVALID');
    return {label:grade+'학년 '+classNo+'반',grade,classNo,scope:'class'};
  }
  if(target==='전교')return {label:'전교',grade:'전체',classNo:'전체',scope:'school'};
  const compact=target.replace(/\s+/g,'');
  const gradeAll=compact.match(/^([123])학년전체$/);
  if(gradeAll)return {label:gradeAll[1]+'학년 전체',grade:gradeAll[1],classNo:'전체',scope:'grade'};
  const cls=compact.match(/^([123])학년(\d{1,2})반$/);
  if(cls)return {label:cls[1]+'학년 '+String(Number(cls[2]))+'반',grade:cls[1],classNo:String(Number(cls[2])),scope:'class'};
  const short=compact.match(/^([123])[-_.](\d{1,2})$/);
  if(short)return {label:short[1]+'학년 '+String(Number(short[2]))+'반',grade:short[1],classNo:String(Number(short[2])),scope:'class'};
  if(compact.startsWith('특별실'))return {label:target,grade:'',classNo:'',scope:'special'};
  throw boardWriteError08291('표시 대상을 확인해 주세요. ['+target+']','UEP_BOARD_TARGET_INVALID');
}`);
main=main.replace('// __UEP_08291_BOARD_DB_WRITE__','// __UEP_08291_BOARD_DB_WRITE__\n// __UEP_08292_BOARD_TARGET_FIX__');

// 2) Academic stage readiness must be judged from actual internal-score rows, not admissions cache presence.
const admissionReady='function uep08274AdmissionRowsReady(){return Array.isArray(readonlyCache?.universityAdmissions)&&readonlyCache.universityAdmissions.length>0;}';
must(renderer.includes(admissionReady),'admission readiness function missing');
renderer=renderer.replace(admissionReady,admissionReady+`\nfunction uep08292AcademicRowsReady(){\n  const rows=Array.isArray(readonlyCache?.scoreRecords)?readonlyCache.scoreRecords:[];\n  return rows.some(row=>String(row?.scoreType||'')==='내신');\n}\nfunction uep08292KickAcademicStage(){\n  if(!uep08292AcademicRowsReady()) Promise.resolve().then(()=>uep08250StartBackgroundStages()).catch(()=>{});\n}`);
renderer=renderer.replace("UEP_08250_LOAD.academic='ready';\n      UEP_08250_LOAD.admission=uep08274AdmissionRowsReady()?'ready':'error';","UEP_08250_LOAD.academic=uep08292AcademicRowsReady()?'ready':'error';\n      UEP_08250_LOAD.admission=uep08274AdmissionRowsReady()?'ready':'error';");
renderer=replaceFunction(renderer,'uep08250StartBackgroundStages',`async function uep08250StartBackgroundStages(){\n  if(UEP_08250_LOAD.running)return;\n  UEP_08250_LOAD.running=true;uep08250Emit();\n  try{\n    if(uep08292AcademicRowsReady()){UEP_08250_LOAD.academic='ready';uep08250Emit();}\n    else await uep08250RefreshStage('academic');\n    if(uep08274AdmissionRowsReady()){UEP_08250_LOAD.admission='ready';uep08250Emit();}\n    else await uep08250RefreshStage('admission');\n  }finally{UEP_08250_LOAD.running=false;uep08250Emit();}\n}`);

// Remembered-session paths previously skipped the staged academic refresh.
renderer=replaceOnce(renderer,"refreshOperationalCacheSilently({rerender:false}).catch(()=>{});navigate(state.activePage||'dashboard');});","refreshOperationalCacheSilently({rerender:false}).catch(()=>{});navigate(state.activePage||'dashboard');uep08292KickAcademicStage();});",'remembered continue academic kick');
renderer=injectBeforeReturnsInFunction(renderer,'restoreRememberedSessionImmediately','uep08292KickAcademicStage();');
renderer=injectBeforeReturnsInFunction(renderer,'initializeUserSessionGate','uep08292KickAcademicStage();');

// When users enter academic-dependent pages with a partial cache, trigger one background refresh and rerender after success.
const academicRouteHelper=`\n// __UEP_08292_ACADEMIC_ROUTE_GUARD__\nlet UEP_08292_ACADEMIC_ROUTE_PROMISE=null;\nfunction uep08292EnsureAcademicForPage(page){\n  if(!['students','studentsAll','grades'].includes(String(page||''))||uep08292AcademicRowsReady()||UEP_08292_ACADEMIC_ROUTE_PROMISE)return;\n  UEP_08292_ACADEMIC_ROUTE_PROMISE=(async()=>{\n    const ok=await uep08250RefreshStage('academic');\n    if(ok&&uep08292AcademicRowsReady()&&String(state.activePage||'')===String(page||''))render(page);\n  })().finally(()=>{UEP_08292_ACADEMIC_ROUTE_PROMISE=null;});\n}\n`;
const navigateStart='function navigate(page) {';
must(renderer.includes(navigateStart),'navigate function not found');
renderer=renderer.replace(navigateStart,academicRouteHelper+'\n'+navigateStart);
// Add guard near start of navigate without blocking normal navigation.
renderer=renderer.replace(navigateStart,navigateStart+"\n  Promise.resolve().then(()=>uep08292EnsureAcademicForPage(page)).catch(()=>{});");

write(rendererPath,renderer);write(mainPath,main);write(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP 0.82.92 Board target + academic stage patch applied');
