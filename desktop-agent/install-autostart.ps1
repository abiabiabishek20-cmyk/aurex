$ErrorActionPreference = "Stop"

$AgentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Node = (Get-Command node.exe -ErrorAction Stop).Source
$Agent = Join-Path $AgentDir "agent.js"
$TaskName = "Aurex Desktop Agent"

$Action = New-ScheduledTaskAction -Execute $Node -Argument ("`"{0}`"" -f $Agent)
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 10 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force | Out-Null
Write-Host "Aurex Desktop Agent auto-start is installed."
Write-Host "The agent will start automatically when you sign in to Windows."
