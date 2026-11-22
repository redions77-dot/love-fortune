# 포트원 V1 테스트 결제 설정을 안전하게 저장하는 입력 창 (테스트 전용).
# - 값은 이 창에서만 입력한다. 명령줄·채팅·파일 인자·로그에 남지 않고 화면에 출력되지 않는다.
# - 저장 위치: %LOCALAPPDATA%\mysaju-portone-test\config.dat  (저장소·OneDrive 밖, 현재 Windows 사용자 계정으로만 풀리는 DPAPI 암호화)
#   → 운영 서버(Render)·운영 DB·Anthropic 테스트 키 저장소(mysaju-test)와 완전히 별개다.
# - 운영(실연동) 채널 키를 테스트 채널 키 칸에 넣으면 저장을 거부한다(아래 '운영 채널 키' 칸에 운영 키를 함께 적어 두면 비교한다).
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$dir = Join-Path $env:LOCALAPPDATA 'mysaju-portone-test'
$file = Join-Path $dir 'config.dat'

$form = New-Object System.Windows.Forms.Form
$form.Text = '마이사주 테스트 - 포트원 V1 설정'
$form.Size = New-Object System.Drawing.Size(560, 520)
$form.StartPosition = 'CenterScreen'
$form.TopMost = $true
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false

function Add-Field($labelText, $y, $secret) {
  $l = New-Object System.Windows.Forms.Label
  $l.Text = $labelText
  $l.Location = New-Object System.Drawing.Point(15, $y)
  $l.Size = New-Object System.Drawing.Size(520, 20)
  $form.Controls.Add($l)
  $b = New-Object System.Windows.Forms.TextBox
  $b.UseSystemPasswordChar = $secret
  $b.Location = New-Object System.Drawing.Point(15, ($y + 22))
  $b.Size = New-Object System.Drawing.Size(510, 25)
  $form.Controls.Add($b)
  return $b
}

$info = New-Object System.Windows.Forms.Label
$info.Text = "값을 붙여넣고 [저장]을 누르세요. 입력한 글자는 점으로 가려지며 채팅이나 기록에 남지 않아요."
$info.Location = New-Object System.Drawing.Point(15, 10)
$info.Size = New-Object System.Drawing.Size(520, 36)
$form.Controls.Add($info)

$impBox = Add-Field '가맹점 식별코드 (imp 로 시작)' 50 $false
$keyBox = Add-Field 'REST API Key' 105 $true
$secBox = Add-Field 'REST API Secret' 160 $true
$chBox  = Add-Field '테스트 채널 키 (콘솔 채널 관리에서 "테스트" 채널의 키)' 215 $true
$blkBox = Add-Field '운영(실연동) 채널 키 — 선택, 여러 개면 쉼표로 구분 (같은 값이 테스트 칸에 들어오면 막는 용도)' 270 $false

$chk = New-Object System.Windows.Forms.CheckBox
$chk.Text = '위 "테스트 채널 키"는 콘솔에서 테스트 채널로 표시된 행의 키임을 확인했어요.'
$chk.Location = New-Object System.Drawing.Point(15, 335)
$chk.Size = New-Object System.Drawing.Size(520, 40)
$form.Controls.Add($chk)

$status = New-Object System.Windows.Forms.Label
$status.Location = New-Object System.Drawing.Point(15, 385)
$status.Size = New-Object System.Drawing.Size(520, 40)
$form.Controls.Add($status)

$save = New-Object System.Windows.Forms.Button
$save.Text = '저장'
$save.Location = New-Object System.Drawing.Point(15, 435)
$save.Size = New-Object System.Drawing.Size(120, 32)
$form.Controls.Add($save)
$cancel = New-Object System.Windows.Forms.Button
$cancel.Text = '취소'
$cancel.Location = New-Object System.Drawing.Point(145, 435)
$cancel.Size = New-Object System.Drawing.Size(120, 32)
$cancel.Add_Click({ $form.Close() })
$form.Controls.Add($cancel)

$save.Add_Click({
  $imp = $impBox.Text.Trim(); $key = $keyBox.Text.Trim(); $sec = $secBox.Text.Trim(); $ch = $chBox.Text.Trim()
  $blocked = @($blkBox.Text.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  if ($imp -notmatch '^imp[0-9A-Za-z]{6,30}$') { $status.Text = '식별코드 형식이 올바르지 않아요(imp 로 시작).'; return }
  if ($key.Length -lt 8 -or $sec.Length -lt 8) { $status.Text = 'REST API Key/Secret 을 확인해 주세요.'; return }
  if ($ch -notmatch '^[A-Za-z0-9_-]{8,128}$') { $status.Text = '테스트 채널 키 형식이 올바르지 않아요.'; return }
  if ($blocked -contains $ch) { $status.Text = '운영(실연동) 채널 키와 같은 값이에요. 저장하지 않았어요. 테스트 채널의 키를 넣어 주세요.'; return }
  if (-not $chk.Checked) { $status.Text = '테스트 채널 키 확인란에 체크해 주세요.'; return }
  $json = @{ impCode = $imp; apiKey = $key; apiSecret = $sec; channelKey = $ch; blockedKeys = $blocked } | ConvertTo-Json -Compress
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $json | ConvertTo-SecureString -AsPlainText -Force | ConvertFrom-SecureString | Set-Content -Path $file
  $status.Text = '저장했어요. 이 창을 닫아도 돼요. (값은 화면에 표시되지 않아요)'
  $impBox.Clear(); $keyBox.Clear(); $secBox.Clear(); $chBox.Clear(); $blkBox.Clear()
})

[void]$form.ShowDialog()
