const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(process.argv[2]||'.');
const g=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const m=fs.readFileSync(path.join(root,'electron','main.cjs'),'utf8');
const p=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
function must(c,msg){if(!c)throw new Error(msg);}
must(p.version==='0.82.92','package version');
must(g.includes('const APP_VERSION="0.82.92"; /* UEP_08292_BOARD_TARGET_ACADEMIC_STAGE */'),'runtime version marker');
must(m.includes('__UEP_08292_BOARD_TARGET_FIX__'),'Board target fix marker');
must(g.includes('__UEP_08292_ACADEMIC_ROUTE_GUARD__'),'academic route guard marker');
must(g.includes('function uep08292AcademicRowsReady()'),'academic readiness helper');
must(g.includes("rows.some(row=>String(row?.scoreType||'')==='내신')"),'internal-score readiness');
must(g.includes("await uep08250RefreshStage('academic')"),'academic stage refresh');
must(g.includes("['students','studentsAll','grades']"),'academic routes guarded');
must(g.includes('uep08292KickAcademicStage();return true;'),'remembered restore academic kick');
must(m.includes("replace(/\\u00a0/g,' ')"),'NBSP normalization');
must(m.includes("compact.match(/^([123])학년(\\d{1,2})반$/)"),'class target parsing');
must(m.includes("compact.match(/^([123])학년전체$/)"),'grade target parsing');
must(m.includes("boardAppend08291(ctx.token,'09_일정'"),'schedule write preserved');
must(m.includes("boardAppend08291(ctx.token,'05A_임시시간표변경'"),'05A write preserved');
must(m.includes("boardAppend08291(ctx.token,'22_시험운영'"),'exam write preserved');
must(g.includes('boardDbWrite'),'Board renderer write preserved');
// Source mappings must remain exact; current real sheets use these headers.
const gd=fs.readFileSync(path.join(root,'electron','google-data.cjs'),'utf8');
must(gd.includes('rowsFrom("50_내신DB")'),'50 internal grade source');
must(gd.includes('exam: String(row["고사구분"] || "").trim()'),'internal exam header mapping');
must(gd.includes('subject: String(row["과목명"] || "").trim()'),'internal subject header mapping');
must(gd.includes('const dormRows = rowsFrom("20_학사생마스터")'),'dorm source');
must(gd.includes('String(row["현재여부"] || "").trim() === "Y"'),'dorm current flag');
must(gd.includes('String(row["학사상태"] || "").trim() === "재사"'),'dorm current status');
// Target parser behavior: execute isolated equivalent source copied from main function.
function normalizeTarget(raw,user={grade:'1',homeroom:'6'}){
  const normalize=v=>String(v??'').replace(/\u00a0/g,' ').replace(/[·ㆍ]/g,' ').replace(/\s+/g,' ').trim();
  const digit=v=>normalize(v).match(/\d{1,2}/)?.[0]||'';
  const target=normalize(raw)||'내 반';
  if(target==='내 반')return {grade:digit(user.grade),classNo:digit(user.homeroom),scope:'class'};
  if(target==='전교')return {grade:'전체',classNo:'전체',scope:'school'};
  const compact=target.replace(/\s+/g,'');
  const ga=compact.match(/^([123])학년전체$/);if(ga)return {grade:ga[1],classNo:'전체',scope:'grade'};
  const cl=compact.match(/^([123])학년(\d{1,2})반$/);if(cl)return {grade:cl[1],classNo:String(Number(cl[2])),scope:'class'};
  const sh=compact.match(/^([123])[-_.](\d{1,2})$/);if(sh)return {grade:sh[1],classNo:String(Number(sh[2])),scope:'class'};
  return null;
}
for(const input of ['1학년 6반','1학년\u00a06반','1학년   6반','1학년·6반','1-6']){const r=normalizeTarget(input);must(r&&r.grade==='1'&&r.classNo==='6',`target parse ${JSON.stringify(input)}`);}
must(normalizeTarget('1학년 전체').scope==='grade','grade all parse');
must(normalizeTarget('전교').scope==='school','school parse');
console.log('UEP 0.82.92 Board target + academic stage regression PASS');
