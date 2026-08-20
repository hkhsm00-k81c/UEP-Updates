$ErrorActionPreference='Stop'
$gyo='app/resources/app/gyomuon.js'
$css='app/resources/app/gyomuon.css'
$pkg='app/resources/app/package.json'
$g=Get-Content $gyo -Raw -Encoding UTF8
$c=Get-Content $css -Raw -Encoding UTF8

# Scope lock: 생활기록부 > SDGs 연계 성장 프로파일 only.
$g=$g.Replace('const APP_VERSION = "0.80.97";','const APP_VERSION = "0.80.98";').Replace('v0.80.97','v0.80.98')

# Replace the click-only SDG chips with always-visible evidence cards.
$chipsStartNeedle='const chips=[...map.values()]'
$chipsStart=$g.IndexOf($chipsStartNeedle,[System.StringComparison]::Ordinal)
if($chipsStart -lt 0){throw 'SDGs chips start anchor not found'}
$returnNeedle='return `<div class="growth-profile'
$returnStart=$g.IndexOf($returnNeedle,$chipsStart,[System.StringComparison]::Ordinal)
if($returnStart -lt 0){throw 'growth profile return anchor not found'}
$newChips=@'
const chips=[...map.values()].map(x=>{
    const confirmedEvidence=x.evidence.filter(e=>e.strength==='confirmed');
    const possibleEvidence=x.evidence.filter(e=>e.strength!=='confirmed');
    return {...x,confirmedEvidence,possibleEvidence,priority:confirmedEvidence.length?0:possibleEvidence.length?1:2};
  }).sort((a,b)=>a.priority-b.priority||b.confirmedEvidence.length-a.confirmedEvidence.length||b.possibleEvidence.length-a.possibleEvidence.length||a.no-b.no).map(x=>{
    const conf=x.confirmedEvidence.length,poss=x.possibleEvidence.length;
    const cls=conf?'confirmed':poss?'possible':'empty';
    const label=conf?`근거 확인 ${conf}건${poss?` · 연결 가능 ${poss}건`:''}`:poss?`연결 가능 ${poss}건`:'근거 없음';
    const ordered=[...x.confirmedEvidence,...x.possibleEvidence];
    const seen=new Set();
    const representatives=[];
    for(const e of ordered){
      const key=`${String(e.type||'근거')}|${String(e.title||'')}`;
      if(seen.has(key))continue;
      seen.add(key);representatives.push(e);
      if(representatives.length>=6)break;
    }
    const evidenceMarkup=representatives.length?`<ul class="growth-sdg-evidence-list">${representatives.map(e=>`<li class="${e.strength==='confirmed'?'confirmed':'possible'}"><b>${escapeHtml(e.type||'근거')}</b><span>${escapeHtml(e.title||e.detail||'연결된 활동 근거')}</span></li>`).join('')}</ul>${ordered.length>representatives.length?`<small class="growth-sdg-more">외 ${ordered.length-representatives.length}건</small>`:''}`:'<p class="growth-sdg-empty">현재 연결된 실제 근거가 없습니다.</p>';
    return `<article class="growth-sdg-evidence-card ${cls}"><header><div><b>${x.no}</b><span>${escapeHtml(x.name)}</span></div><small>${label}</small></header>${evidenceMarkup}</article>`;
  }).join('');
  const detail=null;
  '
'@
$g=$g.Substring(0,$chipsStart)+$newChips.TrimEnd()+$g.Substring($returnStart)

# Keep the purpose badge once only. Remove duplicated identical span badges if a later UI patch added one.
$purposeBadge='<span>SDGs 17개를 채우는 것이 목적이 아닙니다.</span>'
$firstBadge=$g.IndexOf($purposeBadge,[System.StringComparison]::Ordinal)
if($firstBadge -ge 0){
  $nextBadge=$g.IndexOf($purposeBadge,$firstBadge+$purposeBadge.Length,[System.StringComparison]::Ordinal)
  while($nextBadge -ge 0){
    $g=$g.Remove($nextBadge,$purposeBadge.Length)
    $nextBadge=$g.IndexOf($purposeBadge,$firstBadge+$purposeBadge.Length,[System.StringComparison]::Ordinal)
  }
}

# The cards now contain their evidence, so the old click-detail region remains disabled by detail=null.

$cssPatch=@'

