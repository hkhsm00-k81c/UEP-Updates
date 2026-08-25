const fs=require('fs');
const g='app/resources/app/gyomuon.js',m='app/resources/app/electron/main.cjs';
let gy=fs.readFileSync(g,'utf8'),main=fs.readFileSync(m,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const rep=(src,from,to,label)=>{must(src.includes(from),'missing '+label);must(src.indexOf(from)===src.lastIndexOf(from),'non-unique '+label);return src.replace(from,to)};
function functionBlock(src,name){let start=src.indexOf(`async function ${name}`);if(start<0)start=src.indexOf(`function ${name}`);must(start>=0,'function missing: '+name);const candidates=[src.indexOf('\nasync function ',start+20),src.indexOf('\nfunction ',start+20),src.indexOf('\nipcMain.handle',start+20)].filter(x=>x>start);const end=candidates.length?Math.min(...candidates):src.length;return {start,end,block:src.slice(start,end)};}
function replaceFn(src,name,fn){const hit=functionBlock(src,name),block=fn(hit.block);must(block!==hit.block,'no change in '+name);return src.slice(0,hit.start)+block+src.slice(hit.end);}

// Canonical program writer returns a normalized local patch instead of rebuilding every UEP data domain.
main=replaceFn(main,'saveProgramOperation',block=>block.replace(
`  liveDataCache=null; liveDataFetchedAt=0;\n  const data=await fetchLiveData({force:true});\n  return {ok:true,data,sheet:specs.sheet};`,
`  const programPatch={source,programId,sessionId,date,endDate,time:startTime&&endTime?startTime+'~'+endTime:time,startTime,endTime,place,teacher,title,actualTitle:title,recordTitle,department,subject,reportRequired:reportRequired===undefined?undefined:reportRequired==='Y',reportToAuthority:reportToAuthority===undefined?undefined:reportToAuthority==='Y',reportAgency,reportAfterDays,reportDeadline,photoRequired:photoRequired===undefined?undefined:photoRequired==='Y',memo,type:activityType,activityType,afterType,weekdays,operationPeriod,targetGrade,nightLinked:nightLinked===undefined?undefined:nightLinked==='Y',affectsAttendance:nightLinked===undefined?undefined:nightLinked==='Y',attendanceMethod,status,reportFormUrl:commonReportFormUrl===undefined?undefined:commonReportFormUrl,commonReportFormUrl};\n  if(liveDataCache&&Array.isArray(liveDataCache.programs)){\n    liveDataCache={...liveDataCache,programs:liveDataCache.programs.map(row=>{\n      const sameSource=!source||String(row?.source||'')===source;\n      const sameProgram=!programId||String(row?.programId||row?.courseId||row?.id||'')===programId;\n      const sameSession=!sessionId||String(row?.sessionId||'')===sessionId;\n      if(!(sameSource&&sameProgram&&sameSession))return row;\n      const clean=Object.fromEntries(Object.entries(programPatch).filter(([,v])=>v!==undefined));return {...row,...clean};\n    })};\n    if(reportFormSettingKey&&commonReportFormUrl!==undefined&&Array.isArray(liveDataCache.settings)){liveDataCache={...liveDataCache,settings:liveDataCache.settings.map(row=>String(row?.key||row?.settingKey||row?.['설정키']||'')===reportFormSettingKey?{...row,value:commonReportFormUrl,settingValue:commonReportFormUrl,'설정값':commonReportFormUrl}:row)};}\n    liveDataFetchedAt=Date.now();\n  }\n  return {ok:true,programPatch,sheet:specs.sheet};`));

// One merge helper updates the actual connected program record in renderer memory.
const helperAnchor='async function migrateAdminProgramOverridesToSheetOnce(){';
must(gy.includes(helperAnchor),'program migration anchor missing');
const helper=`function applyProgramWritePatch08172(target,patch){\n  if(!target||!patch)return target;\n  for(const [key,value] of Object.entries(patch)){if(value!==undefined)target[key]=value;}\n  if(patch.commonReportFormUrl!==undefined)target.reportFormUrl=patch.commonReportFormUrl;\n  if(patch.activityType!==undefined)target.type=patch.activityType;\n  if(patch.nightLinked!==undefined)target.affectsAttendance=Boolean(patch.nightLinked);\n  return target;\n}\n\n`;
gy=gy.replace(helperAnchor,helper+helperAnchor);

// Migration path: update the existing cached program, never replace the whole cache.
gy=rep(gy,
`      if(result.data) readonlyCache=result.data;\n      const kept={...override};`,
`      if(result?.programPatch)applyProgramWritePatch08172(program,result.programPatch);\n      const kept={...override};`,
'program migration whole-cache replacement');

// Connected program editor: source is the actual readonlyCache record; merge server-confirmed patch there.
gy=rep(gy,
`        if(result.data) readonlyCache=result.data;\n        const kept={...(state.programOverrides[id]||{})};`,
`        if(result?.programPatch){applyProgramWritePatch08172(source,result.programPatch);applyProgramWritePatch08172(program,result.programPatch);}\n        const kept={...(state.programOverrides[id]||{})};`,
'program editor whole-cache replacement');

fs.writeFileSync(g,gy,'utf8');fs.writeFileSync(m,main,'utf8');
console.log('UEP 0.81.72 R6 program write refactor applied');
