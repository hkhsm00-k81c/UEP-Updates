const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const g=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const must=(v,m)=>{if(!v)throw new Error(m)};
must(/APP_VERSION\s*=\s*["']0\.82\.54["']/.test(g),'version 0.82.54 missing');
must(g.includes("uep-admission-counsel-editor-layer';layer.style.position='fixed';layer.style.inset='0';layer.style.zIndex='2147483000'"),'counsel modal top-layer fix missing');
must(g.includes('data-uep-counsel-edit'),'counsel edit trigger missing');
must(g.includes('saveAdmissionCounselPoint'),'counsel save bridge missing');
console.log('0.82.54 counsel modal layer test passed');
