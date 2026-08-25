const fs=require('fs'), path=require('path');
const root=process.argv[2]||'app';
const dir=path.join(root,'resources','app');
const needles=['saveNoticeReceipt','공지확인현황','Google 시트','구글시트','연결되지','연결 안','sheet connection','saveNotice'];
let hits=[];
function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())walk(f);else if(/\.(js|cjs|mjs)$/i.test(e.name)){const t=fs.readFileSync(f,'utf8');for(const n of needles){let pos=0;while((pos=t.indexOf(n,pos))>=0){hits.push(`=== ${path.relative(root,f)} :: ${n} @ ${pos} ===\n`+t.slice(Math.max(0,pos-1800),Math.min(t.length,pos+4200)));pos+=n.length;}}}}}
walk(dir);
fs.writeFileSync('diag-08162-storage.txt',hits.join('\n\n---\n\n'),'utf8');
console.log('hits',hits.length);
