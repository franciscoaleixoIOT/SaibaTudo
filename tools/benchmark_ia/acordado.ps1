# Mantém o Windows acordado (sem suspender) enquanto este processo viver. Encerre com Stop-Process ou apagando o arquivo-sinal.
# Uso: pwsh -NoProfile -File tools/benchmark_ia/acordado.ps1 -Sinal tools/benchmark_ia/out/acordado.on
param([string]$Sinal = "$PSScriptRoot\out\acordado.on", [int]$MaxHoras = 10)
Add-Type -Namespace Win32 -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
$ES_CONTINUOUS = [uint32]"0x80000000"; $ES_SYSTEM_REQUIRED = [uint32]"0x00000001"
New-Item -ItemType File -Force -Path $Sinal | Out-Null
$fim = (Get-Date).AddHours($MaxHoras)
while ((Test-Path $Sinal) -and ((Get-Date) -lt $fim)) {
    [Win32.Power]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED) | Out-Null
    Start-Sleep -Seconds 30
}
[Win32.Power]::SetThreadExecutionState($ES_CONTINUOUS) | Out-Null