/* __UEP_SDGS_EVIDENCE_CARDS_08098__ */
.growth-profile-v082 .growth-sdg-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;align-items:stretch!important}
.growth-profile-v082 .growth-sdg-evidence-card{border:1px solid #d9e3e7;border-radius:13px;background:#fff;padding:12px 13px;min-width:0;display:flex;flex-direction:column;gap:9px}
.growth-profile-v082 .growth-sdg-evidence-card.confirmed{border-color:#9ad8c7;background:#f4fbf8}
.growth-profile-v082 .growth-sdg-evidence-card.possible{border-style:dashed;background:#fbfcfd}
.growth-profile-v082 .growth-sdg-evidence-card.empty{opacity:.72;background:#fafbfc}
.growth-profile-v082 .growth-sdg-evidence-card>header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin:0;padding:0;border:0}
.growth-profile-v082 .growth-sdg-evidence-card>header>div{display:flex;align-items:baseline;gap:7px;min-width:0}
.growth-profile-v082 .growth-sdg-evidence-card>header b{font-size:18px;line-height:1;color:#173b4d}
.growth-profile-v082 .growth-sdg-evidence-card>header span{font-weight:700;font-size:13px;line-height:1.35;color:#1f2d36}
.growth-profile-v082 .growth-sdg-evidence-card>header small{font-size:10px;line-height:1.3;color:#6d7d85;text-align:right;white-space:nowrap}
.growth-profile-v082 .growth-sdg-evidence-list{list-style:none;margin:0;padding:0;display:grid;gap:5px}
.growth-profile-v082 .growth-sdg-evidence-list li{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;align-items:start;padding-top:5px;border-top:1px solid #edf1f3;min-width:0}
.growth-profile-v082 .growth-sdg-evidence-list li:first-child{border-top:0;padding-top:0}
.growth-profile-v082 .growth-sdg-evidence-list li b{font-size:10px;line-height:1.4;color:#087c6b;white-space:nowrap}
.growth-profile-v082 .growth-sdg-evidence-list li.possible b{color:#5f7180}
.growth-profile-v082 .growth-sdg-evidence-list li span{font-size:11px;line-height:1.42;color:#34444d;overflow-wrap:anywhere}
.growth-profile-v082 .growth-sdg-more{display:block;margin-top:auto;padding-top:2px;font-size:10px;color:#788891;text-align:right}
.growth-profile-v082 .growth-sdg-empty{margin:0;font-size:11px;line-height:1.4;color:#95a1a8}
.growth-profile-v082 .growth-sdg-detail{display:none!important}
@media(max-width:1200px){.growth-profile-v082 .growth-sdg-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
'@
if($c -notmatch '__UEP_SDGS_EVIDENCE_CARDS_08098__'){$c += $cssPatch}

Set-Content $gyo $g -Encoding UTF8
Set-Content $css $c -Encoding UTF8
node --check $gyo
if($LASTEXITCODE -ne 0){throw 'gyomuon syntax failed'}

# Gates: clickless evidence cards and one purpose badge, with prior selection fix preserved.
$checkG=Get-Content $gyo -Raw -Encoding UTF8
$checkC=Get-Content $css -Raw -Encoding UTF8
$purposeCount=([regex]::Matches($checkG,[regex]::Escape('SDGs 17개를 채우는 것이 목적이 아닙니다.'))).Count
$checks=[ordered]@{
  'evidence card markup'=$checkG.Contains('growth-sdg-evidence-card')
  'evidence list markup'=$checkG.Contains('growth-sdg-evidence-list')
  'confirmed possible empty sorting'=$checkG.Contains('priority:confirmedEvidence.length?0:possibleEvidence.length?1:2')
  'click detail disabled'=$checkG.Contains('const detail=null;')
  'purpose badge not duplicated'=($purposeCount -le 1)
  'card css marker'=$checkC.Contains('__UEP_SDGS_EVIDENCE_CARDS_08098__')
  'selection 06 fix preserved'=$checkG.Contains('for(const raw of (readonlyCache?.subjectSelections||[]))')
}
$checks.GetEnumerator() | ForEach-Object { Write-Host ("CHECK {0} = {1}" -f $_.Key,$_.Value) }
if($checks.Values -contains $false){throw '0.80.98 SDGs evidence-card verification failed'}

$p=Get-Content $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
$p.version='0.80.98'
$p | ConvertTo-Json -Depth 20 | Set-Content $pkg -Encoding UTF8
Write-Host 'UEP 0.80.98 SDGs clickless evidence cards applied.'
