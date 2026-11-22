# 저장된 포트원 테스트 설정을 "일부만 가린 형태"로 보여 준다(포트원 콘솔의 채널키와 눈으로 대조하기 위한 용도).
# 전체 키·API 시크릿은 출력하지 않는다. 채널키는 앞 18글자("channel-key-" 뒤 6글자 포함)와 뒤 6글자만, 가맹점 코드는 앞 5글자와 뒤 2글자만 보인다.
# 사용: powershell -File backend\dev\portone-config-masked.ps1
$cfgFile = Join-Path $env:LOCALAPPDATA 'mysaju-portone-test\config.dat'
if (-not (Test-Path $cfgFile)) { Write-Output 'NO_CONFIG: run set-portone-test.ps1 first'; exit 2 }
$secure = Get-Content -Path $cfgFile | ConvertTo-SecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $cfg = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) | ConvertFrom-Json }
finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
function Mask($v, $head, $tail) { $s = [string]$v; if ($s.Length -le ($head + $tail)) { return '(너무 짧음)' } return $s.Substring(0, $head) + '…' + $s.Substring($s.Length - $tail) + "  ($($s.Length)자)" }
Write-Output ('가맹점 식별코드(imp):  ' + (Mask $cfg.impCode 5 2))
Write-Output ('테스트 채널키:         ' + (Mask $cfg.channelKey 18 6))
Write-Output ('운영 채널키 차단 목록:  ' + @($cfg.blockedKeys).Count + '개 등록' + $(if (@($cfg.blockedKeys).Count -eq 0) { '  ← 0개면 운영 채널키 실수 방지 장치가 꺼진 상태입니다' } else { '' }))
Write-Output ('API 키/시크릿 저장됨:   ' + [bool]$cfg.apiKey + ' / ' + [bool]$cfg.apiSecret + '  (값은 출력하지 않음)')
