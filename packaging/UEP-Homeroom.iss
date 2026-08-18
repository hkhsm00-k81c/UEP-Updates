#define MyAppName "UEP"
#define MyAppVersion "0.80.62"
#define MyLauncherExeName "UEP-Launcher.exe"

[Setup]
AppId={{9D5137CB-03B9-4D89-82D2-AE08060A0001}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
DefaultDirName={localappdata}\Programs\UEP
DefaultGroupName=UEP
PrivilegesRequired=lowest
OutputDir=..\dist
OutputBaseFilename=UEP-Setup-With-AutoUpdater
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\{#MyLauncherExeName}
CloseApplications=yes
RestartApplications=no

[Files]
Source: "..\app\*"; DestDir: "{app}\app-current"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\launcher-dist\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\installed-version.json"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\UEP"; Filename: "{app}\{#MyLauncherExeName}"; WorkingDir: "{app}"
Name: "{group}\UEP"; Filename: "{app}\{#MyLauncherExeName}"; WorkingDir: "{app}"

[Run]
Filename: "{app}\{#MyLauncherExeName}"; Description: "UEP 실행"; Flags: nowait postinstall skipifsilent
