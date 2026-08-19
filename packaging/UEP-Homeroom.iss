#define MyAppName "UEP"
#define MyAppVersion "2.0.0"
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
SetupIconFile=..\launcher\uep.ico
UninstallDisplayIcon={app}\app-current\UEP.exe
CloseApplications=yes
RestartApplications=no

[Files]
Source: "..\app\*"; DestDir: "{app}\app-current"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\launcher-dist\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\installed-version.json"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\UEP"; Filename: "{app}\{#MyLauncherExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\app-current\UEP.exe"
Name: "{group}\UEP"; Filename: "{app}\{#MyLauncherExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\app-current\UEP.exe"

[Run]
Filename: "{app}\{#MyLauncherExeName}"; Description: "UEP 실행"; Flags: nowait postinstall skipifsilent
