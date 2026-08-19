$ErrorActionPreference='Stop'

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

$m=Get-Content $main -Raw -Encoding UTF8

# Missing Google credential on distributed homeroom PCs must not surface as raw ENOENT.
$needle='async function readEncrypted(filePath) {'
if($m.Contains($needle) -and $m -notmatch '__UEP_GOOGLE_MISSING_CREDENTIAL_08069__'){
  $replacement=@'
// __UEP_GOOGLE_MISSING_CREDENTIAL_08069__
async function readEncrypted(filePath) {
'@
  $m=$m.Replace($needle,$replacement)
  $old='    throw readError;'
  $new=@'
    if (path.resolve(filePath) === path.resolve(credentialPath()) && (readError?.code === "ENOENT" || /no such file/i.test(String(readError?.message||"")))) {
      const friendly = new Error("담임 배포 PC의 Google 시트 연결 승인이 아직 준비되지 않았습니다.");
      friendly.code = "UEP_GOOGLE_CREDENTIAL_MISSING";
      friendly.setupRequired = true;
      throw friendly;
    }
    throw readError;
'@
  $m=$m.Replace($old,$new)
}

# Make credential status structured and friendly for first-run homeroom distribution PCs.
$m=[regex]::Replace($m,'ipcMain\.handle\("google:credentialStatus", async \(\) => \{[\s\S]*?\n\s*\}\);',@'
ipcMain.handle("google:credentialStatus", async () => {
  try {
    const credentials = await readEncrypted(credentialPath());
    if (!validateServiceAccount(credentials)) throw new Error("invalid");
    return { ok:true, encryption:safeStorage.isEncryptionAvailable(), local:false, account:credentials.client_email || "" };
  } catch (error) {
    const missing = error?.code === "UEP_GOOGLE_CREDENTIAL_MISSING" || error?.code === "ENOENT" || /no such file/i.test(String(error?.message||""));
    return {
      ok:false,
      setupRequired:true,
      missing,
      reason: missing
        ? "담임용 Google 시트 연결 승인이 필요합니다. UEP는 로그인과 NEIS 기능을 계속 사용할 수 있습니다."
        : (error?.message || String(error))
    };
  }
});
'@,1)

Set-Content $main $m -Encoding UTF8 -NoNewline

$g=Get-Content $gyo -Raw -Encoding UTF8
# Replace raw ENOENT text in sync-status UI with an operational message.
if($g -notmatch '__UEP_GOOGLE_STATUS_UI_08069__'){
$g += @'

// __UEP_GOOGLE_STATUS_UI_08069__
(function(){
  function normalizeGoogleConnectionError(){
    document.querySelectorAll('body *').forEach(el=>{
      if(el.children.length) return;
      const t=String(el.textContent||'');
      if(t.includes('google-service-account.bin') || (t.includes('ENOENT') && t.includes('Google'))){
        el.textContent='담임용 Google 시트 연결 승인이 필요합니다. 로그인과 NEIS 기능은 정상 사용 가능합니다.';
      }
    });
  }
  const obs=new MutationObserver(()=>requestAnimationFrame(normalizeGoogleConnectionError));
  obs.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  setTimeout(normalizeGoogleConnectionError,250);
})();
'@
}
$g=$g.Replace('const APP_VERSION = "0.80.68";','const APP_VERSION = "0.80.69";')
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8
$p=[regex]::Replace($p,'"version"\s*:\s*"0\.80\.68"','"version": "0.80.69"',1)
Set-Content $pkg $p -Encoding UTF8 -NoNewline

node --check $main
node --check $gyo
