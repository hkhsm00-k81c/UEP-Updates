const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const root=path.resolve(process.argv[2]||'.');
const base=path.join(__dirname,'patch-uep-08295-board-card-operation-connect.js');
const run=spawnSync(process.execPath,[base,root],{stdio:'inherit'});
if(run.status!==0)process.exit(run.status||1);
const p=path.join(root,'gyomuon.js');
let s=fs.readFileSync(p,'utf8');
for(const tool of ['notice','schedule','timetable','exam']){
  s=s.replaceAll(`onclick="selectElectronicBoardTool('${tool}')"`,`onclick="selectElectronicBoardTool(&quot;${tool}&quot;)"`);
}
fs.writeFileSync(p,s,'utf8');
console.log('UEP 0.82.95 Board operation quoting correction applied');
