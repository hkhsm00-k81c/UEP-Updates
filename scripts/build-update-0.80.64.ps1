$ErrorActionPreference='Stop'

# Preserve all 0.80.63 selection-course fixes first.
& "$PSScriptRoot/build-update-0.80.63.ps1"

$main='app/resources/app/electron/main.cjs'
$gyo='app/resources/app/gyomuon.js'
$pkg='app/resources/app/package.json'

# 0.80.64: repair the Windows desktop/start-menu shortcut icon without changing its Launcher target.
# The shortcut continues to launch UEP-Launcher.exe; only IconLocation points to app-current\UEP.exe.
$m=Get-Content $main -Raw -Encoding UTF8
if($m -notmatch 'UEP_SHORTCUT_ICON_REPAIR_08064'){
$repair=@'

// UEP_SHORTCUT_ICON_REPAIR_08064
// Keep shortcut target on the independent Launcher, but use the verified UEP.exe school icon.
function repairUepShortcutIcons08064() {
  if (process.platform !== 'win32') return;
  try {
    const cp = require('child_process');
    const appRoot = path.dirname(process.execPath);
    const launcherExe = path.join(appRoot, '..', 'UEP-Launcher.exe');
    const iconExe = process.execPath;
    const ps = [
      "$ErrorActionPreference='SilentlyContinue'",
      "$w=New-Object -ComObject WScript.Shell",
      "$targets=@([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('StartMenu'))",
      "foreach($root in $targets){ if(Test-Path $root){ Get-ChildItem $root -Filter 'UEP.lnk' -Recurse -ErrorAction SilentlyContinue | ForEach-Object { $s=$w.CreateShortcut($_.FullName); if(Test-Path '" + launcherExe.replace(/'/g,"''") + "'){ $s.TargetPath='" + launcherExe.replace(/'/g,"''") + "'; $s.WorkingDirectory='" + path.dirname(launcherExe).replace(/'/g,"''") + "' }; $s.IconLocation='" + iconExe.replace(/'/g,"''") + ",0'; $s.Save() } } }",
      "ie4uinit.exe -show"
    ].join('; ');
    cp.execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',ps],{windowsHide:true},()=>{});
  } catch (e) {
    console.warn('[UEP] shortcut icon repair skipped', e?.message || e);
  }
}
app.whenReady().then(() => setTimeout(repairUepShortcutIcons08064, 1200));
'@
  Add-Content $main $repair -Encoding UTF8
}

$g=Get-Content $gyo -Raw -Encoding UTF8
$g=$g.Replace('const APP_VERSION = "0.80.63";','const APP_VERSION = "0.80.64";')
Set-Content $gyo $g -Encoding UTF8 -NoNewline

$p=Get-Content $pkg -Raw -Encoding UTF8
$p=[regex]::Replace($p,'"version"\s*:\s*"0\.80\.63"','"version": "0.80.64"',1)
Set-Content $pkg $p -Encoding UTF8 -NoNewline

node --check $main
node --check $gyo
