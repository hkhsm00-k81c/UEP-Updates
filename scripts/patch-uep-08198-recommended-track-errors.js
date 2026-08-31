const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
const pFile=path.join(root,'resources','app','package.json');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,msg)=>{if(!c)throw new Error(msg)};

A(g.includes('const APP_VERSION = "0.81.97";'),'0.81.97 APP_VERSION anchor missing');
A(g.includes('UEP_08194_SELECTION_ERROR_SOURCE_START'),'0.81.94 selection error source missing');
A(g.includes('function studentCareerSupportBase_('),'student dashboard career recommendation source missing');
A(g.includes('function uepSubjectGroup08128('),'selection subject grouping missing');
A(!g.includes('UEP_08198_RECOMMENDED_TRACK_ERRORS'),'0.81.98 patch already present');

g=g.replace('const APP_VERSION = "0.81.97";','const APP_VERSION = "0.81.98";');

const start='/* UEP_08194_SELECTION_ERROR_SOURCE_START */';
const end='/* UEP_08194_SELECTION_ERROR_SOURCE_END */';
const s=g.indexOf(start),e=g.indexOf(end,s);
A(s>=0&&e>s,'0.81.94 wrapper range missing');
let block=g.slice(s,e+end.length);

const oldWrapped=`  const wrapped=function(){\n    const data=base.apply(this,arguments);\n    if(!data||!Array.isArray(data.rows))return data;\n    const rows=Array.isArray(readonlyCache?.selectionErrorRows)?readonlyCache.selectionErrorRows:[];\n    if(rows.length){data.errors=mapRows(rows,data);data.__selectionErrorSource='51_선택과목오류_정규화';data.__selectionErrorRows=rows.length;}\n    else data.__selectionErrorSource='legacy-fallback';\n    return data;\n  };`;

const newWrapped=`  /* UEP_08198_RECOMMENDED_TRACK_ERRORS */\n  const recommendedTrack08198=student=>{\n    try{\n      const bundle=typeof studentRecordBundle==='function'?studentRecordBundle(student):undefined;\n      const info=typeof studentCareerSupportBase_==='function'?studentCareerSupportBase_(student,bundle):null;\n      return String(info?.recommendation||'').trim();\n    }catch{return '';}\n  };\n  const crossErrors08198=data=>{\n    const out=[];\n    for(const row of data?.rows||[]){\n      const student=row?.__student;if(!student)continue;\n      const recommended=recommendedTrack08198(student);\n      if(recommended!=='문과'&&recommended!=='이과')continue;\n      for(const term of ['2-1','2-2','3-1','3-2']){\n        const subjects=typeof uepSelectionTermSubjects==='function'?(uepSelectionTermSubjects(row,term)||[]):[];\n        for(const subject of subjects){\n          const group=typeof uepSubjectGroup08128==='function'?uepSubjectGroup08128(subject):'';\n          const mismatch=(recommended==='문과'&&group==='과학')||(recommended==='이과'&&group==='사회');\n          if(!mismatch)continue;\n          out.push({student,type:'문이과 교차오류',term,terms:[term],subject,subjects:[subject],detail:'추천 계열 '+recommended+' 학생의 '+group+' 계열 과목 선택을 확인하세요.',message:'추천 계열 '+recommended+' 학생의 '+group+' 계열 과목 선택을 확인하세요.',path:term,severity:'확인',recommendedTrack:recommended,__source:'UEP-08198-recommended-track'});\n        }\n      }\n    }\n    return out;\n  };\n  const mergeCross08198=(errors,cross)=>{\n    const out=[...(errors||[])],seen=new Set(out.map(x=>[String(x?.student?.id||x?.student?.studentNo||''),String(x?.type||''),String(x?.term||''),String(x?.subject||'')].join('|')));\n    for(const x of cross||[]){const k=[String(x?.student?.id||x?.student?.studentNo||''),String(x?.type||''),String(x?.term||''),String(x?.subject||'')].join('|');if(!seen.has(k)){seen.add(k);out.push(x);}}\n    return out;\n  };\n  const wrapped=function(){\n    const data=base.apply(this,arguments);\n    if(!data||!Array.isArray(data.rows))return data;\n    const rows=Array.isArray(readonlyCache?.selectionErrorRows)?readonlyCache.selectionErrorRows:[];\n    if(rows.length){data.errors=mapRows(rows,data);data.__selectionErrorSource='51_선택과목오류_정규화';data.__selectionErrorRows=rows.length;}\n    else data.__selectionErrorSource='legacy-fallback';\n    data.errors=mergeCross08198(data.errors,crossErrors08198(data));\n    data.__selectionRecommendedTrackErrors='0.81.98';\n    return data;\n  };`;
A(block.includes(oldWrapped),'0.81.94 wrapped body anchor missing');
block=block.replace(oldWrapped,newWrapped);
g=g.slice(0,s)+block+g.slice(e+end.length);
fs.writeFileSync(gFile,g,'utf8');

const pkg=JSON.parse(fs.readFileSync(pFile,'utf8'));
A(pkg.version==='0.81.97','unexpected package version '+pkg.version);
pkg.version='0.81.98';
fs.writeFileSync(pFile,JSON.stringify(pkg,null,2)+'\n','utf8');

// Static business-rule checks: dashboard recommendation is authoritative; selected subjects never infer track.
A(g.includes("const info=typeof studentCareerSupportBase_==='function'?studentCareerSupportBase_(student,bundle):null"),'dashboard recommendation not wired');
A(g.includes("recommended==='문과'&&group==='과학'"),'문과->과학 cross rule missing');
A(g.includes("recommended==='이과'&&group==='사회'"),'이과->사회 cross rule missing');
A(g.includes("recommended!=='문과'&&recommended!=='이과'"),'neutral handling for 예체능/혼합 missing');
A(g.includes("data.errors=mergeCross08198(data.errors,crossErrors08198(data))"),'cross error merge missing');
console.log('UEP 0.81.98 recommended-track cross-error patch applied');
