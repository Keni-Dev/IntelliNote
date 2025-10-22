@echo off
REM Check if a commit message was provided
if "%~1"=="" (
    echo Please provide a commit message.
    echo Example: GitPush.bat "first commit"
    exit /b
)

REM Run Git commands
git add .
git commit -m "%~1"
git push -u origin main
