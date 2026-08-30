const fs = require('fs');
const path = require('path');

const root = process.argv[2];
if (!root) throw new Error('UEP root path required');
const appDir = path.join(root, 'resources', 'app');
const gyPath = path.join(appDir, 'gyomuon.js');
const mainPath = path.join(appDir, 'electron', 'main.cjs');
const pkgPath = path.join(appDir, 'package.json');

function read(p){ return fs.readFileSync(p, 'utf8'); }
function write(p,v){ fs.writeFileSync(p,v,'utf8'); }
function replaceRegexOnce(text, re, replacement, label){
  const matches = text.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')) || [];
  if(matches.length !== 1) throw new Error(`${label}: expected 1 match, got ${matches.length}`);
  return text.replace(re,replacement);
}

let gy = read(gyPath);
const shiftRe = /function\s+shiftDateKey\s*\(key,\s*delta\)\s*\{[\s\S]*?return\s+dateKey\(date\);\s*\}/;
const newShift = `function shiftDateKey(key, delta) {
  /* UEP_08197_ATTENDANCE_DATE_SHIFT */
  const match = String(key || "").match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
  if (!match) return dateKey(today);
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const date = new Date(year, month - 1, day + Number(delta || 0), 12, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return dateKey(today);
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}`;
gy = replaceRegexOnce(gy, shiftRe, newShift, 'attendance shiftDateKey');

if (/const APP_VERSION = "0\.81\.96";/.test(gy)) {
  gy = gy.replace('const APP_VERSION = "0.81.96";', 'const APP_VERSION = "0.81.97";');
} else if (!gy.includes('const APP_VERSION = "0.81.97";')) {
  throw new Error('APP_VERSION 0.81.96 marker not found');
}
write(gyPath, gy);

let main = read(mainPath);
const statePathRe = /const\s+statePath\s*=\s*\(\)\s*=>\s*path\.join\(stableUserDataRoot\(\),\s*"school-board-state\.json"\);/;
main = replaceRegexOnce(
  main,
  statePathRe,
  'const statePath = () => path.join(stableUserDataRoot(), "school-board-state.json");\n// UEP_08197_QUICK_LAUNCH_PERSISTENCE: executable paths live outside the replaceable app folder.\nconst quickLaunchPath = () => path.join(stableUserDataRoot(), "quick-launch-settings.json");',
  'quickLaunchPath insertion'
);

const readStateRe = /async\s+function\s+readState\s*\(\)\s*\{\s*try\s*\{\s*return\s+JSON\.parse\(await\s+fs\.readFile\(statePath\(\),\s*"utf8"\)\);\s*\}\s*catch\s*\{\s*return\s+null;\s*\}\s*\}/;
const newReadState = `async function readQuickLaunchSettings08197() {
  try {
    const value = JSON.parse(await fs.readFile(quickLaunchPath(), "utf8"));
    return { messengerPath: String(value?.messengerPath || ""), comtimePath: String(value?.comtimePath || "") };
  } catch { return { messengerPath: "", comtimePath: "" }; }
}
async function writeQuickLaunchSettings08197(value) {
  const links = value?.settings?.links || {};
  const payload = { messengerPath: String(links.messengerPath || ""), comtimePath: String(links.comtimePath || ""), savedAt: new Date().toISOString() };
  if (!payload.messengerPath && !payload.comtimePath) return;
  await fs.mkdir(path.dirname(quickLaunchPath()), { recursive: true });
  await fs.writeFile(quickLaunchPath(), JSON.stringify(payload, null, 2), "utf8");
}
async function readState() {
  let value = null;
  try { value = JSON.parse(await fs.readFile(statePath(), "utf8")); } catch {}
  const quick = await readQuickLaunchSettings08197();
  if (!value && (quick.messengerPath || quick.comtimePath)) value = {};
  if (value && (quick.messengerPath || quick.comtimePath)) {
    value.settings = value.settings && typeof value.settings === "object" ? value.settings : {};
    value.settings.links = value.settings.links && typeof value.settings.links === "object" ? value.settings.links : {};
    if (quick.messengerPath) value.settings.links.messengerPath = quick.messengerPath;
    if (quick.comtimePath) value.settings.links.comtimePath = quick.comtimePath;
  }
  return value;
}`;
main = replaceRegexOnce(main, readStateRe, newReadState, 'readState quick-launch merge');

const saveReturnRe = /return\s*\{\s*ok:\s*true,\s*savedAt:\s*new Date\(\)\.toISOString\(\)\s*\};\s*\}\s*function\s+writeState\(value\)\s*\{/;
main = replaceRegexOnce(
  main,
  saveReturnRe,
  'try { await writeQuickLaunchSettings08197(value); } catch (error) { console.warn("[UEP] quick launch backup failed", error?.message || error); }\n  return { ok: true, savedAt: new Date().toISOString() };\n}\nfunction writeState(value) {',
  'writeState quick-launch backup'
);

const migrationRe = /\["Local State","school-board-state\.json","google-service-account\.bin","google-service-account\.recovery\.json","google-user-oauth\.bin","google-user-oauth\.recovery\.json","neis-api-key\.bin","neis-dashboard-cache\.json","comcigan-timetable-cache\.json"\]/;
if(migrationRe.test(main)) {
  main = main.replace(migrationRe, '["Local State","school-board-state.json","quick-launch-settings.json","google-service-account.bin","google-service-account.recovery.json","google-user-oauth.bin","google-user-oauth.recovery.json","neis-api-key.bin","neis-dashboard-cache.json","comcigan-timetable-cache.json"]');
}
write(mainPath, main);

const pkg = JSON.parse(read(pkgPath));
if(pkg.version !== '0.81.96' && pkg.version !== '0.81.97') throw new Error(`unexpected package version ${pkg.version}`);
pkg.version = '0.81.97';
write(pkgPath, JSON.stringify(pkg,null,2) + '\n');

function shiftDateForTest(key, delta){
  const m = String(key||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return '';
  const d = new Date(Number(m[1]),Number(m[2])-1,Number(m[3])+Number(delta||0),12,0,0,0);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
if(shiftDateForTest('2026-09-03',1)!=='2026-09-04') throw new Error('date next test failed');
if(shiftDateForTest('2026-09-01',-1)!=='2026-08-31') throw new Error('date month-boundary previous test failed');
if(shiftDateForTest('2026-08-31',1)!=='2026-09-01') throw new Error('date month-boundary next test failed');

console.log('UEP 0.81.97 attendance + quick-launch persistence patch applied');
