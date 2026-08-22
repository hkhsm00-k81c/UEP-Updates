$ErrorActionPreference='Stop'
param([string]$AppRoot='app',[string]$OutDir='audit-output')
New-Item -ItemType Directory -Force $OutDir | Out-Null

function ReadText($path){ if(Test-Path $path){ return Get-Content $path -Raw -Encoding UTF8 }; return '' }
function CountRx($text,$pattern){ return ([regex]::Matches($text,$pattern,[Text.RegularExpressions.RegexOptions]::Multiline)).Count }
function AddFinding($list,$area,$kind,$name,$count,$risk,$note){ $list.Add([pscustomobject]@{area=$area;kind=$kind;name=$name;count=$count;risk=$risk;note=$note}) | Out-Null }

$repoFiles=Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch '\\.git\\|\\node_modules\\|\\audit-output\\|\\app\\' }
$sourceFiles=$repoFiles | Where-Object { $_.Extension -in '.js','.cjs','.mjs','.css','.html','.ps1','.yml','.yaml','.json','.jsfrag' }

$gyo=ReadText (Join-Path $AppRoot 'resources/app/gyomuon.js')
$main=ReadText (Join-Path $AppRoot 'resources/app/electron/main.cjs')
$data=ReadText (Join-Path $AppRoot 'resources/app/electron/google-data.cjs')
$preload=ReadText (Join-Path $AppRoot 'resources/app/electron/preload.cjs')
$css=ReadText (Join-Path $AppRoot 'resources/app/gyomuon.css')
$index=ReadText (Join-Path $AppRoot 'resources/app/index.html')
$allRuntime=@($gyo,$main,$data,$preload,$css,$index) -join "`n"

# Syntax checks for every runtime JS/CJS file.
$syntax=@()
foreach($p in @((Join-Path $AppRoot 'resources/app/gyomuon.js'),(Join-Path $AppRoot 'resources/app/electron/main.cjs'),(Join-Path $AppRoot 'resources/app/electron/google-data.cjs'),(Join-Path $AppRoot 'resources/app/electron/preload.cjs'))){
  if(Test-Path $p){ node --check $p 2>&1 | Out-String | ForEach-Object { $syntax += [pscustomobject]@{file=$p;ok=($LASTEXITCODE -eq 0);output=$_.Trim()} }; if($LASTEXITCODE-ne 0){$global:LASTEXITCODE=0} }
}

$findings=New-Object System.Collections.Generic.List[object]

# Function declarations and later assignments/overrides.
$decl=[regex]::Matches($gyo,'(?m)^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(') | ForEach-Object {$_.Groups[1].Value}
$declGroups=$decl | Group-Object | Sort-Object Count -Descending
foreach($g in $declGroups){ if($g.Count -gt 1){AddFinding $findings 'renderer' 'duplicate-function-declaration' $g.Name $g.Count 'HIGH' '같은 함수명이 여러 번 선언됨'} }
$assign=[regex]::Matches($gyo,'(?m)^\s*([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\s*\(') | ForEach-Object {$_.Groups[1].Value}
foreach($g in ($assign|Group-Object|Sort-Object Count -Descending)){ if($g.Count -gt 1 -or $decl -contains $g.Name){AddFinding $findings 'renderer' 'function-override' $g.Name $g.Count 'HIGH' '기존 함수 뒤에서 재대입/override 가능'} }

# Wrapper chains: const old=fn; fn=function...
$wrappers=[regex]::Matches($gyo,'(?ms)const\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;\s*\2\s*=\s*function\s*\(')
foreach($m in $wrappers){AddFinding $findings 'renderer' 'wrapper-chain' $m.Groups[2].Value 1 'HIGH' ('captured as '+$m.Groups[1].Value)}

