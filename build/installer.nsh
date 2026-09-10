; 完整 Setup：安装前强制结束仍在运行的随心起卦（含托盘隐藏），避免
; “cannot be closed / Please close it manually”。
; electron-builder 若定义了 customCheckAppRunning，会替换默认检测逻辑。

!macro customInit
  DetailPrint "Closing ${PRODUCT_NAME} if running..."
  nsExec::ExecToLog 'cmd /c taskkill /IM "${APP_EXECUTABLE_FILENAME}" /T >nul 2>&1'
  Sleep 600
  nsExec::ExecToLog 'cmd /c taskkill /F /IM "${APP_EXECUTABLE_FILENAME}" /T >nul 2>&1'
  Sleep 400
!macroend

!macro customCheckAppRunning
  DetailPrint "Ensuring ${PRODUCT_NAME} is not running..."
  ; 先礼后兵：温和结束 → 强制结束进程树
  nsExec::ExecToLog 'cmd /c taskkill /IM "${APP_EXECUTABLE_FILENAME}" /T /FI "USERNAME eq %USERNAME%" >nul 2>&1'
  Sleep 800
  nsExec::ExecToLog 'cmd /c taskkill /F /IM "${APP_EXECUTABLE_FILENAME}" /T /FI "USERNAME eq %USERNAME%" >nul 2>&1'
  Sleep 500
  ; 兜底：结束安装目录下仍占文件的进程（不按全局 node 名乱杀）
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -Command "$$d=''$INSTDIR''; if ($$d) { Get-CimInstance Win32_Process | Where-Object { $$_.ExecutablePath -and $$_.ExecutablePath.StartsWith($$d, [StringComparison]::OrdinalIgnoreCase) } | ForEach-Object { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue } }"'
  Sleep 700
!macroend
