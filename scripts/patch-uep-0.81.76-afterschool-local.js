const fs=require('fs');
const path='work/resources/app/gyomuon.js';
let s=fs.readFileSync(path,'utf8');
const marker='/* UEP_08176_AFTER_SCHOOL_LOCAL_FIX */';
if(s.includes(marker)) throw new Error('0.81.76 patch already present');
if(s.includes('UEP_08175_PROGRAM_DATETIME_FIX')) throw new Error('0.81.75 global datetime patch must not exist in baseline');
if(!(s.includes('programWithOverride') || s.includes('afterSchoolPrograms'))) throw new Error('after-school program path missing');

const patch=String.raw`

/* UEP_08176_AFTER_SCHOOL_LOCAL_FIX */
(function(){
  const DAY_MS=86400000;
  function ymdPlusOne_(v){
    const m=String(v??'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m) return v;
    const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3])+DAY_MS);
    return d.toISOString().slice(0,10);
  }
  function isSummerAfterSchool_(p){
    const id=String(p?.id||p?.programId||p?.programID||'').toUpperCase();
    const title=String(p?.title||p?.name||p?.programName||'');
    const term=String(p?.term||p?.semester||p?.season||'');
    return id.includes('SUM') || /여름|하계/.test(title+' '+term);
  }
  function fractionTime_(v){
    if(typeof v==='number' && Number.isFinite(v) && v>=0 && v<1){
      let mins=Math.round(v*1440); mins=((mins%1440)+1440)%1440;
      return String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');
    }
    const str=String(v??'').trim();
    if(/^0?\.\d+$/.test(str)) return fractionTime_(Number(str));
    const m=str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if(m) return String(+m[1]).padStart(2,'0')+':'+m[2];
    return v;
  }
  function explicitNightOff_(p){
    const vals=[p?.nightLinked,p?.nightLink,p?.nightStudyLinked,p?.affectsAttendance,p?.야자연계여부,p?.['야자연계여부']];
    return vals.some(v=>/^(n|no|false|0|미연계|해당없음)$/i.test(String(v??'').trim()));
  }
  function normalizeProgram_(src){
    if(!src || typeof src!=='object') return src;
    const p={...src};
    const summer=isSummerAfterSchool_(p);
    if(summer){
      for(const k of ['date','startDate','endDate','operationDate']){
        if(/^\d{4}-\d{2}-\d{2}$/.test(String(p[k]||''))) p[k]=ymdPlusOne_(p[k]);
      }
    }
    if(explicitNightOff_(p)) p.affectsAttendance=false;
    const arrKey=Array.isArray(p.sessions)?'sessions':Array.isArray(p.schedule)?'schedule':null;
    if(arrKey){
      p[arrKey]=p[arrKey].map(x=>{
        if(!x||typeof x!=='object') return x;
        const y={...x};
        if(summer){
          for(const k of ['date','sessionDate','operationDate']){
            if(/^\d{4}-\d{2}-\d{2}$/.test(String(y[k]||''))) y[k]=ymdPlusOne_(y[k]);
          }
        }
        for(const k of ['startTime','endTime','start','end']){
          if(y[k]!=null) y[k]=fractionTime_(y[k]);
        }
        return y;
      });
    }
    return p;
  }
  if(typeof programWithOverride==='function'){
    const base=programWithOverride;
    programWithOverride=function(...args){ return normalizeProgram_(base.apply(this,args)); };
  }
  if(typeof afterSchoolPrograms==='function'){
    const base=afterSchoolPrograms;
    afterSchoolPrograms=function(...args){
      const out=base.apply(this,args);
      return Array.isArray(out)?out.map(normalizeProgram_):out;
    };
  }
  window.__uepNormalizeAfterSchoolProgram08176=normalizeProgram_;
})();
`;

s += patch;

s=s.replace(/const UPDATE_NOTICE_VERSION = "0\.81\.74";/,'const UPDATE_NOTICE_VERSION = "0.81.76";');
s=s.replace(/const UPDATE_NOTICE_TITLE = "[^"]*";/,'const UPDATE_NOTICE_TITLE = "방과후 일정 표시 정상화";');
s=s.replace(/const UPDATE_NOTICE_ITEMS = \[[\s\S]*?\];/m,`const UPDATE_NOTICE_ITEMS = [\n  "여름방학 방과후 차시 날짜와 시간을 원본 일정대로 표시합니다.",\n  "학생정보 참여 프로그램 이력의 방과후 운영기간 표시를 정상화했습니다.",\n  "야자연계가 아닌 방과후 프로그램은 오후자습·야자 시간표에서 제외합니다.",\n  "학사외출 등 기존 공통 날짜 처리는 변경하지 않았습니다."\n];`);

if(!s.includes(marker)) throw new Error('patch marker was not inserted');
if(!s.includes('__uepNormalizeAfterSchoolProgram08176')) throw new Error('normalizer was not inserted');
if(!s.includes('0.81.76')) throw new Error('update notice version was not updated');
fs.writeFileSync(path,s,'utf8');
console.log('patched 0.81.76 localized after-school fix');
