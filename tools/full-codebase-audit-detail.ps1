param([string]$AppRoot='app',[string]$OutDir='audit-output')
$ErrorActionPreference='Stop'
New-Item -ItemType Directory -Force $OutDir | Out-Null
$gyoPath=Join-Path $AppRoot 'resources/app/gyomuon.js'
$cssPath=Join-Path $AppRoot 'resources/app/gyomuon.css'
$gyo=Get-Content $gyoPath -Raw -Encoding UTF8
$lines=Get-Content $gyoPath -Encoding UTF8

function LineOfIndex([string]$text,[int]$idx){ if($idx -lt 0){return 0}; return (($text.Substring(0,$idx) -split "`n").Count) }
function Snip([int]$line){ if($line -le 0){return ''}; $s=[Math]::Max(1,$line-2);$e=[Math]::Min($lines.Count,$line+2); return (($lines[($s-1)..($e-1)] -join ' ') -replace '\s+',' ').Trim() }

$targets=@('applyFix','findPopupRoot','sdgsDashboard','uepStudentApplicationDetail','uepStudentApplicationView','uepSubjectApplicationView','recordsView','selectionComparisonMarkup','selectionComparisonsForStudent','selectionErrorHistoryMarkup','selectionErrorsForStudent','uepSelectionDataset')
$functionRows=@()
foreach($name in $targets){
  $declRx='(?m)^\s*(?:async\s+)?function\s+'+[regex]::Escape($name)+'\s*\('
  $assignRx='(?m)^\s*'+[regex]::Escape($name)+'\s*=\s*(?:async\s*)?function\s*\('
  $decls=[regex]::Matches($gyo,$declRx); $assigns=[regex]::Matches($gyo,$assignRx)
  $refs=([regex]::Matches($gyo,'\b'+[regex]::Escape($name)+'\b')).Count
  foreach($m in $decls){$ln=LineOfIndex $gyo $m.Index;$functionRows += [pscustomobject]@{name=$name;kind='declaration';line=$ln;totalRefs=$refs;snippet=Snip $ln}}
  foreach($m in $assigns){$ln=LineOfIndex $gyo $m.Index;$functionRows += [pscustomobject]@{name=$name;kind='assignment';line=$ln;totalRefs=$refs;snippet=Snip $ln}}
}
$functionRows|Export-Csv (Join-Path $OutDir 'function-locations.csv') -NoTypeInformation -Encoding UTF8

$runtimeRows=@()
$patterns=[ordered]@{
 MutationObserver='new\s+MutationObserver\s*\('
 setInterval='setInterval\s*\('
 setTimeout='setTimeout\s*\('
 requestAnimationFrame='requestAnimationFrame\s*\('
 addEventListener='addEventListener\s*\('
 render='\brender\s*\('
}
foreach($k in $patterns.Keys){
 foreach($m in [regex]::Matches($gyo,$patterns[$k])){ $ln=LineOfIndex $gyo $m.Index; $runtimeRows += [pscustomobject]@{kind=$k;line=$ln;snippet=Snip $ln} }
}
$runtimeRows|Export-Csv (Join-Path $OutDir 'runtime-locations.csv') -NoTypeInformation -Encoding UTF8

# Specific render target locations for high-pressure pages.
$renderRows=@()
foreach($m in [regex]::Matches($gyo,'render\s*\(\s*["'']([^"'']+)["'']\s*\)')){ $ln=LineOfIndex $gyo $m.Index;$renderRows += [pscustomobject]@{page=$m.Groups[1].Value;line=$ln;snippet=Snip $ln} }
$renderRows|Export-Csv (Join-Path $OutDir 'render-locations.csv') -NoTypeInformation -Encoding UTF8

# Wrapper capture chains with locations.
$wrapRows=@()
foreach($m in [regex]::Matches($gyo,'(?ms)const\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;\s*\2\s*=\s*function\s*\(')){
 $ln=LineOfIndex $gyo $m.Index;$wrapRows += [pscustomobject]@{target=$m.Groups[2].Value;capturedAs=$m.Groups[1].Value;line=$ln;snippet=Snip $ln}
}
$wrapRows|Export-Csv (Join-Path $OutDir 'wrapper-locations.csv') -NoTypeInformation -Encoding UTF8

# Possible dead declarations: declaration name with only one textual occurrence (the declaration itself).
$dead=@()
$declAll=[regex]::Matches($gyo,'(?m)^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(')
foreach($m in $declAll){$name=$m.Groups[1].Value;$refs=([regex]::Matches($gyo,'\b'+[regex]::Escape($name)+'\b')).Count;if($refs -le 1){$ln=LineOfIndex $gyo $m.Index;$dead += [pscustomobject]@{name=$name;line=$ln;refs=$refs;snippet=Snip $ln}}}
$dead|Export-Csv (Join-Path $OutDir 'dead-function-candidates.csv') -NoTypeInformation -Encoding UTF8

$summary=@()
$summary += '# UEP FULL CODEBASE AUDIT — SECOND PASS'
$summary += ''
$summary += '- 중복/override 대상 함수 위치: '+$functionRows.Count
$summary += '- MutationObserver 위치: '+(($runtimeRows|Where-Object kind -eq 'MutationObserver').Count)
$summary += '- setInterval 위치: '+(($runtimeRows|Where-Object kind -eq 'setInterval').Count)
$summary += '- 전체 render 위치: '+(($runtimeRows|Where-Object kind -eq 'render').Count)
$summary += '- wrapper chain 위치: '+$wrapRows.Count
$summary += '- 미참조 함수 후보: '+$dead.Count
$summary += ''
$summary += '## Wrapper chains'
foreach($r in $wrapRows){$summary += ('- {0} <- {1} @ line {2}' -f $r.target,$r.capturedAs,$r.line)}
$summary += ''
$summary += '## Duplicate/override function sites'
foreach($r in $functionRows){$summary += ('- {0} / {1} / line {2} / refs {3}' -f $r.name,$r.kind,$r.line,$r.totalRefs)}
$summary|Set-Content (Join-Path $OutDir 'SECOND-PASS-AUDIT.md') -Encoding UTF8
Write-Host ('SECOND PASS COMPLETE functionSites={0} runtimeSites={1} deadCandidates={2}' -f $functionRows.Count,$runtimeRows.Count,$dead.Count)
