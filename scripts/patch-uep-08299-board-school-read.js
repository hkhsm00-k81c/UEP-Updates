const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const rendererPath=path.join(root,'gyomuon.js');
const mainPath=path.join(root,'electron','main.cjs');
const packagePath=path.join(root,'package.json');
function read(p){return fs.readFileSync(p,'utf8');}
function write(p,s){fs.writeFileSync(p,s,'utf8');}
function must(c,m){if(!c)throw new Error(m);}
function replaceFunction(text,name,newSource){
  const rx=new RegExp('(?:async\\s+)?function\\s+'+name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'\\s*\\(');
  const m=rx.exec(text);must(m,name+' not found');const start=m.index;const brace=text.indexOf('{',m.index);must(brace>=0,name+' brace not found');
  let depth=0,end=-1,quote='',esc=false;
  for(let i=brace;i<text.length;i++){
    const ch=text[i];
    if(quote){if(esc){esc=false;continue;}if(ch==='\\'){esc=true;continue;}if(ch===quote)quote='';continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='{')depth++;else if(ch==='}'){depth--;if(depth===0){end=i+1;break;}}
  }
  must(end>0,name+' end not found');return text.slice(0,start)+newSource+text.slice(end);
}
let renderer=read(rendererPath),main=read(mainPath);const pkg=JSON.parse(read(packagePath));
must(pkg.version==='0.82.98','baseline package version mismatch: '+pkg.version);pkg.version='0.82.99';
renderer=renderer.replace(/const APP_VERSION="0\.82\.98";[^\n]*/,'const APP_VERSION="0.82.99"; /* UEP_08299_BOARD_SCHOOL_READ */');
must(renderer.includes('APP_VERSION="0.82.99"'),'runtime version replacement failed');

const readSource=`// __UEP_08299_BOARD_SCHOOL_READ__
const UEP_BOARD_SCHOOL_READ_TOKEN_08299='__UEP_BOARD_SCHOOL_READ_08299__';
const UEP_BOARD_SCHOOL_READ_CACHE_08299=new Map();
const UEP_BOARD_SCHOOL_READ_CACHE_MS_08299=6000;
async function boardSchoolReadPrime08299(ranges=[]){
  const now=Date.now(),unique=[...new Set((ranges||[]).map(v=>String(v||'').trim()).filter(Boolean))];
  const missing=unique.filter(a1=>{const hit=UEP_BOARD_SCHOOL_READ_CACHE_08299.get(a1);return !hit||(now-hit.at)>UEP_BOARD_SCHOOL_READ_CACHE_MS_08299;});
  if(!missing.length)return;
  for(let i=0;i<missing.length;i+=12){
    const group=missing.slice(i,i+12);
    let valueRanges;
    try{valueRanges=await schoolReadBatchRead(UEP_BOARD_DB_ID_08291,group);}catch(error){
      if(String(error?.code||'')==='SPREADSHEET_NOT_ALLOWED')throw boardWriteError08291('School Read API에 Board DB가 아직 등록되지 않았습니다. 관리자에게 API 0.81.07 이상 배포를 요청해 주세요.','UEP_BOARD_SCHOOL_READ_REGISTRY_REQUIRED');
      throw error;
    }
    group.forEach((a1,idx)=>{const vr=Array.isArray(valueRanges)?valueRanges[idx]:null;UEP_BOARD_SCHOOL_READ_CACHE_08299.set(a1,{at:Date.now(),values:Array.isArray(vr?.values)?vr.values:[]});});
  }
}
async function boardReadRange08291(token,a1){
  if(token===UEP_BOARD_SCHOOL_READ_TOKEN_08299){
    await boardSchoolReadPrime08299([a1]);
    return UEP_BOARD_SCHOOL_READ_CACHE_08299.get(String(a1||'').trim())?.values||[];
  }
  const url='https://sheets.googleapis.com/v4/spreadsheets/'+UEP_BOARD_DB_ID_08291+'/values/'+encodeURIComponent(a1)+'?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE';
  const data=await boardSheetsJson08291(token,url,{method:'GET'});return data.values||[];
}`;
main=replaceFunction(main,'boardReadRange08291',readSource);

