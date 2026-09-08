const fs=require('fs'),path=require('path');
const root=process.argv[2];
if(!root)throw new Error('app root required');
const g=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const m=fs.readFileSync(path.join(root,'electron','main.cjs'),'utf8');
function must(src,text,label){if(!src.includes(text))throw new Error('missing '+label)}
function mustNot(src,text,label){if(src.includes(text))throw new Error('unexpected '+label)}
must(g,'UEP_08282_CONTACT_WRITE_SCOPE','renderer contact scope marker');
must(g,'role==="grade_head"||isOwnHomeroom','grade head + own homeroom contact write');
must(m,'["admin","grade_head","homeroom"].includes(role)','main contact write scope');
must(m,"new Set(['admin','grade_head','homeroom']); /* UEP_08282_DUTY_WRITE_SCOPE */",'duty write scopes');
const dutyScopeCount=(m.match(/UEP_08282_DUTY_WRITE_SCOPE/g)||[]).length;if(dutyScopeCount!==2)throw new Error('expected 2 duty write scope markers, got '+dutyScopeCount);
mustNot(m,"['admin','grade_head','grade_manager','homeroom','subject']",'old broad lunch scope');
mustNot(m,"['admin','grade_head','grade_manager','homeroom','subject','담임','담임교사']",'old broad night scope');
must(g,'UEP_08282_DUTY_WRITE_UI','duty write UI marker');
must(g,'canWriteDuty?`<button type="button" class="duty-cal-entry lunch','lunch write UI gating');
must(g,'canWriteDuty?`<button type="button" class="duty-cal-entry night','night write UI gating');
must(g,'window.schoolBoard.saveNightSupervisor','night renderer bridge');
must(g,'window.schoolBoard.saveLunchDuty','lunch renderer bridge');
must(m,"'43_야자감독계획'",'night sheet source');
must(m,"'42_급식지도계획'",'lunch sheet source');
must(m,"'04_학생연락식별정보'",'contact sheet source');
console.log('UEP 0.82.82 bidirectional role/write regression passed');
