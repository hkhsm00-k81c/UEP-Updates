const fs=require('fs');
const path=require('path');
const root=path.resolve(process.argv[2]||'.');
const main=fs.readFileSync(path.join(root,'electron','main.cjs'),'utf8');
const renderer=fs.readFileSync(path.join(root,'gyomuon.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
function must(c,m){if(!c)throw new Error(m);}

must(pkg.version==='0.82.86','package version mismatch');
must(renderer.includes('APP_VERSION="0.82.86"'),'runtime version mismatch');
must(!renderer.includes("const CURRENT='0.82.81';"),'stale hardcoded 0.82.81 version indicator remains');
must(renderer.includes('const CURRENT=String(APP_VERSION);'),'version indicator is not runtime-driven');
must(main.includes('const UEP_ADMISSIONS_SPREADSHEET_ID = "1BHSdaUbOhp9p_9RB0XGgrfOo4wS_Z8Up0ocSCAMYIIk";'),'new admissions spreadsheet id missing');
must(main.includes('UEP_ADMISSIONS_FALLBACK_SPREADSHEET_ID'),'admissions fallback missing');
must(main.includes("['59_모집단위DB',\"'59_모집단위DB'!A1:P2000\"]"),'59 range missing');
must(main.includes("['59A_전형별모집단위DB',\"'59A_전형별모집단위DB'!A1:R3000\"]"),'59A range missing');
must(main.includes("data.admissionMajors=uep08210MatrixObjects(matrices['59_모집단위DB'])"),'59 cache mapping missing');
must(main.includes("data.admissionMajorTracks=uep08210MatrixObjects(matrices['59A_전형별모집단위DB'])"),'59A cache mapping missing');
must(main.includes("const legacyChunk=chunk.filter(([logicalName])=>!/^59A?_/.test(logicalName));"),'safe legacy fallback split missing');
must(renderer.includes('/* UEP_08286_RELEASE_NOTES_CANONICAL */'),'current release popup missing');
must(renderer.includes("const VERSION='0.82.86',KEY='uep:release-notes:'+VERSION;\n  if(String(APP_VERSION)!==VERSION)return;"),'current release popup lacks version gate');

// Every historical KEY/STORAGE_KEY release-note declaration must now be immediately version-gated.
const badKey=[...renderer.matchAll(/(?:,\s*KEY|const\s+(?:KEY|STORAGE_KEY))='uep:release-notes:'\+VERSION;(?!\s*if\(String\(APP_VERSION\)!==VERSION\)return;)/g)];
must(badKey.length===0,'ungated historical release-note blocks remain: '+badKey.length);

// Release patch must not introduce prohibited after-render hacks.
const markerIndex=renderer.indexOf('/* UEP_08286_RELEASE_NOTES_CANONICAL */');
const added=renderer.slice(markerIndex);
must(!/MutationObserver/.test(added),'new MutationObserver patch detected');
must(!/addEventListener\(['\"]click['\"],\s*function\s*\(.*document/i.test(added),'new global click workaround detected');

console.log('UEP v0.82.86 admissions/version/popup regression tests passed');
