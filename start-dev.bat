@echo off
setlocal

set "ROOT=%~dp0"

if not exist "%ROOT%backend\.env" (
    echo [!] backend\.env not found — copy backend\.env.example to backend\.env and fill in DATABASE_URL/JWT_SECRET/etc. first.
    pause
    exit /b 1
)

echo Starting backend (NestJS) and frontend (Angular) in separate windows...

start "steramer.io - backend" cmd /k "cd /d "%ROOT%backend" && npm run start:dev"
start "steramer.io - frontend" cmd /k "cd /d "%ROOT%frontend" && npm start"

echo.
echo Backend:  http://localhost:3000  (Swagger: http://localhost:3000/api/docs)
echo Frontend: http://localhost:4200

endlocal
