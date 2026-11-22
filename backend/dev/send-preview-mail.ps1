# 가상 아이 결과지 메일을 내 Gmail/네이버 주소로 보내 휴대전화 메일 앱에서 글씨 크기를 확인한다(테스트 전용).
# - 보내는 Gmail 계정과 앱 비밀번호는 이 입력 창에서만 받고 화면·파일·로그에 남기지 않습니다(이 실행 동안 메모리에만 존재).
# - 앱 비밀번호: Google 계정 > 보안 > 2단계 인증 > 앱 비밀번호(16자리). 일반 로그인 비밀번호가 아닙니다.
# 사용: powershell -File backend\dev\send-preview-mail.ps1
param([string]$HtmlFile = 'C:\Users\redio\OneDrive\Desktop\마이사주 디자인 확인\성공사주_전체생성_최종시험_2026-11-14\3_혼합형(C)\결과지_디자인화면(모바일 가독성 적용).html')
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
if (-not (Test-Path $HtmlFile)) { Write-Output "NO_HTML: $HtmlFile"; exit 2 }
$form = New-Object System.Windows.Forms.Form
$form.Text = '메일 글씨 크기 테스트 발송'; $form.Size = New-Object System.Drawing.Size(520, 330); $form.StartPosition = 'CenterScreen'; $form.TopMost = $true; $form.FormBorderStyle = 'FixedDialog'; $form.MaximizeBox = $false
function Add-Field($t, $y, $secret) {
  $l = New-Object System.Windows.Forms.Label; $l.Text = $t; $l.Location = New-Object System.Drawing.Point(15, $y); $l.Size = New-Object System.Drawing.Size(480, 20); $form.Controls.Add($l)
  $b = New-Object System.Windows.Forms.TextBox; $b.UseSystemPasswordChar = $secret; $b.Location = New-Object System.Drawing.Point(15, ($y + 22)); $b.Size = New-Object System.Drawing.Size(470, 25); $form.Controls.Add($b); return $b
}
$user = Add-Field '보내는 Gmail 주소' 15 $false
$pass = Add-Field 'Gmail 앱 비밀번호(16자리, 화면에 표시되지 않음)' 75 $true
$to = Add-Field '받는 주소(내 Gmail, 네이버 주소를 쉼표로 구분)' 135 $false
$ok = New-Object System.Windows.Forms.Button; $ok.Text = '보내기'; $ok.Location = New-Object System.Drawing.Point(15, 215); $ok.Size = New-Object System.Drawing.Size(120, 34); $ok.DialogResult = 'OK'; $form.Controls.Add($ok); $form.AcceptButton = $ok
if ($form.ShowDialog() -ne 'OK') { Write-Output 'CANCELLED'; exit 1 }
if (-not $user.Text -or -not $pass.Text -or -not $to.Text) { Write-Output 'EMPTY'; exit 2 }
$env:PREVIEW_MAIL_USER = $user.Text.Trim(); $env:PREVIEW_MAIL_PASS = ($pass.Text -replace '\s', ''); $env:PREVIEW_MAIL_TO = $to.Text.Trim(); $env:PREVIEW_MAIL_HTML = $HtmlFile
Set-Location (Join-Path (Split-Path -Parent $PSScriptRoot) '.')
& node (Join-Path $PSScriptRoot 'send-preview-mail.cjs')
$code = $LASTEXITCODE
Remove-Item Env:PREVIEW_MAIL_USER, Env:PREVIEW_MAIL_PASS, Env:PREVIEW_MAIL_TO, Env:PREVIEW_MAIL_HTML -ErrorAction SilentlyContinue
exit $code
