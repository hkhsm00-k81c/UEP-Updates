const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const root=path.resolve(process.argv[2]||'.');
const base=path.join(__dirname,'patch-uep-08297-board-live-manage.js');
let src=fs.readFileSync(base,'utf8');
const marker='const rendererHelpers=`';
const start=src.indexOf(marker);
if(start<0)throw new Error('rendererHelpers marker missing');
const innerStart=start+marker.length;
const after="renderer=replaceOnce(renderer,'// __UEP_08296_BOARD_SCREEN_MIRROR_RENDERER__'";
const afterPos=src.indexOf(after,innerStart);
if(afterPos<0)throw new Error('rendererHelpers following statement missing');
const closePos=src.lastIndexOf('`;',afterPos);
if(closePos<innerStart)throw new Error('rendererHelpers closing delimiter missing');
const fixedInner=src.slice(innerStart,closePos).replace(/`/g,'\\`').replace(/\$\{/g,'\\${');
src=src.slice(0,innerStart)+fixedInner+src.slice(closePos);
const temp=path.join(__dirname,'.tmp-patch-uep-08297-fixed.js');
fs.writeFileSync(temp,src,'utf8');
try{
  const check=spawnSync(process.execPath,['--check',temp],{stdio:'inherit'});
  if(check.status!==0)process.exit(check.status||1);
  const run=spawnSync(process.execPath,[temp,root],{stdio:'inherit'});
  process.exitCode=run.status||0;
}finally{
  try{fs.unlinkSync(temp);}catch{}
}
