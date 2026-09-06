const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app/resources/app';
const must=(v,m)=>{if(!v)throw new Error(m)};
const g=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const gd=fs.readFileSync(path.join(root,'electron/google-data.cjs'),'utf8');
const m=fs.readFileSync(path.join(root,'electron/main.cjs'),'utf8');
must(/APP_VERSION\s*=\s*["']0\.82\.59["']/.test(g),'version 0.82.59 missing');
for(const [name,s] of [['google-data',gd],['main',m]]){
  must(s.includes('const UEP_ADMISSIONS_SPREADSHEET_ID = "1BHSdaUbOhp9p_9RB0XGgrfOo4wS_Z8Up0ocSCAMYIIk";'),`${name}: new admissions spreadsheet id missing`);
  must(s.includes("'53B_전형유형별대학DB'!A1:S3000"),`${name}: 53B A:S range missing`);
  must(s.includes('admissionSheetNames = new Set'),`${name}: admission source split missing`);
  must(s.includes('spreadsheetId:UEP_ADMISSIONS_SPREADSHEET_ID'),`${name}: admissions source group missing`);
  must(s.includes('readSheetBatch(token, spreadsheetId, chunk.map('),`${name}: grouped batch source missing`);
}
must(g.includes('수시(교과·종합)'),'early tab label missing');
must(g.includes('수시(논술·기타)'),'other early tab label missing');
must(g.includes('>정시</label>'),'regular tab label missing');
must(g.includes("importance(r)==='주요'"),'featured important restricted rule missing');
must(g.includes('지역의사제·주요 자격전형'),'featured admissions section missing');
must(g.includes('다른 전형 자세히 보기'),'per-tab detail disclosure missing');
must(g.includes("i.unavailable||(i.restricted&&!featured.includes(r))"),'restricted/unavailable detail rule missing');
must(g.includes("const CURRENT='0.82.59';"),'version pill missing');
must(g.includes("const host=document.querySelector('.dashboard-admission-layer')||document.body;host.appendChild(layer);"),'counsel child-layer regression');
console.log('0.82.59 admission DB separation/tabs regression test passed');
