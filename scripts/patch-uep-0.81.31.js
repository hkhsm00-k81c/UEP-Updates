const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const appDir=path.join(appRoot,'resources','app');
const jsFile=path.join(appDir,'gyomuon.js');
let s=fs.readFileSync(jsFile,'utf8');

if(!s.includes('const APP_VERSION = "0.81.30";')) throw new Error('0.81.30 runtime anchor missing');
s=s.replace('const APP_VERSION = "0.81.30";','const APP_VERSION = "0.81.31";');

// In 0.81.30 the student click was captured, but detail was rendered after the full
// class roster. Put selected-student detail directly below the filters.
const oldReturn='return controls+list+detail;';
const newReturn='return controls+detail+list;';
if(!s.includes(oldReturn)) throw new Error('unified student view return anchor missing');
s=s.replace(oldReturn,newReturn);

// Keep student row clicks mode-free so the list and detail coexist.
s=s.replaceAll("recordStudentId=b.dataset.recordStudent;recordQueryMode='student';render('records');","recordStudentId=b.dataset.recordStudent;render('records');");
s=s.replaceAll("recordStudentId=button.dataset.recordStudent;recordQueryMode='student';render('records');","recordStudentId=button.dataset.recordStudent;render('records');");

// 0.81.30 had a broken subject-card event binding in some render branches:
// querySelector ($) was used and then .forEach() was called. That throws before
// any subject card receives a click handler. Bind every card with querySelectorAll ($$).
const badSubjectBinding="$('[data-curriculum-subject]').forEach(b=>b.onclick=()=>{curriculumSubjectKey=b.dataset.curriculumSubject;uepOpenSubjectModal08128(curriculumSubjectKey);});";
const goodSubjectBinding="$$('[data-curriculum-subject]').forEach(b=>b.onclick=()=>{curriculumSubjectKey=b.dataset.curriculumSubject;uepOpenSubjectModal08128(curriculumSubjectKey);});";
let subjectBindFixes=0;
while(s.includes(badSubjectBinding)){s=s.replace(badSubjectBinding,goodSubjectBinding);subjectBindFixes++;}

// Also repair legacy branches that still rendered instead of opening the modal.
const legacySubjectBinding="$$('[data-curriculum-subject]').forEach(b=>b.onclick=()=>{curriculumSubjectKey=b.dataset.curriculumSubject;render('records');});";
while(s.includes(legacySubjectBinding)){s=s.replace(legacySubjectBinding,goodSubjectBinding);subjectBindFixes++;}
if(subjectBindFixes<1) throw new Error('subject card click binding anchor not found');

// Make selected detail visually distinct at the top of the student list.
const cssFile=fs.existsSync(path.join(appDir,'gyomuon.css'))?path.join(appDir,'gyomuon.css'):path.join(appDir,'style.css');
let c=fs.readFileSync(cssFile,'utf8');
c+='\n/* UEP 0.81.31 selected-student detail visibility + subject card interactivity */\n.curriculum-selected-student{margin:18px 0 22px;scroll-margin-top:90px}.curriculum-unified-list{margin-top:16px}.subject-card-grid [data-curriculum-subject]{cursor:pointer}\n';

fs.writeFileSync(jsFile,s,'utf8');
fs.writeFileSync(cssFile,c,'utf8');
console.log('UEP 0.81.31 student detail + subject popup binding fix applied; subject bindings=',subjectBindFixes);