# Global listeners, observers, timers and rerenders.
$metrics=[ordered]@{
 addEventListener=CountRx $gyo 'addEventListener\s*\('
 onclickAssignments=CountRx $gyo '\.onclick\s*='
 mutationObserver=CountRx $gyo 'new\s+MutationObserver\s*\('
 requestAnimationFrame=CountRx $gyo 'requestAnimationFrame\s*\('
 queueMicrotask=CountRx $gyo 'queueMicrotask\s*\('
 setTimeout=CountRx $gyo 'setTimeout\s*\('
 setInterval=CountRx $gyo 'setInterval\s*\('
 renderCalls=CountRx $gyo '\brender\s*\('
 documentQueryAll=CountRx $gyo 'document\.querySelectorAll\s*\('
 fullSectionScans=CountRx $gyo 'querySelectorAll\s*\(\s*["'']section["'']\s*\)'
}
foreach($k in $metrics.Keys){ if($metrics[$k]-gt 0){ $risk=if($k -in 'mutationObserver','fullSectionScans','setInterval'){'HIGH'}elseif($k -in 'renderCalls','addEventListener','requestAnimationFrame','setTimeout'){'MEDIUM'}else{'INFO'}; AddFinding $findings 'renderer' 'runtime-metric' $k $metrics[$k] $risk '전체 실행코드 발생 횟수'} }

# Render targets and repeated full-page rerenders.
$renderTargets=[regex]::Matches($gyo,'render\s*\(\s*["'']([^"'']+)["'']\s*\)') | ForEach-Object {$_.Groups[1].Value} | Group-Object | Sort-Object Count -Descending
foreach($g in $renderTargets){ if($g.Count -ge 3){AddFinding $findings 'renderer' 'frequent-full-render' $g.Name $g.Count 'MEDIUM' '동일 페이지 전체 render 반복 호출'} }

# Legacy/stale route and sheet strings.
$legacy=@('selectionView','sdgsView','06A_학생별선택과목','06A 학생별 선택과목','selection: selectionView','sdgs: sdgsView')
foreach($x in $legacy){$c=([regex]::Matches($allRuntime,[regex]::Escape($x))).Count;if($c){AddFinding $findings 'runtime' 'legacy-reference' $x $c 'HIGH' '폐기/통합된 과거 구조 참조 가능'}}

# Source patch markers and whether they survive in runtime.
$markers=@()
foreach($f in ($sourceFiles|Where-Object {$_.DirectoryName -match 'patches'})){
  $t=ReadText $f.FullName
  foreach($m in [regex]::Matches($t,'__[A-Z0-9_]{6,}__')){ $markers += [pscustomobject]@{marker=$m.Value;source=$f.FullName.Substring((Get-Location).Path.Length+1);present=$allRuntime.Contains($m.Value)} }
}

# Build-script mutation inventory: replacements, regex replacements, patch append operations.
$mutations=@()
foreach($f in ($sourceFiles|Where-Object {$_.Name -like 'build-update-*.ps1'})){
 $t=ReadText $f.FullName
 $mutations += [pscustomobject]@{file=$f.Name;replace=CountRx $t '\.Replace\s*\(';regexReplace=CountRx $t '\[regex\]::Replace\s*\(';appendPatch=CountRx $t 'Get-Content\s+["'']?\.?/?patches/|Get-Content\s+["'']?\.\\patches\\';substringSplice=CountRx $t '\.Substring\s*\(';containsGuards=CountRx $t '\.Contains\s*\('}
}

# Duplicate CSS selectors (rough but useful).
$selectors=[regex]::Matches($css,'(?m)(^|\})\s*([^@}{][^{}]*)\{')|ForEach-Object {$_.Groups[2].Value.Trim()}|Where-Object {$_ -and $_.Length -lt 200}
$selectorGroups=$selectors|Group-Object|Sort-Object Count -Descending
foreach($g in $selectorGroups){if($g.Count-gt 1){AddFinding $findings 'css' 'duplicate-selector' $g.Name $g.Count 'MEDIUM' '동일 selector가 여러 위치에 정의됨'}}

# Workflow/diagnostic accumulation inventory.
$workflowFiles=$repoFiles|Where-Object {$_.FullName -match '\\.github\\workflows\\'}
$inspectFlows=$workflowFiles|Where-Object {$_.Name -match '^inspect-|audit-|probe-|diagnostic'}
AddFinding $findings 'repository' 'workflow-count' 'all-workflows' $workflowFiles.Count 'INFO' '저장소 workflow 총수'
AddFinding $findings 'repository' 'diagnostic-workflow-count' 'inspect/audit/probe' $inspectFlows.Count 'MEDIUM' '실사용 배포와 무관한 점검 workflow 누적'

