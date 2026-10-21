@echo off
cd /d "%~dp0"
set PORT=8080
echo Serving Kanban Workspace at http://localhost:%PORT%
start "" http://localhost:%PORT%
where python >nul 2>nul && (python -m http.server %PORT% & goto :eof)
where npx >nul 2>nul && (npx --yes serve -l %PORT% . & goto :eof)
echo Install Python 3 or Node.js, or just open index.html directly.
pause
