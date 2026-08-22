const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const appRoot=process.argv[2]||'app';
const outDir=process.argv[3]||'audit-output';
const file=path.join(appRoot,'resources/app/gyomuon.js');
const src=fs.readFileSync(file,'utf8');
const lines=src.split(/\r?\n/);
function lineOf(i){return src.slice(0,i).split(/\r?\n/).length}
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function refs(name){return (src.match(new RegExp('\\b'+esc(name)+'\\b','g'))||[]).length}
function hash(s){return crypto.createHash('sha256').update(s.replace(/\s+/g,' ')).digest('hex').slice(0,12)}
function extractFrom(start){let b=src.indexOf('{',start);if(b<0)return null;let depth=0,q=null,escp=false,lineComment=false,blockComment=false;for(let i=b;i<src.length;i++){let c=src[i],n=src[i+1];if(lineComment){if(c==='\n')lineComment=false;continue}if(blockComment){if(c==='*'&&n==='/'){blockComment=false;i++}continue}if(q){if(escp){escp=false;continue}if(c==='\\'){escp=true;continue}if(c===q){q=null;continue}continue}if(c==='/'&&n==='/'){lineComment=true;i++;continue}if(c==='/'&&n==='*'){blockComment=true;i++;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')depth++;else if(c==='}'){depth--;if(depth===0)return src.slice(start,i+1)}}return null}
const sites=[];
for(const re of [/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g,/(?:^|\n)\s*([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\s*\(/g]){let m;while((m=re.exec(src))){const body=extractFrom(m.index);if(body)sites.push({name:m[1],kind:re.source.includes('function\\s+')?'declaration':'assignment',line:lineOf(m.index),refs:refs(m[1]),hash:hash(body),chars:body.length});}}
const grouped=new Map();for(const s of sites){if(!grouped.has(s.name))grouped.set(s.name,[]);grouped.get(s.name).push(s)}
const duplicate=[];
for(const [name,a] of grouped){if(a.length<2)continue;const hashes=[...new Set(a.map(x=>x.hash))];const hasAssign=a.some(x=>x.kind==='assignment');let cls='MERGE_REVIEW';let note='same name has multiple live implementations';if(hashes.length===1&&!hasAssign){cls='SAFE_DELETE_DUPLICATE';note='identical duplicate declarations; retain one canonical declaration';}else if(!hasAssign){cls='SAFE_DELETE_SHADOWED_DECL';note='duplicate function declarations in same scope; last declaration wins, earlier declaration is shadowed; verify no scope boundary before deletion';}else{cls='FLATTEN_OVERRIDE_CHAIN';note='assignment/override chain must be flattened into one canonical implementation';}for(const s of a)duplicate.push({...s,class:cls,note});}
const wrappers=[];let wm;const wr=/const\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;\s*\2\s*=\s*function\s*\(/gs;while((wm=wr.exec(src)))wrappers.push({function:wm[2],capturedAs:wm[1],line:lineOf(wm.index),class:'FLATTEN_OVERRIDE_CHAIN'});
const dynamicHints=['window.','globalThis.','views','pages','route','data-page','onclick','addEventListener'];
const dead=[];for(const s of sites){if(s.kind!=='declaration'||s.refs!==1)continue;const name=s.name;const stringRef=new RegExp('["\\\']'+esc(name)+'["\\\']').test(src);const propRef=new RegExp('(?:window|globalThis)\\s*\\.\\s*'+esc(name)).test(src);dead.push({...s,class:(stringRef||propRef)?'KEEP_DYNAMIC_REVIEW':'SAFE_DELETE_CANDIDATE',note:(stringRef||propRef)?'name also appears as dynamic/string/property reference':'only declaration reference found in renderer; verify external IPC/HTML before deletion'});}
function contexts(pattern,label){const re=new RegExp(pattern,'g');const out=[];let m;while((m=re.exec(src))){const line=lineOf(m.index);out.push({type:label,line,context:lines.slice(Math.max(0,line-3),Math.min(lines.length,line+2)).join(' ').replace(/\s+/g,' ').slice(0,700)});}return out}
const perf=[...contexts('new\\s+MutationObserver\\s*\\(','MutationObserver'),...contexts('setInterval\\s*\\(','setInterval'),...contexts('requestAnimationFrame\\s*\\(','requestAnimationFrame')];
const counts={duplicateSites:duplicate.length,duplicateNames:[...new Set(duplicate.map(x=>x.name))].length,deadCandidates:dead.filter(x=>x.class==='SAFE_DELETE_CANDIDATE').length,dynamicReview:dead.filter(x=>x.class==='KEEP_DYNAMIC_REVIEW').length,wrapperChains:wrappers.length,perfSites:perf.length};
fs.mkdirSync(outDir,{recursive:true});
function csv(rows,cols){return [cols.join(','),...rows.map(r=>cols.map(c=>'"'+String(r[c]??'').replace(/"/g,'""')+'"').join(','))].join('\n')}
fs.writeFileSync(path.join(outDir,'third-pass-duplicates.csv'),csv(duplicate,['name','kind','line','refs','hash','chars','class','note']));
fs.writeFileSync(path.join(outDir,'third-pass-dead.csv'),csv(dead,['name','kind','line','refs','hash','chars','class','note']));
fs.writeFileSync(path.join(outDir,'third-pass-perf.csv'),csv(perf,['type','line','context']));
fs.writeFileSync(path.join(outDir,'third-pass-wrappers.csv'),csv(wrappers,['function','capturedAs','line','class']));
let md=['# UEP CODEBASE AUDIT — THIRD PASS CLASSIFICATION','',`- duplicate names: ${counts.duplicateNames} (${counts.duplicateSites} sites)`,`- SAFE_DELETE dead candidates: ${counts.deadCandidates}`,`- dynamic-reference review: ${counts.dynamicReview}`,`- wrapper chains: ${counts.wrapperChains}`,`- observer/interval/RAF sites: ${counts.perfSites}`,'','## Duplicate/override classification'];
for(const [name,a] of grouped){if(a.length<2)continue;const rows=duplicate.filter(x=>x.name===name);md.push(`- ${name}: ${rows[0].class} / ${rows.map(x=>x.kind+'@'+x.line+'#'+x.hash).join(' | ')}`)}
md.push('','## Wrapper chains');for(const x of wrappers)md.push(`- ${x.function} <- ${x.capturedAs} @ ${x.line}: FLATTEN_OVERRIDE_CHAIN`);
md.push('','## First SAFE_DELETE candidates');for(const x of dead.filter(x=>x.class==='SAFE_DELETE_CANDIDATE').slice(0,80))md.push(`- ${x.name} @ ${x.line} (${x.chars} chars)`);
md.push('','## Safety rule','- Do not delete from production yet.','- SAFE_DELETE_DUPLICATE: remove only earlier identical/shadowed copy after syntax + route regression checks.','- FLATTEN_OVERRIDE_CHAIN: rewrite into one canonical function, preserving behavior from all wrappers.','- SAFE_DELETE_CANDIDATE: require repo-wide search including HTML/preload/main before removal.','- PERF: inspect lifecycle and cleanup for each observer/timer before changing.');
fs.writeFileSync(path.join(outDir,'THIRD-PASS-CLASSIFICATION.md'),md.join('\n'));
console.log(JSON.stringify(counts));
