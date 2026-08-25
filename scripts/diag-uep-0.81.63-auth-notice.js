const fs=require('fs');const path=require('path');
const root=process.argv[2]||'app';
const targets=[path.join(root,'resources','app','gyomuon.js'),path.join(root,'resources','app','electron','main.cjs'),path.join(root,'resources','app','electron','google-data.cjs')];
const needles=['비밀번호를 설정','비밀번호 설정','curriculum','data-curriculum-workspace','data-cross-student','data-curriculum-subject','notice:receiptSave','Google 서비스 계정 인증정보가 필요합니다','saveNoticeReceipt','google:authorizeUser','authorizeGoogleUser'];
let out=[];for(const file of targets){if(!fs.existsSync(file))continue;const text=fs.readFileSync(file,'utf8');for(const n of needles){let pos=0,c=0;while((pos=text.indexOf(n,pos))>=0&&c<12){const s=Math.max(0,pos-1800),e=Math.min(text.length,pos+3200);out.push(`\n=== ${file} :: ${n} @ ${pos} ===\n${text.slice(s,e)}`);pos+=n.length;c++;}}}
fs.writeFileSync('diag-08163-auth-notice.txt',out.join('\n---\n'),'utf8');console.log('written',out.length);