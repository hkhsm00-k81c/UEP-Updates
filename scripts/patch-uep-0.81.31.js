const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const appDir=path.join(appRoot,'resources','app');
const jsFile=path.join(appDir,'gyomuon.js');
let s=fs.readFileSync(jsFile,'utf8');

// Normalize every runtime APP_VERSION declaration to 0.81.31. Previous builds can
// contain more than one declaration after historical patching, so replacing only
// the first 0.81.30 occurrence is not sufficient.
const anyVersionRegex=/const\s+APP_VERSION\s*=\s*['\"][^'\"]+['\"]\s*;/g;
const versionDecls=s.match(anyVersionRegex)||[];
if(versionDecls.length<1) throw new Error('APP_VERSION declaration missing');
s=s.replace(anyVersionRegex,'const APP_VERSION = "0.81.31";');

// Selected-student detail belongs immediately below the filters, not after the full roster.
const oldReturn='return controls+list+detail;';
const newReturn='return controls+detail+list;';
if(s.includes(oldReturn)) s=s.replace(oldReturn,newReturn);
if(!s.includes(newReturn)) throw new Error('unified student view return order missing');

// Student row clicks keep the unified list/detail view; no separate query mode.
s=s.replaceAll("recordStudentId=b.dataset.recordStudent;recordQueryMode='student';render('records');","recordStudentId=b.dataset.recordStudent;render('records');");
s=s.replaceAll("recordStudentId=button.dataset.recordStudent;recordQueryMode='student';render('records');","recordStudentId=button.dataset.recordStudent;render('records');");

// Repair subject-card click bindings exactly once.
const goodSubjectBinding="$$('[data-curriculum-subject]').forEach(b=>b.onclick=()=>{curriculumSubjectKey=b.dataset.curriculumSubject;uepOpenSubjectModal08128(curriculumSubjectKey);});";
const badSingleRegex=/(?<!\$)\$\('\[data-curriculum-subject\]'\)\.forEach\(b=>b\.onclick=\(\)=>\{curriculumSubjectKey=b\.dataset\.curriculumSubject;uepOpenSubjectModal08128\(curriculumSubjectKey\);\}\);/g;
const legacyRenderRegex=/\$\$\('\[data-curriculum-subject\]'\)\.forEach\(b=>b\.onclick=\(\)=>\{curriculumSubjectKey=b\.dataset\.curriculumSubject;render\('records'\);\}\);/g;
const badMatches=s.match(badSingleRegex)||[];
const legacyMatches=s.match(legacyRenderRegex)||[];
s=s.replace(badSingleRegex,goodSubjectBinding).replace(legacyRenderRegex,goodSubjectBinding);

if(!s.includes(goodSubjectBinding)) throw new Error('subject popup binding missing after repair');
if(/(?<!\$)\$\('\[data-curriculum-subject\]'\)\.forEach/.test(s)) throw new Error('single-element subject binding remains after repair');
if(legacyRenderRegex.test(s)) throw new Error('legacy subject render binding remains after repair');
if(!s.includes('function uepOpenSubjectModal08128(')) throw new Error('subject popup function missing');
if(!s.includes('<span>학사여부</span>')||!s.includes('<span>1학년 내신평균</span>')||!s.includes('<span>예상등수</span>')||!s.includes('<span>예상등급</span>')) throw new Error('subject popup columns missing');

const cssFile=fs.existsSync(path.join(appDir,'gyomuon.css'))?path.join(appDir,'gyomuon.css'):path.join(appDir,'style.css');
let c=fs.readFileSync(cssFile,'utf8');
c+='\n/* UEP 0.81.31 selected-student detail visibility + subject card interactivity */\n.curriculum-selected-student{margin:18px 0 22px;scroll-margin-top:90px}.curriculum-unified-list{margin-top:16px}.subject-card-grid [data-curriculum-subject]{cursor:pointer}\n';

fs.writeFileSync(jsFile,s,'utf8');
fs.writeFileSync(cssFile,c,'utf8');
const written=fs.readFileSync(jsFile,'utf8');
const versions=[...written.matchAll(/const\s+APP_VERSION\s*=\s*['\"]([^'\"]+)['\"]\s*;/g)].map(m=>m[1]);
if(!versions.length||versions.some(v=>v!=='0.81.31')) throw new Error('written runtime versions mismatch: '+versions.join(','));
console.log('UEP 0.81.31 patch applied; APP_VERSION declarations=',versions.length,'subject bindings repaired=',badMatches.length+legacyMatches.length);
