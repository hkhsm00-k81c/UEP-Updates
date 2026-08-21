$ErrorActionPreference='Stop'
$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$index='app/resources/app/index.html'
$pkg='app/resources/app/package.json'
$m=Get-Content $main -Raw -Encoding UTF8
$g=Get-Content $gyo -Raw -Encoding UTF8
$i=Get-Content $index -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.81.04";','const APP_VERSION = "0.81.05";').Replace('v0.81.04','v0.81.05')

if(-not $g.Contains('__UEP_CURRICULUM_SDGS_INTEGRATION_08105__')){$g+="`r`n"+(Get-Content './patches/uep-0.81.05-curriculum-sdgs.js' -Raw -Encoding UTF8)}

# 선택과목과 SDGs는 생활기록부 내부 탭이므로 독립 좌측 메뉴를 제거합니다.
$i=$i.Replace('<button class="nav nav-child" data-page="selection"><span>↳</span><b>선택과목</b></button>'+"`r`n",'')
$i=$i.Replace('<button class="nav nav-child" data-page="sdgs"><span>↳</span><b>SDGs 근거지도</b></button>'+"`r`n",'')

# 생활기록부 교육과정·SDGs 내부에서 새 하위 기능의 이벤트를 연결합니다.
$anchor='  if(page==="selection")bindSelectionAnalysis();'
if($g.Contains($anchor)){$g=$g.Replace($anchor,'  if(page==="records"&&(recordMode==="curriculum"||recordMode==="sdgs"))bindSelectionAnalysis();')}

# Excel COM의 PowerShell stdout을 UTF-8로 고정하여 나이스 한글 원문 깨짐을 막습니다.
$psAnchor='$ErrorActionPreference=''Stop''' 
$utf8='$ErrorActionPreference=''Stop'''+"`r`n"+'[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);$OutputEncoding=[Console]::OutputEncoding'
$marker='// __UEP_NEIS_RECORDBOOK_LOCAL_INSPECT_08102__'
$pos=$m.IndexOf($marker)
if($pos -lt 0){throw 'NEIS inspector marker not found'}
$before=$m.Substring(0,$pos);$after=$m.Substring($pos)
if(-not $after.Contains('[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)')){$after=$after.Replace($psAnchor,$utf8)}
$m=$before+$after

Set-Content $main $m -Encoding UTF8;Set-Content $gyo $g -Encoding UTF8;Set-Content $index $i -Encoding UTF8
node --check $main;if($LASTEXITCODE-ne 0){throw 'main syntax failed'}
node --check $gyo;if($LASTEXITCODE-ne 0){throw 'renderer syntax failed'}
$checks=[ordered]@{
 'version 0.81.05'=$g.Contains('const APP_VERSION = "0.81.05";')
 'four semesters'=$g.Contains('["2-1","2-2","3-1","3-2"]')
 'curriculum integration'=$g.Contains('uepCurriculumTabs')
 'class student history'=$g.Contains('반별·학생별 신청이력')
 'all subject roster'=$g.Contains('과목별 인원·명단')
 'duplicate across terms'=$g.Contains('학기간 동일과목 중복')
 'SDGs supplement'=$g.Contains('function uepSdgsSupplementPanel')
 'recordcheck standalone'=$i.Contains('data-page="recordcheck"')
 'selection nav removed'=(-not $i.Contains('data-page="selection"'))
 'sdgs nav removed'=(-not $i.Contains('data-page="sdgs"'))
 'NEIS UTF8'=$m.Contains('[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)')
}
$checks.GetEnumerator()|ForEach-Object{Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value)}
if($checks.Values-contains $false){throw 'UEP 0.81.05 verification failed'}
$package=Get-Content $pkg -Raw -Encoding UTF8|ConvertFrom-Json;$package.version='0.81.05';$package|ConvertTo-Json -Depth 20|Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.81.05 curriculum, SDGs supplement and NEIS UTF-8 fix applied.'
