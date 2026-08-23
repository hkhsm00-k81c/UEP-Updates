const fs=require('fs');
const path=require('path');
const appRoot=process.argv[2]||'app';
const appDir=path.join(appRoot,'resources','app');
const jsFile=path.join(appDir,'gyomuon.js');
let s=fs.readFileSync(jsFile,'utf8');

if(!s.includes('const APP_VERSION = "0.81.30";')) throw new Error('0.81.30 runtime anchor missing');
s=s.replace('const APP_VERSION = "0.81.30";','const APP_VERSION = "0.81.31";');

// In 0.81.30 the student click was actually captured, but the detail was rendered
// after the full class roster, so it looked as if clicking did nothing. Put the
// selected-student detail immediately below the filters and keep the roster below.
const oldReturn='return controls+list+detail;';
const newReturn='return controls+detail+list;';
if(!s.includes(oldReturn)) throw new Error('unified student view return anchor missing');
s=s.replace(oldReturn,newReturn);

// Keep the row click binding explicit and mode-free. Replace any surviving legacy
// student bindings that still switch recordQueryMode before rendering.
s=s.replaceAll("recordStudentId=b.dataset.recordStudent;recordQueryMode='student';render('records');","recordStudentId=b.dataset.recordStudent;render('records');");
s=s.replaceAll("recordStudentId=button.dataset.recordStudent;recordQueryMode='student';render('records');","recordStudentId=button.dataset.recordStudent;render('records');");

// Make selected detail visually distinct at the top of the student list.
const cssFile=fs.existsSync(path.join(appDir,'gyomuon.css'))?path.join(appDir,'gyomuon.css'):path.join(appDir,'style.css');
let c=fs.readFileSync(cssFile,'utf8');
c+='\n/* UEP 0.81.31 selected-student detail visibility */\n.curriculum-selected-student{margin:18px 0 22px;scroll-margin-top:90px}.curriculum-unified-list{margin-top:16px}\n';

fs.writeFileSync(jsFile,s,'utf8');
fs.writeFileSync(cssFile,c,'utf8');
console.log('UEP 0.81.31 student detail visibility fix applied');
