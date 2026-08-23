const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const appDir=path.join(appRoot,'resources','app');
const jsFile=path.join(appDir,'gyomuon.js');
let s=fs.readFileSync(jsFile,'utf8');

if(!s.includes('const APP_VERSION = "0.81.30";')) throw new Error('0.81.30 runtime anchor missing');
s=s.replace('const APP_VERSION = "0.81.30";','const APP_VERSION = "0.81.31";');

// Selected-student detail belongs immediately below the filters, not after the full roster.
const oldReturn='return controls+list+detail;';
const newReturn='return controls+detail+list;';
if(!s.includes(oldReturn)) throw new Error('unified student view return anchor missing');
s=s.replace(oldReturn,newReturn);

// Student row clicks keep the unified list/detail view; no separate query mode.
s=s.replaceAll("recordStudentId=b.dataset.recordStudent;recordQueryMode='student';render('records');","recordStudentId=b.dataset.recordStudent;render('records');");
s=s.replaceAll("recordStudentId=button.dataset.recordStudent;recordQueryMode='student';render('records');","recordStudentId=button.dataset.recordStudent;render('records');");

// Repair subject-card click bindings exactly once.
// IMPORTANT: do not use while(s.includes(badBinding)) here. The good '$$(' form contains
// the bad '$(' text starting at its second '$', which caused the previous infinite loop.
const goodSubjectBinding="$$('[data-curriculum-subject]').forEach(b=>b.onclick=()=>{curriculumSubjectKey=b.dataset.curriculumSubject;uepOpenSubjectModal08128(curriculumSubjectKey);});";
const badSingleRegex=/(?<!\$)\$\('\[data-curriculum-subject\]'\)\.forEach\(b=>b\.onclick=\(\)=>\{curriculumSubjectKey=b\.dataset\.curriculumSubject;uepOpenSubjectModal08128\(curriculumSubjectKey\);\}\);/g;
const legacyRenderRegex=/\$\$\('\[data-curriculum-subject\]'\)\.forEach\(b=>b\.onclick=\(\)=>\{curriculumSubjectKey=b\.dataset\.curriculumSubject;render\('records'\);\}\);/g;
const badMatches=s.match(badSingleRegex)||[];
const legacyMatches=s.match(legacyRenderRegex)||[];
s=s.replace(badSingleRegex,goodSubjectBinding).replace(legacyRenderRegex,goodSubjectBinding);
const subjectBindFixes=badMatches.length+legacyMatches.length;

// Validate the resulting runtime rather than relying on a potentially self-matching replacement loop.
if(!s.includes(goodSubjectBinding)) throw new Error('subject popup binding missing after repair');
if(badSingleRegex.test(s)) throw new Error('single-element subject binding remains after repair');
if(legacyRenderRegex.test(s)) throw new Error('legacy subject render binding remains after repair');
if(!s.includes('function uepOpenSubjectModal08128(')) throw new Error('subject popup function missing');
if(!s.includes('<span>학사여부</span>')||!s.includes('<span>1학년 내신평균</span>')||!s.includes('<span>예상등수</span>')||!s.includes('<span>예상등급</span>')) throw new Error('subject popup columns missing');

const cssFile=fs.existsSync(path.join(appDir,'gyomuon.css'))?path.join(appDir,'gyomuon.css'):path.join(appDir,'style.css');
let c=fs.readFileSync(cssFile,'utf8');
c+='\n/* UEP 0.81.31 selected-student detail visibility + subject card interactivity */\n.curriculum-selected-student{margin:18px 0 22px;scroll-margin-top:90px}.curriculum-unified-list{margin-top:16px}.subject-card-grid [data-curriculum-subject]{cursor:pointer}\n';

fs.writeFileSync(jsFile,s,'utf8');
fs.writeFileSync(cssFile,c,'utf8');
console.log('UEP 0.81.31 patch applied; subject bindings repaired=',subjectBindFixes);
