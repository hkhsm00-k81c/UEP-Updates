const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const rendererPath=path.join(root,'gyomuon.js');
const mainPath=path.join(root,'electron','main.cjs');
const packagePath=path.join(root,'package.json');
function read(p){return fs.readFileSync(p,'utf8');}
function write(p,s){fs.writeFileSync(p,s,'utf8');}
function must(c,m){if(!c)throw new Error(m);}
function replaceOnce(text,from,to,label){const i=text.indexOf(from);must(i>=0,label+' source pattern not found');must(text.indexOf(from,i+from.length)<0,label+' source pattern not unique');return text.slice(0,i)+to+text.slice(i+from.length);}
let renderer=read(rendererPath),main=read(mainPath);const pkg=JSON.parse(read(packagePath));
must(pkg.version==='0.82.97','baseline package version mismatch: '+pkg.version);pkg.version='0.82.98';
renderer=replaceOnce(renderer,'const APP_VERSION="0.82.97"; /* UEP_08297_BOARD_LIVE_MANAGE */','const APP_VERSION="0.82.98"; /* UEP_08298_BOARD_MANAGE_VISIBILITY */','runtime version');
// Expose the server-authorized management capability on each live notice/schedule item.
// The backend remains authoritative: admin OR owner OR matching homeroom teacher.
const itemNeedle="author:String(o['작성자']||''),own:boardOwn08297(ctx,o)}";
const itemReplacement="author:String(o['작성자']||''),own:boardOwn08297(ctx,o),canManage:Boolean(ctx.isAdmin||boardOwn08297(ctx,o)||boardHomeroomTarget08297(ctx,o,sheet))}";
if(main.includes(itemNeedle)) main=main.split(itemNeedle).join(itemReplacement);
const schedNeedle="author:String(o['작성자']||''),own:boardOwn08297(ctx,o)}";
if(main.includes(schedNeedle)) main=main.split(schedNeedle).join("author:String(o['작성자']||''),own:boardOwn08297(ctx,o),canManage:Boolean(ctx.isAdmin||boardOwn08297(ctx,o)||boardHomeroomTarget08297(ctx,o,'09_일정'))}");
// Renderer: live Board preview must use canManage, not only own-author state.
renderer=renderer.replace(/item\.own\s*\?\s*([^:;]+)\s*:\s*(['\"]{2})/g,'item.canManage ? $1 : $2');
renderer=renderer.replace(/n\.own\s*\?/g,'n.canManage ?').replace(/s\.own\s*\?/g,'s.canManage ?');
// If preview rows were rendered without an owner condition, add a small explicit action only where canManage is true.
renderer=renderer.replace(/\$\{item\.own\?`<button([^`]+)boardLiveDelete08297([^`]+)<\/button>`:''\}/g,"${item.canManage?`<button$1boardLiveDelete08297$2</button>`:''}");
renderer=renderer.replace(/\$\{n\.own\?`<button([^`]+)boardLiveDelete08297([^`]+)<\/button>`:''\}/g,"${n.canManage?`<button$1boardLiveDelete08297$2</button>`:''}");
renderer=renderer.replace(/\$\{s\.own\?`<button([^`]+)boardLiveDelete08297([^`]+)<\/button>`:''\}/g,"${s.canManage?`<button$1boardLiveDelete08297$2</button>`:''}");
renderer+='\n// __UEP_08298_BOARD_MANAGE_VISIBILITY__: live preview action visibility follows server canManage (admin/owner/homeroom).\n';
main+='\n// __UEP_08298_BOARD_MANAGE_VISIBILITY__: backend canManage mirrors delete authorization.\n';
write(rendererPath,renderer);write(mainPath,main);write(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP 0.82.98 Board management visibility patch applied');
