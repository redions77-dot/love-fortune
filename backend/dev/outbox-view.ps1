# 테스트 환경이 "보낸" 메일(실제 발송 아님, 임시 파일 기록)을 목록으로 보고, 각 메일을 HTML 파일로 저장해 브라우저로 열어 볼 수 있게 한다.
# 사용: powershell -File backend\dev\outbox-view.ps1          (목록)
#       powershell -File backend\dev\outbox-view.ps1 -Open 2  (2번 메일을 브라우저로 열기)
param([int]$Open = 0)
$file = Join-Path $env:TEMP 'mysaju-testenv-outbox.jsonl'
if (-not (Test-Path $file)) { Write-Output '아직 보낸 메일이 없습니다.'; exit 0 }
$dir = Join-Path $env:TEMP 'mysaju-outbox-html'; New-Item -ItemType Directory -Force $dir | Out-Null
$i = 0
foreach ($line in Get-Content $file -Encoding UTF8) {
  if (-not $line.Trim()) { continue }
  $i++
  $m = $line | ConvertFrom-Json
  $path = Join-Path $dir ("mail{0}.html" -f $i)
  [IO.File]::WriteAllText($path, $m.html, (New-Object Text.UTF8Encoding($true)))
  Write-Output ("{0}번  받는 사람: {1}  제목: {2}" -f $i, $m.to, $m.subject)
  if ($Open -eq $i) { Start-Process $path }
}
if ($i -eq 0) { Write-Output '아직 보낸 메일이 없습니다.' }
