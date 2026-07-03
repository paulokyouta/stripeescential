@echo off
start "Backend" cmd /k "cd /d "%~dp0app\backend" && python backend.py"
start "Frontend (watch)" cmd /k "cd /d "%~dp0app\frontend" && call npm run build:css && node node_modules/webpack-cli/bin/cli.js --mode development --watch"
