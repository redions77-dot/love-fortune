@echo off
chcp 65001 >nul
title MySaju TEST server (NoAI, PortOne test channel)
cd /d "%~dp0"
echo [TEST] AI off, in-memory DB, PortOne test channel, mail to temp file only
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backend\dev\start-test-env.ps1" -NoAI
pause
