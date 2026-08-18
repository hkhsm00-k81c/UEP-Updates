#define MyAppName "UEP"
#define MyAppVersion "0.80.60"
#define MyAppExeName "UEP.exe"

[Setup]
AppId={{9D5137CB-03B9-4D89-82D2-AE08060A0001}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
DefaultDirName={localappdata}\Programs\UEP
DefaultGroupName=UEP
PrivilegesRequired=lowest
OutputDir=..\dist
OutputBaseFilename=UEP-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\{#MyAppExeName}
CloseApplications=yes
RestartApplications=no

[Files]
Source: "..\app\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autodesktop}\UEP"; Filename: "{app}\UEP.exe"; WorkingDir: "{app}"
Name: "{group}\UEP"; Filename: "{app}\UEP.exe"; WorkingDir: "{app}"

[Run]
Filename: "{app}\UEP.exe"; Description: "UEP 실행"; Flags: nowait postinstall skipifsilent
