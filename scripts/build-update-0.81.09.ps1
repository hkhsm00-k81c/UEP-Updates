$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js';$css='app/resources/app/gyomuon.css';$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8;$c=Get-Content $css -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.81.08";','const APP_VERSION = "0.81.09";').Replace('v0.81.08','v0.81.09')

# Remove the late whole-function dashboard overrides that can race the first render.
# The 0.81.08 NEIS parser, dorm save and supervisor report changes remain in place.
$jsMarker='// __UEP_OPERATIONS_08108__'
$jsAt=$g.IndexOf($jsMarker)
if($jsAt -ge 0){$g=$g.Substring(0,$jsAt).TrimEnd()+"`r`n"}
$cssMarker='/* __UEP_OPERATIONS_STYLE_08108__ */'
$cssAt=$c.IndexOf($cssMarker)
if($cssAt -ge 0){$c=$c.Substring(0,$cssAt).TrimEnd()+"`r`n"}

Set-Content $gyo $g -Encoding UTF8;Set-Content $css $c -Encoding UTF8
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$package.version='0.81.09';$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
node --check $gyo;if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'}
$checks=[ordered]@{
 'version 0.81.09'=$g.Contains('const APP_VERSION = "0.81.09";')
 'risky dashboard override removed'=(-not $g.Contains('__UEP_OPERATIONS_08108__'))
 'NEIS fixed parser retained'=$g.Contains('const subjectIndex=indexOf')
 'NEIS individual filter retained'=$g.Contains('data-neis-student')
 'supervisor grouped report retained'=$g.Contains('■ ${time} 귀가')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.09 recovery verification failed'}
Write-Host 'UEP 0.81.09 startup recovery applied.'
