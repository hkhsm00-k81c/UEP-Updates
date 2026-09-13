const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const rendererPath=path.join(root,'gyomuon.js');
const mainPath=path.join(root,'electron','main.cjs');
const packagePath=path.join(root,'package.json');
function read(p){return fs.readFileSync(p,'utf8');} function write(p,s){fs.writeFileSync(p,s,'utf8');} function must(c,m){if(!c)throw new Error(m);}
function replaceOnce(text,from,to,label){const i=text.indexOf(from);must(i>=0,label+' source pattern not found');must(text.indexOf(from,i+from.length)<0,label+' source pattern not unique');return text.slice(0,i)+to+text.slice(i+from.length);}
let renderer=read(rendererPath),main=read(mainPath);const pkg=JSON.parse(read(packagePath));must(pkg.version==='0.82.97','baseline version mismatch: '+pkg.version);pkg.version='0.82.98';
renderer=replaceOnce(renderer,'const APP_VERSION="0.82.97"; /* UEP_08297_BOARD_LIVE_MANAGE */','const APP_VERSION="0.82.98"; /* UEP_08298_BOARD_MANAGE_VISIBILITY */','runtime version');
const helper=`\n// __UEP_08298_BOARD_MANAGE_VISIBILITY__\nfunction boardCanManageLive08298(item={}){\n  if(boardAdminUiAllowed())return true;\n  const u=boardStatusUser08294?.()||{};\n  const selected=window.UEP_08295_SELECTED_BOARD||{};\n  const ug=String(u.grade||'').replace(/\\D/g,''),uc=String(u.homeroom||'').replace(/\\D/g,'');\n  const bg=String(selected['학년']||selected.grade||'').replace(/\\D/g,''),bc=String(selected['반']||selected.classNo||'').replace(/\\D/g,'');\n  if(ug&&uc&&bg===ug&&bc===uc)return true;\n  const me=String(boardCurrentAuthor08293?.()||'').trim(),author=String(item.author||item['작성자']||'').trim();\n  return Boolean(me&&author&&me===author);\n}\n`;
renderer=replaceOnce(renderer,'// __UEP_08297_BOARD_LIVE_MANAGE_RENDERER__','// __UEP_08297_BOARD_LIVE_MANAGE_RENDERER__'+helper,'renderer helper');
// 0.82.97 live preview created delete buttons only for item.own. Use the complete UI eligibility helper.
renderer=renderer.replace(/item\.own\s*\?/g,'boardCanManageLive08298(item) ?');
renderer=renderer.replace(/n\.own\s*\?/g,'boardCanManageLive08298(n) ?');
renderer=renderer.replace(/s\.own\s*\?/g,'boardCanManageLive08298(s) ?');
main+='\n// __UEP_08298_BOARD_MANAGE_VISIBILITY__: boardManagedDelete08297 remains the authoritative admin/owner/homeroom authorization.\n';
write(rendererPath,renderer);write(mainPath,main);write(packagePath,JSON.stringify(pkg,null,2)+'\n');console.log('UEP 0.82.98 Board management visibility patch applied');
