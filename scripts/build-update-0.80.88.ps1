$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8

# UEP 0.80.88 - visual-only refinement after 0.80.87 boot recovery.
# Do not alter launcher/update/Google startup pipeline.
$g=$g.Replace('const APP_VERSION = "0.80.87";','const APP_VERSION = "0.80.88";')
$g=$g.Replace('v0.80.87','v0.80.88')

$css=@'
/* __UEP_GROWTH_PROFILE_UI_08088__ */
.student-growth-story-header,.growth-profile-hero,.sdgs-growth-hero{padding:18px 20px!important;min-height:0!important}
.student-growth-story-header p,.growth-profile-hero p,.sdgs-growth-hero p{margin:6px 0!important;line-height:1.55!important}
.growth-profile-summary-grid,.growth-profile-metrics,.growth-lens-grid{gap:8px!important;margin-top:10px!important}
.growth-profile-summary-grid>*,.growth-profile-metrics>*,.growth-lens-grid>*{padding:12px 14px!important;min-height:0!important}
.why-this-lens,.growth-profile-why{margin-top:10px!important;padding:14px 18px!important}
.sdgs-map-grid,.sdgs-evidence-grid{gap:7px!important}
.sdgs-map-grid>*,.sdgs-evidence-grid>*{min-height:66px!important;padding:10px 12px!important;border-radius:12px!important}
.sdgs-map-grid>*.confirmed,.sdgs-evidence-grid>*.confirmed,.sdgs-map-grid>*[data-status="confirmed"],.sdgs-evidence-grid>*[data-status="confirmed"]{box-shadow:0 0 0 2px rgba(36,145,125,.18) inset!important}
.sdgs-map-grid>*.possible,.sdgs-evidence-grid>*.possible,.sdgs-map-grid>*[data-status="possible"],.sdgs-evidence-grid>*[data-status="possible"]{opacity:.72!important}
.sdgs-map-grid>*.empty,.sdgs-evidence-grid>*.empty,.sdgs-map-grid>*[data-status="empty"],.sdgs-evidence-grid>*[data-status="empty"]{opacity:.48!important}
.sdgs-evidence-detail,.sdgs-detail-panel{margin-top:10px!important;padding:16px 18px!important}
.sdgs-evidence-detail .card,.sdgs-detail-panel .card{padding:12px 14px!important;margin:7px 0!important}
'@

if($g -notmatch '__UEP_GROWTH_PROFILE_UI_08088__'){
  # JSON string encoding guarantees a valid JavaScript string regardless of CSS quotes/newlines.
  $cssJson=$css | ConvertTo-Json -Compress
  $inject=@"

// __UEP_GROWTH_PROFILE_UI_08088__
try {
  const uepGrowthStyle=document.createElement('style');
  uepGrowthStyle.id='uep-growth-profile-ui-08088';
  uepGrowthStyle.textContent=$cssJson;
  document.head.appendChild(uepGrowthStyle);
} catch(e) { console.warn('[UEP] growth profile visual refinement skipped',e); }
"@
  $loadCall='load();'
  $at=$g.LastIndexOf($loadCall)
  if($at -lt 0){throw 'main load() call not found'}
  $g=$g.Substring(0,$at)+$inject+"`n"+$g.Substring($at)
}

Set-Content $gyo $g -Encoding UTF8 -NoNewline
$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.88'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8
node --check $gyo
if($LASTEXITCODE -ne 0){throw 'gyomuon.js syntax check failed'}
if((Get-Content $gyo -Raw -Encoding UTF8) -notmatch '__UEP_GROWTH_PROFILE_UI_08088__'){throw 'growth profile UI marker missing'}
Write-Host 'UEP 0.80.88 growth profile visual refinement applied.'
