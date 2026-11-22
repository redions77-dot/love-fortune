# 무료 체험 코드 발급·조회(운영자 전용). 관리자 토큰은 입력 창에서만 받고 화면·파일·로그에 남기지 않습니다.
# 사용:
#   powershell -File backend\dev\trial-codes.ps1 -Action issue -Count 5 -Label 후기체험 [-Days 30]
#   powershell -File backend\dev\trial-codes.ps1 -Action summary
#   powershell -File backend\dev\trial-codes.ps1 -Action list [-Label 후기체험]
# 기본 대상은 운영 사이트(https://www.mysaju.shop)입니다. 로컬 테스트: -ApiBase http://localhost:5173 -Origin http://localhost:5173
param(
  [Parameter(Mandatory = $true)][ValidateSet('issue', 'summary', 'list')][string]$Action,
  [int]$Count = 1, [string]$Label = '', [int]$Days = 30,
  [string]$ApiBase = 'https://www.mysaju.shop', [string]$Origin = 'https://www.mysaju.shop'
)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$form = New-Object System.Windows.Forms.Form
$form.Text = '관리자 확인'; $form.Size = New-Object System.Drawing.Size(460, 190); $form.StartPosition = 'CenterScreen'; $form.TopMost = $true; $form.FormBorderStyle = 'FixedDialog'; $form.MaximizeBox = $false
$l = New-Object System.Windows.Forms.Label; $l.Text = "관리자 토큰 ($ApiBase)"; $l.Location = New-Object System.Drawing.Point(15, 15); $l.Size = New-Object System.Drawing.Size(420, 20); $form.Controls.Add($l)
$b = New-Object System.Windows.Forms.TextBox; $b.UseSystemPasswordChar = $true; $b.Location = New-Object System.Drawing.Point(15, 40); $b.Size = New-Object System.Drawing.Size(410, 25); $form.Controls.Add($b)
$ok = New-Object System.Windows.Forms.Button; $ok.Text = '확인'; $ok.Location = New-Object System.Drawing.Point(15, 90); $ok.Size = New-Object System.Drawing.Size(100, 32); $ok.DialogResult = 'OK'; $form.Controls.Add($ok); $form.AcceptButton = $ok
if ($form.ShowDialog() -ne 'OK' -or -not $b.Text) { Write-Output 'CANCELLED'; exit 1 }
$env:TRIAL_ADMIN_TOKEN = $b.Text.Trim(); $env:TRIAL_API_BASE = $ApiBase; $env:TRIAL_ORIGIN = $Origin
Set-Location (Join-Path (Split-Path -Parent $PSScriptRoot) '.')
$args2 = @((Join-Path $PSScriptRoot 'trial-codes.cjs'), $Action)
if ($Action -eq 'issue') { $args2 += @([string]$Count, $Label, [string]$Days) } elseif ($Action -eq 'list' -and $Label) { $args2 += $Label }
& node @args2
$code = $LASTEXITCODE
Remove-Item Env:TRIAL_ADMIN_TOKEN, Env:TRIAL_API_BASE, Env:TRIAL_ORIGIN -ErrorAction SilentlyContinue
exit $code
