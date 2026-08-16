@echo off
cd /d %~dp0
if not exist node_modules (
  echo 初回セットアップ中です。少々お待ちください...
  call npm install
)
echo.
node server.js
pause
