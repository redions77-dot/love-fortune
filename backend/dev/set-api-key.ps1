# 테스트용 Anthropic API 키를 안전하게 저장하는 입력 창.
# - 키는 이 창에서만 입력한다. 명령줄·채팅·파일 인자·로그에 남지 않는다.
# - 저장 위치: %LOCALAPPDATA%\mysaju-test\api-key.dat  (저장소·OneDrive 밖, 현재 Windows 사용자 계정으로만 풀리는 DPAPI 암호화)
# - 이 스크립트는 키를 화면에 표시하거나 출력하지 않는다. 운영 서버(Render)의 설정은 건드리지 않는다.
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$dir = Join-Path $env:LOCALAPPDATA 'mysaju-test'
$file = Join-Path $dir 'api-key.dat'

$form = New-Object System.Windows.Forms.Form
$form.Text = '마이사주 테스트 - API 키 입력'
$form.Size = New-Object System.Drawing.Size(520, 250)
$form.StartPosition = 'CenterScreen'
$form.TopMost = $true
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false

$label = New-Object System.Windows.Forms.Label
$label.Text = "테스트 전용 API 키를 붙여넣고 [저장]을 누르세요.`r`n(입력한 글자는 점으로 가려지며, 채팅이나 기록에 남지 않습니다.)"
$label.Location = New-Object System.Drawing.Point(15, 15)
$label.Size = New-Object System.Drawing.Size(480, 45)
$form.Controls.Add($label)

$box = New-Object System.Windows.Forms.TextBox
$box.UseSystemPasswordChar = $true
$box.Location = New-Object System.Drawing.Point(15, 70)
$box.Size = New-Object System.Drawing.Size(475, 25)
$form.Controls.Add($box)

$status = New-Object System.Windows.Forms.Label
$status.Location = New-Object System.Drawing.Point(15, 110)
$status.Size = New-Object System.Drawing.Size(480, 40)
$form.Controls.Add($status)

$save = New-Object System.Windows.Forms.Button
$save.Text = '저장'
$save.Location = New-Object System.Drawing.Point(300, 165)
$save.Size = New-Object System.Drawing.Size(90, 32)
$form.Controls.Add($save)

$cancel = New-Object System.Windows.Forms.Button
$cancel.Text = '닫기'
$cancel.Location = New-Object System.Drawing.Point(400, 165)
$cancel.Size = New-Object System.Drawing.Size(90, 32)
$cancel.Add_Click({ $box.Clear(); $form.Close() })
$form.Controls.Add($cancel)

$save.Add_Click({
  $v = $box.Text.Trim()
  if ($v.Length -lt 20 -or -not $v.StartsWith('sk-ant-')) {
    $status.ForeColor = [System.Drawing.Color]::Firebrick
    $status.Text = '키 형식이 맞지 않아요. Anthropic API 키는 sk-ant- 로 시작합니다. (값은 저장하지 않았습니다)'
    return
  }
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $secure = ConvertTo-SecureString $v -AsPlainText -Force
  ConvertFrom-SecureString $secure | Set-Content -Path $file -Encoding ASCII
  $v = $null; $secure = $null; $box.Clear()
  $status.ForeColor = [System.Drawing.Color]::DarkGreen
  $status.Text = '저장했어요. 이 창을 닫아도 됩니다. (이 컴퓨터의 현재 Windows 계정에서만 사용됩니다)'
  $save.Enabled = $false
})

# 창이 다른 창 뒤에 숨지 않도록 맨 앞으로 가져온다
Add-Type -Namespace Win -Name Native -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(System.IntPtr h); [DllImport("user32.dll")] public static extern bool ShowWindow(System.IntPtr h, int c);'
$form.ShowInTaskbar = $true
$form.Add_Shown({ [Win.Native]::ShowWindow($form.Handle, 9) | Out-Null; $form.Activate(); [Win.Native]::SetForegroundWindow($form.Handle) | Out-Null; $box.Focus() })
[void]$form.ShowDialog()
