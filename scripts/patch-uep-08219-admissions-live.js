const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const p=path.join(root,'resources','app','gyomuon.js');
let s=fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
must(/const\s+APP_VERSION\s*=\s*["']0\.82\.18["'];/.test(s),'0.82.18 base not found');
s=s.replace(/const\s+APP_VERSION\s*=\s*["']0\.82\.18["'];/,'const APP_VERSION = "0.82.19";');

// UEP_08219_ADMISSIONS_LIVE
// v0.82.18 already reads 52/53/54/55/56. Add only 53A/53B to the same fetchLiveData entries array.
if(!s.includes('53A_전형세부유형DB')){
  const re=/(\[\s*["']53_전형이해["']\s*,\s*["']'53_전형이해'!A1:N500["']\s*\],?)/;
  must(re.test(s),'v0.82.18 admissions entries anchor not found');
  s=s.replace(re,`$1\n    ["53A_전형세부유형DB", "'53A_전형세부유형DB'!A1:R500"],\n    ["53B_전형유형별대학DB", "'53B_전형유형별대학DB'!A1:P3000"],`);
}

// Point the comparison hub at 53B instead of the retired 57 mapping.
const structureRe=/function\s+dashboardAdmissionStructureRows\(\)\s*\{\s*return\s+dashboardAdmissionRows\(\s*['"]admissionStructures['"]\s*,\s*['"]57_대학별전형구조DB['"]\s*,\s*['"]universityAdmissionStructures['"]\s*\);\s*\}/;
must(structureRe.test(s),'dashboardAdmissionStructureRows anchor not found');
s=s.replace(structureRe,"function dashboardAdmissionStructureRows(){return dashboardAdmissionRows('admissionStructures','53B_전형유형별대학DB','universityAdmissionStructures');}");

// 53B canonical columns: 대전형 / 평가구조요약 / 상담표시문구.
s=s.replace(/const\s+text=\[row\['선발방식'\],row\['핵심평가'\],row\['주요평가자료'\],row\['한줄요약'\]\]\.filter\(Boolean\)\.join\(' '\);/,
  "const text=[row['선발방식'],row['평가구조요약'],row['핵심평가'],row['주요평가자료'],row['한줄요약'],row['상담표시문구']].filter(Boolean).join(' ');");
s=s.replace("if(row['선발방식'])return String(row['선발방식']);",
  "if(row['선발방식'])return String(row['선발방식']);if(row['평가구조요약'])return String(row['평가구조요약']);");
s=s.replace(/String\(r\['전형유형'\]\|\|''\)\.includes\(group\.replace\('정시','수능'\)\)/g,
  "String(r['전형유형']||r['대전형']||'').includes(group.replace('정시','수능'))");
s=s.replace(/r\['전형유형'\]\|\|'전형'/g,"r['전형유형']||r['대전형']||'전형'");
s=s.replace(/r\['선발방식'\]\|\|dashboardAdmissionMethod\(r\)/g,"r['선발방식']||r['평가구조요약']||dashboardAdmissionMethod(r)");

// 전형 이해 hub: 53A detailed type rows as fallback.
const typesRe=/const\s+types=dashboardAdmissionRows\('admissionTypes','53_전형이해'\)\.filter\(dashboardAdmissionEnabled\),structures=dashboardAdmissionStructureRows\(\);/;
must(typesRe.test(s),'admission types anchor not found');
s=s.replace(typesRe,
  "const types=dashboardAdmissionRows('admissionTypes','53_전형이해').filter(dashboardAdmissionEnabled),typeDetails=dashboardAdmissionRows('admissionTypeDetails','53A_전형세부유형DB').filter(dashboardAdmissionEnabled),structures=dashboardAdmissionStructureRows();");
s=s.replace(/const row=types\.find\(r=>String\(r\['전형유형'\]\|\|''\)\.includes\(group\.replace\('정시','수능'\)\)&&dashboardAdmissionMethod\(r\)\.replace\(\/\\s\/g,''\)\.includes\(method\.replace\(\/\\s\|유\\\/무\/g,''\)\)\);/,
  "const row=types.find(r=>String(r['전형유형']||'').includes(group.replace('정시','수능'))&&dashboardAdmissionMethod(r).replace(/\\s/g,'').includes(method.replace(/\\s|유\\/무/g,'')))||typeDetails.find(r=>String(r['대전형']||'').includes(group.replace('정시','수능'))&&dashboardAdmissionMethod(r).replace(/\\s/g,'').includes(method.replace(/\\s|유\\/무/g,'')));");
s=s.replace("row?.['한줄요약']||row?.['핵심평가']||'대학별 실제 전형명과 반영요소를 비교합니다.'",
  "row?.['한줄요약']||row?.['대표평가구조']||row?.['핵심평가']||row?.['고1준비포인트']||'대학별 실제 전형명과 반영요소를 비교합니다.'");

if(!s.includes('const UEP_ADMISSIONS_LIVE_RANGES')){
  s += `\n/* UEP_08219_ADMISSIONS_LIVE */\nconst UEP_ADMISSIONS_LIVE_RANGES=Object.freeze({basics:'52_대입기초',types:'53_전형이해',typeDetail:'53A_전형세부유형DB',typeUniversity:'53B_전형유형별대학DB',csatMinimum:'54_수능최저DB',schoolResults:'55_대학입결DB',universityMaster:'56_대학입시마스터'});\n`;
}
fs.writeFileSync(p,s,'utf8');
console.log('patched',p);
