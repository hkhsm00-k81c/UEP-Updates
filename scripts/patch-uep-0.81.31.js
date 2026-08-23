const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const appDir=path.join(appRoot,'resources','app');
const jsFile=path.join(appDir,'gyomuon.js');
let s=fs.readFileSync(jsFile,'utf8');

// Normalize every runtime APP_VERSION declaration to 0.81.31.
const anyVersionRegex=/const\s+APP_VERSION\s*=\s*['\"][^'\"]+['\"]\s*;/g;
const versionDecls=s.match(anyVersionRegex)||[];
if(versionDecls.length<1) throw new Error('APP_VERSION declaration missing');
s=s.replace(anyVersionRegex,'const APP_VERSION = "0.81.31";');

// Selected-student detail belongs immediately below the filters, before the class roster.
// Match structurally so whitespace/minification differences do not break the patch.
const oldReturnRegex=/return\s+controls\s*\+\s*list\s*\+\s*detail\s*;/g;
const goodReturnRegex=/return\s+controls\s*\+\s*detail\s*\+\s*list\s*;/g;
if(oldReturnRegex.test(s)) s=s.replace(oldReturnRegex,'return controls+detail+list;');
if(goodReturnRegex.test(s)) s=s.replace(goodReturnRegex,'return controls+detail+list;');
if(!/return\s+controls\s*\+\s*detail\s*\+\s*list\s*;/.test(s)) throw new Error('unified student view return order missing');
if(/return\s+controls\s*\+\s*list\s*\+\s*detail\s*;/.test(s)) throw new Error('legacy unified student return order remains');

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
if(!/return\s+controls\s*\+\s*detail\s*\+\s*list\s*;/.test(written)) throw new Error('written selected-student detail order mismatch');
console.log('UEP 0.81.31 patch applied; APP_VERSION declarations=',versions.length,'subject bindings repaired=',badMatches.length+legacyMatches.length);