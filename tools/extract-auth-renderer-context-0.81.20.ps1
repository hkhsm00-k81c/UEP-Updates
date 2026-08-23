$ErrorActionPreference='Stop'
$g='app/resources/app/gyomuon.js'
$out='audit-output/auth-0.81.20/RENDERER-AUTH-FOCUSED.txt'
$patterns='findUserAccount|accountToSession|renderUserAuthGate|initializeUserSessionGate|restoreRememberedSessionImmediately|authGateMessage|rememberedUser|switchUser|userAuth|로그인|이메일'
Select-String -Path $g -Pattern $patterns -CaseSensitive:$false -Context 15,35 | Out-String -Width 500 | Set-Content $out -Encoding UTF8