const contextSource=`async function boardDbReadContext08294(ui={}){
  let status=null;try{status=await schoolReadSessionStatus({verify:true});}catch{}
  const verified=Boolean(status?.authenticated&&status?.user);
  const uiUser=ui&&typeof ui==='object'?ui:{};
  const serverUser=verified&&status.user&&typeof status.user==='object'?status.user:{};
  const user=verified?{
    ...serverUser,
    name:boardSafeText08291(serverUser.name||uiUser.name,80),
    email:boardSafeText08291(serverUser.email||uiUser.email,120),
    grade:boardSafeText08291(serverUser.grade||uiUser.grade,10),
    homeroom:boardSafeText08291(serverUser.homeroom||serverUser.classNo||uiUser.homeroom||uiUser.classNo,10),
    role:boardSafeText08291(serverUser.role||uiUser.role,120)
  }:{
    name:boardSafeText08291(uiUser.name,80),email:boardSafeText08291(uiUser.email,120),grade:boardSafeText08291(uiUser.grade,10),homeroom:boardSafeText08291(uiUser.homeroom||uiUser.classNo,10),role:boardSafeText08291(uiUser.role,120),isAdmin:false
  };
  if(verified){
    const isAdmin=Boolean(serverUser.isAdmin)||/관리자/.test(String(serverUser.role||''));
    return {token:UEP_BOARD_SCHOOL_READ_TOKEN_08299,user,isAdmin,sessionVerified:true,fallback:false,readMode:'school_read_api'};
  }
  if(!user.name&&!user.email)throw boardWriteError08291('UEP 로그인 정보를 확인해 주세요.','UEP_BOARD_LOGIN_REQUIRED');
  // Legacy compatibility only: an old admin PC may still read with a locally provisioned service account.
  // Homeroom/user Board reads no longer depend on this local credential path.
  try{
    const credentials=await resolveSchoolServiceAccount();
    if(validateServiceAccount(credentials)){
      const token=await getSheetsToken(credentials);
      return {token,user,isAdmin:false,sessionVerified:false,fallback:true,readMode:'local_service_account'};
    }
  }catch(error){
    if(error?.code!=='UEP_SCHOOL_CONNECTION_NOT_PROVISIONED')throw error;
  }
  throw boardWriteError08291('UEP 로그인 세션을 다시 확인해 주세요. 전자칠판 조회는 학교 공용 Read API를 사용합니다.','UEP_BOARD_LOGIN_REQUIRED');
}`;
main=replaceFunction(main,'boardDbReadContext08294',contextSource);

// Prime the remaining current-screen ranges in one School Read batch after the selected board gives us its grade.
const primeNeedle="  const today=boardSeoulToday08296(),nowClock=boardSeoulClock08296(),weekday=boardSeoulWeekday08296();";
const primeInsert=`  const today=boardSeoulToday08296(),nowClock=boardSeoulClock08296(),weekday=boardSeoulWeekday08296();\n  if(ctx.token===UEP_BOARD_SCHOOL_READ_TOKEN_08299){\n    const noticeRanges=grade==='1'?[\"'06_1학년공지'!A3:V500\",\"'08_전교공지'!A3:V500\"]:grade==='2'?[\"'07_2학년공지'!A3:V500\",\"'08_전교공지'!A3:V500\"]:[\"'08_전교공지'!A3:V500\"];\n    await boardSchoolReadPrime08299([...noticeRanges,\"'09_일정'!A3:T800\",\"'05_학급시간표'!A3:Q800\",\"'22_시험운영'!A3:Q300\",\"'23_시험시간표'!A3:Q600\"]);\n  }`;
must(main.includes(primeNeedle),'detail prime insertion point missing');main=main.replace(primeNeedle,primeInsert);

main+='\n// __UEP_08299_BOARD_SCHOOL_READ_END__: Board 조회 is School Read API first; writes stay on the existing authenticated write path.\n';
write(rendererPath,renderer);write(mainPath,main);write(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP 0.82.99 Board School Read patch applied');
