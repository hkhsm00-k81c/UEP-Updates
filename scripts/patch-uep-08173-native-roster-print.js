const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const gFile=path.join(root,'resources','app','gyomuon.js');
let g=fs.readFileSync(gFile,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};

A(g.includes('function uepOpenSubjectModal08128(key)'),'native subject roster renderer missing');
A(g.includes('>반·번호순</button>'),'native class sort button missing');

const helperMarker='function uepPrintSubjectRoster08173(selected)';
if(!g.includes(helperMarker)){
  const anchor='function uepOpenSubjectModal08128(key)';
  const p=g.indexOf(anchor);
  A(p>=0,'native roster function anchor missing');
  const helper=String.raw`function uepPrintSubjectRoster08173(selected){
  if(!selected||!Array.isArray(selected.students))return;
  const rows=[...selected.students].sort((a,b)=>String(a?.student?.studentNo||'').localeCompare(String(b?.student?.studentNo||''),'ko',{numeric:true}));
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const body=rows.map((x,i)=>{const s=x?.student||{},no=String(s.studentNo||''),grade=no.slice(0,1)||'',cls=String(recordStudentClass(s)||''),num=no.length>=2?String(Number(no.slice(-2))||no.slice(-2)):'';return '<tr><td>'+(i+1)+'</td><td>'+esc(grade)+'</td><td>'+esc(cls)+'</td><td>'+esc(num)+'</td><td>'+esc(no)+'</td><td>'+esc(s.name||'')+'</td></tr>';}).join('');
  const title=esc(selected.term||'')+' '+esc(selected.subject||'')+' 신청학생 명단';
  const stamp=new Date().toLocaleString('ko-KR');
  const w=window.open('','_blank','width=900,height=1100');
  if(!w){if(typeof toast==='function')toast('인쇄창을 열지 못했습니다.');return;}
  w.document.open();
  w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>'+title+'</title><style>body{font-family:Arial,"Noto Sans KR",sans-serif;margin:28px;color:#111}h1{font-size:22px;margin:0 0 6px}p{margin:0 0 18px;color:#555;font-size:12px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #bbb;padding:7px 8px;text-align:center}th{background:#f3f4f6}td:last-child{text-align:left}@media print{body{margin:12mm}button{display:none}}</style></head><body><h1>'+title+'</h1><p>신청 '+rows.length+'명 · 출력 기준 '+esc(stamp)+'</p><table><thead><tr><th>순번</th><th>학년</th><th>반</th><th>번호</th><th>학번</th><th>성명</th></tr></thead><tbody>'+body+'</tbody></table></body></html>');
  w.document.close();w.focus();setTimeout(()=>w.print(),120);
}
`;
  g=g.slice(0,p)+helper+g.slice(p);
}

const nativeButton='<button type="button" data-native-roster-print="1">신청명단 출력</button>';
if(!g.includes('data-native-roster-print="1"')){
  const target=/([<]button data-roster-sort="class"[^>]*>반·번호순<\/button>)(<\/div><\/header>)/;
  A(target.test(g),'native roster sort markup target missing');
  g=g.replace(target,'$1'+nativeButton+'$2');
}

if(!g.includes("layer.querySelector('[data-native-roster-print]')")){
  const target="layer.querySelectorAll('[data-roster-sort]').forEach(b=>b.onclick=()=>{curriculumRosterSort=b.dataset.rosterSort;layer.remove();uepOpenSubjectModal08128(key);});";
  A(g.includes(target),'native roster event anchor missing');
  const replacement=target+"layer.querySelector('[data-native-roster-print]')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();uepPrintSubjectRoster08173(selected);});";
  g=g.replace(target,replacement);
}

fs.writeFileSync(gFile,g,'utf8');
const out=fs.readFileSync(gFile,'utf8');
for(const m of ['function uepPrintSubjectRoster08173(selected)','data-native-roster-print="1"','신청명단 출력',"uepPrintSubjectRoster08173(selected)"])A(out.includes(m),'native roster print marker missing: '+m);
console.log('UEP 0.81.73 native curriculum roster print applied');
