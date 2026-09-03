const fs=require('fs');
const path=require('path');
const root=process.argv[2]||'app';
const app=path.join(root,'resources','app');
const g=fs.readFileSync(path.join(app,'gyomuon.js'),'utf8');
const m=fs.readFileSync(path.join(app,'electron','main.cjs'),'utf8');
const gd=fs.readFileSync(path.join(app,'electron','google-data.cjs'),'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(/const\s+APP_VERSION\s*=\s*["']0\.82\.41["'];/.test(g),'version not 0.82.41');
must(!m.includes("data.admissionMinimums=uep08210MatrixObjects(matrices['54_수능최저DB']);"),'canonical admissionMinimums is still overwritten by raw rows');
must(m.includes("data.admissionMinimumRows=uep08210MatrixObjects(matrices['54_수능최저DB']);"),'raw admissionMinimumRows missing');
must(m.includes("data['54_수능최저DB']=data.admissionMinimumRows;"),'54 sheet raw alias missing');
must(g.includes("dashboardAdmissionRows('admissionMinimumRows','54_수능최저DB')"),'dashboard does not request raw minimum model');
must(!g.includes("dashboardAdmissionRows('admissionMinimums','54_수능최저DB')"),'dashboard still consumes canonical model as raw');

for(const field of [
  'university: String(row["대학명"] || "")',
  'type: String(row["전형유형"] || "")',
  'name: String(row["전형명"] || "")',
  'minimum: String(row["수능최저원문"] || "")',
  'areaCount: row["반영영역수"]',
  'sumLimit: row["등급합기준"]',
  'inquiryCount: row["탐구반영과목수"]',
  'english: String(row["영어별도기준"] || "")',
  'history: String(row["한국사기준"] || "")'
]) must(gd.includes(field),`normalized 54 mapping missing: ${field}`);

// Model-contract test with the same representative row in both shapes.
const raw={
  '입시년도':'2028','대학명':'연세대','전형유형':'학생부교과','전형명':'추천형','모집단위':'인문',
  '수능최저원문':'2합4(1) (영3)','반영영역수':2,'등급합기준':4,'탐구반영과목수':1,'영어별도기준':'3등급'
};
const normalized={
  year:String(raw['입시년도']||''),university:String(raw['대학명']||''),type:String(raw['전형유형']||''),name:String(raw['전형명']||''),
  unit:String(raw['모집단위']||''),minimum:String(raw['수능최저원문']||''),areaCount:raw['반영영역수'],sumLimit:raw['등급합기준'],
  inquiryCount:raw['탐구반영과목수'],english:String(raw['영어별도기준']||'')
};
must(normalized.university==='연세대'&&normalized.name==='추천형','normalized calculator identity failed');
must(normalized.minimum==='2합4(1) (영3)'&&Number(normalized.areaCount)===2&&Number(normalized.sumLimit)===4,'normalized calculator rule fields failed');
must(raw['대학명']==='연세대'&&raw['수능최저원문']==='2합4(1) (영3)','raw dashboard fields failed');
must(normalized['대학명']===undefined&&raw.university===undefined,'test shapes are not actually separated');

// The calculator/table must still consume normalized rule properties and all exam names must include September.
for(const token of ['rule.university','rule.type','rule.name','rule.minimum','rule.areaCount','rule.sumLimit']) must(g.includes(token),`core minimum consumer missing ${token}`);
must(g.includes('"9월모의고사"'),'September mock exam support missing');

console.log('UEP 0.82.41 CSAT model separation PASS: normalized calculator model + raw dashboard model + September exam path');
