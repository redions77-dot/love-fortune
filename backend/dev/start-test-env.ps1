# 포트원 V1 테스트 결제 환경을 한 번에 실행한다 (로컬 전용).
#   백엔드: 임시(메모리) DB 위의 실제 server.js, 포트 4000  /  프런트: Vite 개발 서버, 포트 5173
#   사용: powershell -File backend\dev\start-test-env.ps1 [-Lan] [-NoAI]
#     -Lan  : 같은 Wi-Fi 의 휴대폰에서 접속할 수 있게 한다(http://<이 PC 주소>:5173)
#     -NoAI : Anthropic 테스트 키를 넣지 않는다(AI 분석은 실패한다. 결제 화면만 확인할 때)
# - 설정은 set-portone-test.ps1 로 저장한 값만 쓴다. 키·시크릿은 이 프로세스의 메모리에서만 쓰이고 출력·기록하지 않는다.
# - 운영 DB(DATABASE_URL)·운영 서버 주소와 연결하지 않는다. 운영 채널 키가 테스트 채널 키 자리에 있으면 실행을 막는다.
param([switch]$Lan, [switch]$NoAI)

$cfgFile = Join-Path $env:LOCALAPPDATA 'mysaju-portone-test\config.dat'
if (-not (Test-Path $cfgFile)) { Write-Output 'NO_CONFIG: run set-portone-test.ps1 first'; exit 2 }

$secure = Get-Content -Path $cfgFile | ConvertTo-SecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $cfg = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) | ConvertFrom-Json }
finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }

# 보호 검사: 테스트 채널 키 형식, 운영 채널 키와의 일치 여부
$blocked = @($cfg.blockedKeys)
if ($cfg.channelKey -notmatch '^[A-Za-z0-9_-]{8,128}$') { Write-Output 'BLOCKED: test channel key format is invalid'; exit 3 }
if ($blocked -contains $cfg.channelKey) { Write-Output 'BLOCKED: the test channel key equals a production(live) channel key'; exit 3 }
if ($cfg.impCode -notmatch '^imp') { Write-Output 'BLOCKED: merchant code format is invalid'; exit 3 }

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

# 테스트 백엔드 환경: 운영 DB·운영 서버 설정은 모두 지운다
foreach ($n in 'DATABASE_URL', 'DATABASE_SSL', 'ANTHROPIC_BASE_URL', 'NODE_ENV', 'EXTRA_ALLOWED_ORIGINS') { Remove-Item "Env:$n" -ErrorAction SilentlyContinue }
$env:MYSAJU_TEST_ENV = '1'
$env:SUCCESS_CHILD_ENABLED = '1'   # 우리 아이 성공사주 주문·결제·실패 안내·환불 흐름을 테스트하기 위한 테스트 환경 전용 설정(운영 설정과 무관)
$env:PORTONE_INCLUDE_SANDBOX = 'true'
$env:PORTONE_API_KEY = $cfg.apiKey
$env:PORTONE_API_SECRET = $cfg.apiSecret
$env:PORT = '4000'
$env:EMAIL_TRANSPORT = 'test'
$env:EMAIL_TEST_OUTBOX = Join-Path $env:TEMP 'mysaju-testenv-outbox.jsonl'
$env:DISABLE_AI_RETRIES = '1'
$env:ADMIN_TOKEN = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })   # 매 실행 임의 값, 어디에도 저장·출력하지 않음
if (-not $NoAI) {
  $aiFile = Join-Path $env:LOCALAPPDATA 'mysaju-test\api-key.dat'
  if (-not (Test-Path $aiFile)) { Write-Output 'NO_AI_KEY: run set-api-key.ps1 or use -NoAI'; exit 2 }
  $s2 = Get-Content -Path $aiFile | ConvertTo-SecureString
  $b2 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($s2)
  try { $env:ANTHROPIC_API_KEY = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($b2) }
  finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b2) }
} else { $env:ANTHROPIC_API_KEY = 'no-ai-test-run' }

$pglite = Join-Path $env:LOCALAPPDATA 'mysaju-preview\node_modules\@electric-sql\pglite\dist\index.js'
if (-not (Test-Path $pglite)) { Write-Output 'NO_PGLITE: install @electric-sql/pglite in %LOCALAPPDATA%\mysaju-preview (outside the repo)'; exit 2 }
$env:PGLITE_PATH = ([System.Uri]$pglite).AbsoluteUri

$log = Join-Path $env:TEMP 'mysaju-testenv-backend.log'
$proc = Start-Process -FilePath 'node' -ArgumentList 'dev/isolated-backend.mjs' -WorkingDirectory $backend -RedirectStandardOutput $log -RedirectStandardError ($log + '.err') -PassThru -WindowStyle Hidden

# 프런트 환경(테스트 전용). 운영 도메인에서는 channelKey 가 무시되므로 이 값들은 localhost/LAN 주소에서만 쓰인다.
$env:VITE_IMP_CODE = $cfg.impCode
$env:VITE_IMP_CHANNEL_KEY = $cfg.channelKey
$env:VITE_IMP_BLOCKED_CHANNEL_KEYS = ($blocked -join ',')
Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue   # 같은 출처 요청 → Vite 프록시 → localhost:4000

$ok = $false
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Milliseconds 500
  try { if ((Invoke-WebRequest -Uri 'http://127.0.0.1:4000/ping' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) { $ok = $true; break } } catch { }
  if ($proc.HasExited) { break }
}
if (-not $ok) { Write-Output "BACKEND_FAILED: see $log and $log.err"; if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }; exit 1 }

Write-Output "Test backend up (in-memory DB). Log: $log"
Write-Output 'Frontend: http://localhost:5173  (Ctrl+C to stop both)'
try {
  Set-Location $frontend
  $viteArgs = @('vite', '--port', '5173')
  if ($Lan) { $viteArgs += '--host' }
  & npx.cmd @viteArgs
} finally {
  if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
}
