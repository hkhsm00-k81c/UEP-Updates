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
function replaceOnce(text, oldText, newText, label){
  const count = text.split(oldText).length - 1;
  if(count !== 1) throw new Error(`${label}: expected 1 match, got ${count}`);
  return text.replace(oldText,newText);
}

let gy = read(gyPath);
const oldShift = `function shiftDateKey(key, delta) {\n  const date = new Date(\`${'${key}'}T12:00:00\`);\n  if (Number.isNaN(date.getTime())) return dateKey(today);\n  date.setDate(date.getDate() + delta);\n  return dateKey(date);\n}`;
const newShift = `function shiftDateKey(key, delta) {\n  /* UEP_08197_ATTENDANCE_DATE_SHIFT */\n  const match = String(key || \"\").match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);\n  if (!match) return dateKey(today);\n  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);\n  const date = new Date(year, month - 1, day + Number(delta || 0), 12, 0, 0, 0);\n  if (Number.isNaN(date.getTime())) return dateKey(today);\n  return \`${'${date.getFullYear()}'}-${'${String(date.getMonth() + 1).padStart(2, "0")}' }-${'${String(date.getDate()).padStart(2, "0")}' }\`;\n}`;
gy = replaceOnce(gy, oldShift, newShift, 'attendance shiftDateKey');

if (/const APP_VERSION = "0\.81\.96";/.test(gy)) {
  gy = gy.replace('const APP_VERSION = "0.81.96";', 'const APP_VERSION = "0.81.97";');
} else if (!gy.includes('const APP_VERSION = "0.81.97";')) {
  throw new Error('APP_VERSION 0.81.96 marker not found');
}
write(gyPath, gy);

let main = read(mainPath);
main = replaceOnce(
  main,
  'const statePath = () => path.join(stableUserDataRoot(), "school-board-state.json");',
  'const statePath = () => path.join(stableUserDataRoot(), "school-board-state.json");\n// UEP_08197_QUICK_LAUNCH_PERSISTENCE: executable paths live outside the replaceable app folder.\nconst quickLaunchPath = () => path.join(stableUserDataRoot(), "quick-launch-settings.json");',
  'quickLaunchPath insertion'
);

const oldReadState = `async function readState() {\n  try { return JSON.parse(await fs.readFile(statePath(), \"utf8\")); }\n  catch { return null; }\n}`;
const newReadState = `async function readQuickLaunchSettings08197() {\n  try {\n    const value = JSON.parse(await fs.readFile(quickLaunchPath(), \"utf8\"));\n    return { messengerPath: String(value?.messengerPath || \"\"), comtimePath: String(value?.comtimePath || \"\") };\n  } catch { return { messengerPath: \"\", comtimePath: \"\" }; }\n}\nasync function writeQuickLaunchSettings08197(value) {\n  const links = value?.settings?.links || {};\n  const payload = { messengerPath: String(links.messengerPath || \"\"), comtimePath: String(links.comtimePath || \"\"), savedAt: new Date().toISOString() };\n  if (!payload.messengerPath && !payload.comtimePath) return;\n  await fs.mkdir(path.dirname(quickLaunchPath()), { recursive: true });\n  await fs.writeFile(quickLaunchPath(), JSON.stringify(payload, null, 2), \"utf8\");\n}\nasync function readState() {\n  let value = null;\n  try { value = JSON.parse(await fs.readFile(statePath(), \"utf8\")); } catch {}\n  const quick = await readQuickLaunchSettings08197();\n  if (!value && (quick.messengerPath || quick.comtimePath)) value = {};\n  if (value && (quick.messengerPath || quick.comtimePath)) {\n    value.settings = value.settings && typeof value.settings === \"object\" ? value.settings : {};\n    value.settings.links = value.settings.links && typeof value.settings.links === \"object\" ? value.settings.links : {};\n    if (quick.messengerPath) value.settings.links.messengerPath = quick.messengerPath;\n    if (quick.comtimePath) value.settings.links.comtimePath = quick.comtimePath;\n  }\n  return value;\n}`;
main = replaceOnce(main, oldReadState, newReadState, 'readState quick-launch merge');

main = replaceOnce(
  main,
  '  return { ok: true, savedAt: new Date().toISOString() };\n}\nfunction writeState(value) {',
  '  try { await writeQuickLaunchSettings08197(value); } catch (error) { console.warn("[UEP] quick launch backup failed", error?.message || error); }\n  return { ok: true, savedAt: new Date().toISOString() };\n}\nfunction writeState(value) {',
  'writeState quick-launch backup'
);

const migrateOld = '["Local State","school-board-state.json","google-service-account.bin","google-service-account.recovery.json","google-user-oauth.bin","google-user-oauth.recovery.json","neis-api-key.bin","neis-dashboard-cache.json","comcigan-timetable-cache.json"]';
const migrateNew = '["Local State","school-board-state.json","quick-launch-settings.json","google-service-account.bin","google-service-account.recovery.json","google-user-oauth.bin","google-user-oauth.recovery.json","neis-api-key.bin","neis-dashboard-cache.json","comcigan-timetable-cache.json"]';
if(main.includes(migrateOld)) main = main.replace(migrateOld,migrateNew);
write(mainPath, main);

const pkg = JSON.parse(read(pkgPath));
if(pkg.version !== '0.81.96' && pkg.version !== '0.81.97') throw new Error(`unexpected package version ${pkg.version}`);
pkg.version = '0.81.97';
write(pkgPath, JSON.stringify(pkg,null,2) + '\n');

function shiftDateForTest(key, delta){
  const m = String(key||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return '';
  const d = new Date(Number(m[1]),Number(m[2])-1,Number(m[3])+Number(delta||0),12,0,0,0);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
if(shiftDateForTest('2026-09-03',1)!=='2026-09-04') throw new Error('date next test failed');
if(shiftDateForTest('2026-09-01',-1)!=='2026-08-31') throw new Error('date month-boundary previous test failed');
if(shiftDateForTest('2026-08-31',1)!=='2026-09-01') throw new Error('date month-boundary next test failed');

console.log('UEP 0.81.97 attendance + quick-launch persistence patch applied');
