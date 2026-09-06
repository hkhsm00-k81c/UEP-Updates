const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const g=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const m=fs.readFileSync(path.join(root,'electron/main.cjs'),'utf8');
const must=(v,msg)=>{if(!v)throw new Error(msg)};

must(/APP_VERSION\s*=\s*["']0\.82\.62["']/.test(g),'version 0.82.62 missing');
must(!m.includes("'53B_전형유형별대학DB'!A1:S3000"),'old 53B A:S range remains');
must((m.split("'53B_전형유형별대학DB'!A1:T3000").length-1)>=2,'53B A:T range missing from both read paths');
must(m.includes('schoolReadBatchRead(UEP_ADMISSIONS_SPREADSHEET_ID'),'new admissions School Read primary lost');
must(m.includes('schoolReadBatchRead(UEP_ADMISSIONS_FALLBACK_SPREADSHEET_ID'),'admissions fallback lost');

must(g.includes("function uep08261OfficialMajor(row){return String(row?.['대전형']||'').trim();}"),'official D helper lost');
must(g.includes("if(d==='정시 수능'||d==='정시 실기'||d.startsWith('정시 '))return '정시';"),'regular admission mapping lost');
must(g.includes("uep08261RegionalDoctor(r)&&i.restricted&&!i.unavailable"),'regional doctor section rule lost');
must(g.includes("i.unavailable||(i.restricted&&!regionalDoctor.includes(r))"),'restricted-detail rule lost');

const idx=g.indexOf('const renderAdmissionCard=r=>');
must(idx>=0,'renderAdmissionCard missing');
const cardSlice=g.slice(idx,idx+1800);
must(cardSlice.includes("r['모집인원']"),'explicit recruitment count field not used');
must(cardSlice.includes('uep-admission-count-badge'),'recruitment count badge missing');
must(cardSlice.includes("!uep08258AdmissionMeta(r).unavailable"),'unavailable admissions must not show recruitment count badge');
must(!cardSlice.includes("r['비고']"),'recruitment count must not be parsed from note text');
must(!cardSlice.includes('<small><b>수능최저</b>'),'detailed CSAT minimum returned to admission card');
must(cardSlice.includes("<h4>'+escapeHtml(r['전형명']||'전형명 확인')+'</h4>"),'actual admission-name title lost');
must(g.includes('.uep-admission-count-badge{'),'recruitment count badge style missing');
must(g.includes('uep-admission-unavailable-card')&&g.includes('uep-admission-regional-doctor')&&g.includes('uep-admission-restricted-card'),'semantic state colors lost');
console.log('0.82.62 admission data/count regression test passed');
