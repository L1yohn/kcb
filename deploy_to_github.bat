@echo off
chcp 65001 > nul
title GitHub Pages 部署助手
echo ========================================================
echo          🚀 课程表 GitHub Pages 一键推送助手
echo ========================================================
echo.
echo 请先在 GitHub (https://github.com/new) 上创建一个新仓库 (例如: kcb)
echo 然后将仓库地址粘贴在下方:
echo.
set /p repo_url=请输入 GitHub 仓库地址 (如 https://github.com/用户名/kcb.git): 

if "%repo_url%"=="" (
    echo [提示] 未输入地址，已取消操作。
    pause
    exit /b
)

echo.
echo [1/3] 配置 Git 远程仓库...
git remote remove origin > nul 2>&1
git remote add origin %repo_url%

echo [2/3] 确认主分支为 main...
git branch -M main

echo [3/3] 正在推送到 GitHub...
git push -u origin main

echo.
echo ========================================================
echo  🎉 推送成功！
echo  
echo  👉 GitHub Pages 自动部署流程：
echo     1. GitHub Actions 已配置自动部署。
echo     2. 您也可以在 GitHub 仓库中点击:
echo        Settings -^> Pages -^> Build and deployment
echo        Source 选择 "GitHub Actions" (或 "Deploy from a branch" / main)
echo     3. 约 1 分钟后，即可通过公网网址在手机随时随地访问！
echo ========================================================
pause
