# 저장된 테스트 키로 로컬 백엔드(포트 4000)를 실행한다. 키는 이 프로세스의 메모리에서만 쓰이며 출력·기록하지 않는다.
# DB(DATABASE_URL)와 예시 서버 주소(ANTHROPIC_BASE_URL)는 지우고 시작하므로 운영 DB·운영 서버와 연결되지 않는다.
$file = Join-Path $env:LOCALAPPDATA 'mysaju-test\api-key.dat'
if (-not (Test-Path $file)) { Write-Output 'NO_KEY_FILE'; exit 2 }

$secure = Get-Content -Path $file | ConvertTo-SecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $env:ANTHROPIC_API_KEY = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }

Remove-Item Env:ANTHROPIC_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
$env:PORT = '4000'
$env:DISABLE_AI_RETRIES = '1'   # 품질 테스트: SDK·앱 자동 재시도 모두 끔 (운영 설정 아님)

$backend = Split-Path -Parent $PSScriptRoot
$log = Join-Path $env:TEMP 'mysaju-real-backend.log'
Set-Location $backend
node server.js *> $log
