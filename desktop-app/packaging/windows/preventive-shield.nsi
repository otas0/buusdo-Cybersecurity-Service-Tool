; Per-user NSIS prototype — installs under %LOCALAPPDATA%, data stays in %APPDATA%.
; Stage first:
;   npm run pack:windows-stage
; Build (on Windows with NSIS + stage\node.exe):
;   makensis packaging\windows\preventive-shield.nsi
;
; Does NOT write HKCU\...\Run. Open-at-login is only toggled inside the app.

!include "MUI2.nsh"
!include "LogicLib.nsh"

Name "buusdo Cybersecurity Service Tool"
OutFile "..\..\dist\windows\PreventiveShield-Setup-User.exe"
; InstallDir keeps legacy path so upgrades find the prior tree; brand is buusdo.
InstallDir "$LOCALAPPDATA\Preventive Shield"
RequestExecutionLevel user
Unicode true

; Hard-fail at compile time if stage is incomplete.
!if /FileExists "stage\node.exe"
!else
  !error "stage\node.exe missing. On Windows run: npm run pack:windows-stage (with a Windows node.exe). Do not makensis without node.exe."
!endif
!if /FileExists "stage\app\src\launcher.js"
!else
  !error "stage\app\src\launcher.js missing. Run: npm run pack:windows-stage"
!endif

!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"

Section "Install"
  SetOutPath "$INSTDIR"
  ; Expect a staged tree at packaging/windows/stage/ (node.exe required, app sources).
  File /r "stage\*.*"

  ; Silent install entry: prepare %APPDATA%\Preventive Shield, openAtLogin=false.
  nsExec::ExecToLog '"$INSTDIR\node.exe" "$INSTDIR\app\src\launcher.js" --install'
  Pop $0

  CreateDirectory "$SMPROGRAMS\buusdo"
  CreateShortCut "$SMPROGRAMS\buusdo\buusdo.lnk" \
    "$INSTDIR\node.exe" '"$INSTDIR\app\src\launcher.js"' "$INSTDIR\app\public\favicon.ico" 0
  CreateShortCut "$DESKTOP\buusdo.lnk" \
    "$INSTDIR\node.exe" '"$INSTDIR\app\src\launcher.js"'

  ; Explicitly do not touch HKCU Run.
  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "Uninstall"
  Delete "$SMPROGRAMS\buusdo\buusdo.lnk"
  Delete "$DESKTOP\buusdo.lnk"
  RMDir "$SMPROGRAMS\buusdo"
  ; Also remove legacy shortcuts if present
  Delete "$SMPROGRAMS\Preventive Shield\Preventive Shield.lnk"
  Delete "$DESKTOP\Preventive Shield.lnk"
  RMDir "$SMPROGRAMS\Preventive Shield"
  ; Leave %APPDATA%\Preventive Shield (lists / quarantine) for the user.
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"
SectionEnd