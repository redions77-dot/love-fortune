# 포트원 V1 테스트 결제 조회·취소 점검 (테스트 전용). set-portone-test.ps1 로 저장한 설정을 쓰며, 키·시크릿은 이 프로세스 메모리에서만 쓰고 출력하지 않는다.
#   읽기 전용 조회: powershell -File backend\dev\portone-check.ps1 -MerchantUid success_xxx
#   테스트 결제 전액 취소: powershell -File backend\dev\portone-check.ps1 -MerchantUid success_xxx -Cancel -Yes
param([Parameter(Mandatory = $true)][string]$MerchantUid, [switch]$Cancel, [switch]$Yes)
$cfgFile = Join-Path $env:LOCALAPPDATA 'mysaju-portone-test\config.dat'
if (-not (Test-Path $cfgFile)) { Write-Output 'NO_CONFIG: run set-portone-test.ps1 first'; exit 2 }
$secure = Get-Content -Path $cfgFile | ConvertTo-SecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $cfg = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) | ConvertFrom-Json }
finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
foreach ($n in 'DATABASE_URL', 'NODE_ENV') { Remove-Item "Env:$n" -ErrorAction SilentlyContinue }
$env:MYSAJU_TEST_ENV = '1'
$env:PORTONE_INCLUDE_SANDBOX = 'true'
$env:PORTONE_API_KEY = $cfg.apiKey
$env:PORTONE_API_SECRET = $cfg.apiSecret
$args2 = @((Join-Path $PSScriptRoot 'portone-check.cjs'), $MerchantUid)
if ($Cancel) { $args2 += '--cancel' }
if ($Yes) { $args2 += '--yes' }
& node @args2
$code = $LASTEXITCODE
Remove-Item Env:PORTONE_API_KEY, Env:PORTONE_API_SECRET -ErrorAction SilentlyContinue
exit $code
