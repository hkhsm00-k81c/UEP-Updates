const fs=require('fs'),path=require('path');const r=process.argv[2],g=fs.readFileSync(path.join(r,'gyomuon.js'),'utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(g.includes('APP_VERSION="0.82.51"'),'version');
ok(g.includes('UEP_08251_CAMPUS_AWARE_NAV'),'marker');
ok(g.includes("s==='메디컬'&&/가천대학교/.test(n))return '인천'"),'gachon medical region');
ok(g.includes("s==='글로벌'&&/한국외국어대학교|가천대학교/.test(n))return '경기'"),'global campus region');
ok(g.includes('uep08251UniversityDisplayNameForRegion(u,active)'),'region label in nav');
ok(g.includes('uep08251UniversityDisplayNameForRegion(university,window.__uepAdmissionRegion)'),'region label in title');
ok(g.includes('UEP_08250_STAGED_DATA_LOADING'),'staged loading regression');
ok(g.includes('admissionMinimumRows'),'raw minimum regression');
ok(!g.includes("raw.includes('·')?raw.split('·')"),'track split regression');
console.log('08251 campus-aware navigation tests passed');
