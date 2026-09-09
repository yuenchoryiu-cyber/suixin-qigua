' 无 CMD 黑窗启动「随心起卦」（解压版 / 安装目录内双击即可）
Option Explicit
Dim sh, fso, dir, exe
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
exe = dir & "\随心起卦.exe"
If Not fso.FileExists(exe) Then exe = dir & "\suixin-qigua.exe"
If Not fso.FileExists(exe) Then
  MsgBox "未找到随心起卦.exe，请把本脚本放在程序同目录。", 48, "随心起卦"
  WScript.Quit 1
End If
' 0 = 隐藏窗口：不弹出控制台黑窗
sh.Run """" & exe & """", 0, False
