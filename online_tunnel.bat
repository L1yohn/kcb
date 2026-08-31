@echo off
chcp 65001 > nul
title 课程表公网临时穿透访问
echo ========================================================
echo        🚀 正在生成手机公网访问临时网址 (无需同一Wi-Fi)...
echo ========================================================
echo.
echo 正在启动本地服务...
start /b node server.js > nul 2>&1
timeout /t 2 > nul

echo 正在通过 Cloudflare / LocalTunnel 建立免费公网通道...
echo 请稍候几秒钟...
echo.
npx localtunnel --port 8080
pause
