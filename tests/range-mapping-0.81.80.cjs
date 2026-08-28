"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");

const appRoot=path.resolve(process.argv[2]||path.join(__dirname,"../candidate-0.81.80/resources/app"));
const source=fs.readFileSync(path.join(appRoot,"electron/main.cjs"),"utf8");
const start=source.indexOf("function sheetNameFromA1Range");
const end=source.indexOf("async function updateSheetValues",start);
assert.ok(start>=0&&end>start,"range mapping helpers not found");
const context={};
vm.runInNewContext(`${source.slice(start,end)};this.map=assignValueRangesByRange;`,context);

const entries=[
  ["common","'09_공통활동마스터'!A1:Z"],
  ["after","'11_방과후학교'!A1:Z"],
  ["sessions","'12_차시일정'!A1:Z"],
];
const result=context.map({},entries,[
  {range:"'12_차시일정'!A1:H3",values:[["session"]]},
  {range:"'09_공통활동마스터'!A1:F3",values:[["common"]]},
]);
assert.equal(result.sessions[0][0],"session");
assert.equal(result.common[0][0],"common");
assert.deepEqual(Array.from(result.after),[]);

const unknown=context.map({},entries,[{range:"'99_알수없음'!A1:B2",values:[["must-not-leak"]]}]);
assert.deepEqual(Array.from(unknown.common),[]);
assert.deepEqual(Array.from(unknown.after),[]);
assert.deepEqual(Array.from(unknown.sessions),[]);

console.log("range mapping regression passed");