# Feature signatures from all build scripts: capture verification labels as historical intent inventory.
$historical=@()
foreach($f in ($sourceFiles|Where-Object {$_.Name -like 'build-update-*.ps1'})){
 $t=ReadText $f.FullName
 foreach($m in [regex]::Matches($t,"(?m)^\s*['\"]([^'\"]{3,80})['\"]\s*=\s*")){ $historical += [pscustomobject]@{build=$f.Name;check=$m.Groups[1].Value} }
}

# Route/nav inventory.
$navPages=[regex]::Matches($index,'data-page=["'']([^"'']+)["'']')|ForEach-Object {$_.Groups[1].Value}|Sort-Object -Unique
$viewMap=[regex]::Matches($gyo,'(?m)^\s*([A-Za-z0-9_-]+)\s*:\s*([A-Za-z_$][\w$]*)\s*,?\s*$')|ForEach-Object{[pscustomobject]@{page=$_.Groups[1].Value;view=$_.Groups[2].Value}}

$findings|Export-Csv (Join-Path $OutDir 'findings.csv') -NoTypeInformation -Encoding UTF8
$markers|Sort-Object marker,source|Export-Csv (Join-Path $OutDir 'patch-markers.csv') -NoTypeInformation -Encoding UTF8
$mutations|Export-Csv (Join-Path $OutDir 'build-mutations.csv') -NoTypeInformation -Encoding UTF8
$historical|Export-Csv (Join-Path $OutDir 'historical-checks.csv') -NoTypeInformation -Encoding UTF8
$syntax|Export-Csv (Join-Path $OutDir 'syntax.csv') -NoTypeInformation -Encoding UTF8
$viewMap|Export-Csv (Join-Path $OutDir 'route-map.csv') -NoTypeInformation -Encoding UTF8
$navPages|Set-Content (Join-Path $OutDir 'nav-pages.txt') -Encoding UTF8

$high=($findings|Where-Object risk -eq 'HIGH').Count;$med=($findings|Where-Object risk -eq 'MEDIUM').Count
$missingMarkers=($markers|Where-Object {-not $_.present}).Count
$report=@()
$report += '# UEP FULL CODEBASE AUDIT'
$report += ''
$report += '이 보고서는 특정 버전 통과검사가 아니라 저장소 전체 패치 이력 + 최종 실행코드를 대상으로 한 정적 전수검사입니다.'
$report += ''
$report += "- 저장소 분석 파일: $($sourceFiles.Count)"
$report += "- Build scripts: $($mutations.Count)"
$report += "- Patch markers: $($markers.Count) / 최종 runtime 미존재: $missingMarkers"
$report += "- HIGH findings: $high"
$report += "- MEDIUM findings: $med"
$report += "- Workflows: $($workflowFiles.Count) / inspect-audit-probe: $($inspectFlows.Count)"
$report += ''
$report += '## Runtime metrics'
foreach($k in $metrics.Keys){$report += "- ${k}: $($metrics[$k])"}
$report += ''
$report += '## High-risk findings'
foreach($x in ($findings|Where-Object risk -eq 'HIGH'|Sort-Object kind,name)){ $report += "- [$($x.area)] $($x.kind) — $($x.name) × $($x.count): $($x.note)" }
$report += ''
$report += '## Duplicate function declarations'
foreach($g in ($declGroups|Where-Object Count -gt 1)){ $report += "- $($g.Name): $($g.Count) declarations" }
$report += ''
$report += '## Frequent full render targets'
foreach($g in $renderTargets){$report += "- $($g.Name): $($g.Count)"}
$report += ''
$report += '## Next classification rule'
$report += '- SAFE_DELETE: 호출/참조 0 + 후행 대체 구현 확인'
$report += '- MERGE: 동일 책임 함수가 2개 이상 존재하고 둘 다 참조됨'
$report += '- REGRESSION: 과거 기능 signature가 있었으나 최종 runtime에 없음'
$report += '- PERF: 반복 render/listener/timer/observer 또는 전체자료 반복계산'
$report += '- KEEP: 현재 단일 구현이며 실제 route/event/data path에서 참조됨'
$report|Set-Content (Join-Path $OutDir 'FULL-CODEBASE-AUDIT.md') -Encoding UTF8
Write-Host "FULL AUDIT COMPLETE. HIGH=$high MEDIUM=$med MISSING_MARKERS=$missingMarkers"
