param([string]$AppRoot='app',[string]$OutDir='audit-output')
$ErrorActionPreference='Stop'
New-Item -ItemType Directory -Force $OutDir | Out-Null
function ReadText($p){if(Test-Path $p){Get-Content $p -Raw -Encoding UTF8}else{''}}
function Esc($s){[regex]::Escape($s)}
$gyo=ReadText (Join-Path $AppRoot 'resources/app/gyomuon.js')
$main=ReadText (Join-Path $AppRoot 'resources/app/electron/main.cjs')
$data=ReadText (Join-Path $AppRoot 'resources/app/electron/google-data.cjs')
$preload=ReadText (Join-Path $AppRoot 'resources/app/electron/preload.cjs')
$index=ReadText (Join-Path $AppRoot 'resources/app/index.html')
$css=ReadText (Join-Path $AppRoot 'resources/app/gyomuon.css')
$repoText=(Get-ChildItem -Recurse -File | Where-Object {$_.FullName -notmatch '\\.git\\|\\node_modules\\|\\audit-output\\|\\app\\'} | ForEach-Object { try { Get-Content $_.FullName -Raw -Encoding UTF8 } catch { '' } }) -join "`n"
$runtimeText=@($gyo,$main,$data,$preload,$index,$css) -join "`n"

$dead=Import-Csv (Join-Path $OutDir 'dead-function-candidates.csv')
$deadReview=@()
foreach($d in $dead){
 $n=$d.name
 $escaped=Esc $n
 $gyoRefs=([regex]::Matches($gyo,"\b$escaped\b")).Count
 $runtimeRefs=([regex]::Matches($runtimeText,"\b$escaped\b")).Count
 $repoRefs=([regex]::Matches($repoText,"\b$escaped\b")).Count
 $stringPattern='[\x27\x22]'+$escaped+'[\x27\x22]'
 $dataPattern='data-[^=\s]+=[\x27\x22][^\x27\x22]*'+$escaped+'[^\x27\x22]*[\x27\x22]'
 $stringRefs=([regex]::Matches($runtimeText,$stringPattern)).Count
 $windowRefs=([regex]::Matches($runtimeText,"window\.$escaped\b")).Count
 $dataRefs=([regex]::Matches($runtimeText,$dataPattern)).Count
 $classification=if($runtimeRefs -le 1 -and $repoRefs -le 1 -and $stringRefs -eq 0 -and $windowRefs -eq 0 -and $dataRefs -eq 0){'SAFE_DELETE_AFTER_SMOKE'}else{'KEEP_OR_MANUAL_REVIEW'}
 $deadReview += [pscustomobject]@{name=$n;line=$d.line;gyoRefs=$gyoRefs;runtimeRefs=$runtimeRefs;repoRefs=$repoRefs;stringRefs=$stringRefs;windowRefs=$windowRefs;dataRefs=$dataRefs;classification=$classification}
}
$deadReview|Export-Csv (Join-Path $OutDir 'fourth-pass-dead-review.csv') -NoTypeInformation -Encoding UTF8

$shadowNames=@('sdgsDashboard','findPopupRoot','applyFix','uepStudentApplicationDetail','uepStudentApplicationView','uepSubjectApplicationView')
$shadow=@()
foreach($n in $shadowNames){
 $escaped=Esc $n
 $matches=[regex]::Matches($gyo,"(?ms)^\s*function\s+$escaped\s*\([^)]*\)\s*\{.*?^\}")
 for($i=0;$i -lt $matches.Count;$i++){
  $m=$matches[$i];$line=1+([regex]::Matches($gyo.Substring(0,$m.Index),"`n")).Count
  $hash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($m.Value))).Substring(0,12).ToLower()
  $shadow += [pscustomobject]@{name=$n;ordinal=$i+1;line=$line;hash=$hash;chars=$m.Length;isLast=($i -eq $matches.Count-1)}
 }
}
$shadow|Export-Csv (Join-Path $OutDir 'fourth-pass-shadowed.csv') -NoTypeInformation -Encoding UTF8

$perf=Import-Csv (Join-Path $OutDir 'third-pass-perf.csv')
$perfSummary=$perf|Group-Object kind|ForEach-Object{[pscustomobject]@{kind=$_.Name;count=$_.Count}}
$perfSummary|Export-Csv (Join-Path $OutDir 'fourth-pass-perf-summary.csv') -NoTypeInformation -Encoding UTF8

$safe=($deadReview|Where-Object classification -eq 'SAFE_DELETE_AFTER_SMOKE')
$manual=($deadReview|Where-Object classification -ne 'SAFE_DELETE_AFTER_SMOKE')
$report=@('# UEP CODEBASE AUDIT — FOURTH PASS SAFE CLASSIFICATION','',"- dead candidates reviewed: $($deadReview.Count)","- SAFE_DELETE_AFTER_SMOKE: $($safe.Count)","- KEEP_OR_MANUAL_REVIEW: $($manual.Count)","- shadowed declaration groups: $($shadowNames.Count)",'','## Shadowed declarations')
foreach($g in ($shadow|Group-Object name)){ $report += "- $($g.Name): "+(($g.Group|ForEach-Object{"#$($_.ordinal) line $($_.line) hash $($_.hash) chars $($_.chars) last=$($_.isLast)"}) -join ' | ') }
$report += ''; $report += '## SAFE_DELETE_AFTER_SMOKE'
foreach($x in $safe){$report += "- $($x.name) @ $($x.line) runtimeRefs=$($x.runtimeRefs) repoRefs=$($x.repoRefs)"}
$report += ''; $report += '## KEEP_OR_MANUAL_REVIEW'
foreach($x in $manual){$report += "- $($x.name) @ $($x.line) runtimeRefs=$($x.runtimeRefs) repoRefs=$($x.repoRefs) string=$($x.stringRefs) window=$($x.windowRefs) data=$($x.dataRefs)"}
$report += ''; $report += '## Rule';$report += '- No production deletion in this pass.';$report += '- Shadowed declarations may be removed only after preserving the final declaration and smoke testing relevant routes.';$report += '- SAFE_DELETE_AFTER_SMOKE means static analysis found no other repo/runtime reference; still require route smoke test before deletion.'
$report|Set-Content (Join-Path $OutDir 'FOURTH-PASS-SAFE-CLASSIFICATION.md') -Encoding UTF8
Write-Host "FOURTH PASS COMPLETE safe=$($safe.Count) manual=$($manual.Count)"