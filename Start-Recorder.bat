@echo off
setlocal ENABLEDELAYEDEXPANSION
title Discord Recorder — Start
cd /d "%~dp0"

REM --- sanity checks ---
if not exist package.json (
  echo [ERROR] Please place this file in your bot folder (the one with package.json).
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo Install Node 22+ and reopen this window.
  pause
  exit /b 1
)

REM --- create .env from example if missing (one-time help) ---
if not exist ".env" (
  if exist ".env.example" (
    echo Creating .env from .env.example...
    copy /Y ".env.example" ".env" >nul
    echo [NOTE] Open .env and fill DISCORD_TOKEN and CLIENT_ID (and optional GUILD_ID).
    echo Press any key to continue if you have already filled it...
    pause >nul
  )
)

REM --- install deps first time only ---
if not exist "node_modules" (
  echo Installing dependencies (first run only)...
  npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo Starting bot...
npm start
set EXITCODE=%errorlevel%
echo.
echo Bot exited with code %EXITCODE%.
pause
