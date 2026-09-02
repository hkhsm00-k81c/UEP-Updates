const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const gp=path.join(root,'resources','app','gyomuon.js');
const mp=path.join(root,'resources','app','electron','main.cjs');
let g=fs.readFileSync(gp,'utf8');
let m=fs.readFileSync(mp,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

// Version lives in renderer. Preserve all School Read transport/session code in main.cjs.
must(/const\s+APP_VERSION\s*=\s*["']0\.82\.18["'];/.test(g),'0.82.18 renderer base not found');
g=g.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.18["'];/,'const APP_VERSION = "0.82.19";');

// v0.82.18 already reads 52/53/54/55/56 in electron/main.cjs. Add only 53A/53B to that exact entries array.
if(!m.includes('53A_전형세부유형DB')){
  const entryRe=/(\[\s*["']53_전형이해["']\s*,\s*["']'53_전형이해'!A1:N500["']\s*\],?)/;
  must(entryRe.test(m),'v0.82.18 main admissions entries anchor not found');
  m=m.replace(entryRe,`$1\n    ["53A_전형세부유형DB", "'53A_전형세부유형DB'!A1:R500"],\n    ["53B_전형유형별대학DB", "'53B_전형유형별대학DB'!A1:P3000"],`);
}

// Renderer: point university structures at the normalized 53B mapping DB.
const structureRe=/function\s+dashboardAdmissionStructureRows\(\)\s*\{\s*return\s+dashboardAdmissionRows\(\s*['"]admissionStructures['"]\s*,\s*['"]57_대학별전형구조DB['"]\s*,\s*['"]universityAdmissionStructures['"]\s*\);\s*\}/;
must(structureRe.test(g),'dashboardAdmissionStructureRows legacy anchor not found');
g=g.replace(structureRe,"function dashboardAdmissionStructureRows(){return dashboardAdmissionRows('admissionStructures','53B_전형유형별대학DB','universityAdmissionStructures');}");

// 53B canonical columns: 대전형 / 평가구조요약 / 상담표시문구.
const methodTextRe=/const\s+text=\[row\['선발방식'\],row\['핵심평가'\],row\['주요평가자료'\],row\['한줄요약'\]\]\.filter\(Boolean\)\.join\(' '\);/;
must(methodTextRe.test(g),'dashboardAdmissionMethod text anchor not found');
g=g.replace(methodTextRe,"const text=[row['선발방식'],row['평가구조요약'],row['핵심평가'],row['주요평가자료'],row['한줄요약'],row['상담표시문구']].filter(Boolean).join(' ');");
g=g.replace("if(row['선발방식'])return String(row['선발방식']);","if(row['선발방식'])return String(row['선발방식']);if(row['평가구조요약'])return String(row['평가구조요약']);");
g=g.replace(/String\(r\['전형유형'\]\|\|''\)\.includes\(group\.replace\('정시','수능'\)\)/g,"String(r['전형유형']||r['대전형']||'').includes(group.replace('정시','수능'))");
g=g.replace(/r\['전형유형'\]\|\|'전형'/g,"r['전형유형']||r['대전형']||'전형'");
g=g.replace(/r\['선발방식'\]\|\|dashboardAdmissionMethod\(r\)/g,"r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r)");

// 전형 이해: add 53A detail rows as fallback alongside 53 and 53B.
const typesRe=/const\s+types=dashboardAdmissionRows\('admissionTypes','53_전형이해'\)\.filter\(dashboardAdmissionEnabled\),structures=dashboardAdmissionStructureRows\(\);/;
must(typesRe.test(g),'admission types anchor not found');
g=g.replace(typesRe,"const types=dashboardAdmissionRows('admissionTypes','53_전형이해').filter(dashboardAdmissionEnabled),typeDetails=dashboardAdmissionRows('admissionTypeDetails','53A_전형세부유형DB').filter(dashboardAdmissionEnabled),structures=dashboardAdmissionStructureRows();");

// Replace the per-method row lookup with a 53A fallback, but only if exact native expression is present.
const rowLookup="const row=types.find(r=>String(r['전형유형']||'').includes(group.replace('정시','수능'))&&dashboardAdmissionMethod(r).replace(/\\s/g,'').includes(method.replace(/\\s|유\\/무/g,'')));";
if(g.includes(rowLookup)){
  g=g.replace(rowLookup,"const row=types.find(r=>String(r['전형유형']||'').includes(group.replace('정시','수능'))&&dashboardAdmissionMethod(r).replace(/\\s/g,'').includes(method.replace(/\\s|유\\/무/g,'')))||typeDetails.find(r=>String(r['대전형']||'').includes(group.replace('정시','수능'))&&dashboardAdmissionMethod(r).replace(/\\s/g,'').includes(method.replace(/\\s|유\\/무/g,'')));");
}
g=g.replace("row?.['한줄요약']||row?.['핵심평가']||'대학별 실제 전형명과 반영요소를 비교합니다.'","row?.['한줄요약']||row?.['대표평가구조']||row?.['핵심평가']||row?.['고1준비포인트']||'대학별 실제 전형명과 반영요소를 비교합니다.'");

// Regression marker. No School Read login/session function is touched.
if(!g.includes('const UEP_ADMISSIONS_LIVE_RANGES')){
  g += `\n/* UEP_08219_ADMISSIONS_LIVE */\nconst UEP_ADMISSIONS_LIVE_RANGES=Object.freeze({basics:'52_대입기초',types:'53_전형이해',typeDetail:'53A_전형세부유형DB',typeUniversity:'53B_전형유형별대학DB',csatMinimum:'54_수능최저DB',schoolResults:'55_대학입결DB',universityMaster:'56_대학입시마스터'});\n`;
}

must(m.includes("schoolReadPost('batch-read'"),'School Read batch-read transport missing after patch');
must(m.includes("[\"53A_전형세부유형DB\", \"'53A_전형세부유형DB'!A1:R500\"]"),'53A main range not inserted');
must(m.includes("[\"53B_전형유형별대학DB\", \"'53B_전형유형별대학DB'!A1:P3000\"]"),'53B main range not inserted');
must(g.includes("dashboardAdmissionRows('admissionStructures','53B_전형유형별대학DB'"),'53B renderer mapping missing');

fs.writeFileSync(gp,g,'utf8');
fs.writeFileSync(mp,m,'utf8');
console.log('patched',gp,'and',mp);
