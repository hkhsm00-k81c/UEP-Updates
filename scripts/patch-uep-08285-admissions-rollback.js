const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const rendererPath=path.join(root,'gyomuon.js');
const packagePath=path.join(root,'package.json');
function read(p){return fs.readFileSync(p,'utf8');}
function write(p,s){fs.writeFileSync(p,s,'utf8');}
function must(c,m){if(!c)throw new Error(m);}
let renderer=read(rendererPath);
const oldVersion='const APP_VERSION="0.82.83"; /* UEP_08283_RUNTIME_VERSION */';
const newVersion='const APP_VERSION="0.82.85"; /* UEP_08285_ADMISSIONS_ROLLBACK */';
must(renderer.includes(oldVersion),'0.82.83 runtime marker not found');
renderer=renderer.replace(oldVersion,newVersion);
write(rendererPath,renderer);
const pkg=JSON.parse(read(packagePath));
must(pkg.version==='0.82.83',`baseline package version mismatch: ${pkg.version}`);
pkg.version='0.82.85';
write(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log('UEP v0.82.85 rollback package prepared from known-good v0.82.83 baseline');
