@echo off
echo ===================================================
echo Starting ResearchGPT Backend (FastAPI on Port 8000)
echo ===================================================
start "ResearchGPT Backend" cmd /k ".venv\Scripts\python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo.
echo Waiting 3 seconds for backend to start...
timeout /t 3 >nul

echo.
echo ===================================================
echo Starting ResearchGPT Frontend (React/Vite on Port 3000)
echo ===================================================
set PATH=node_bin\node-v22.12.0-win-x64;%PATH%
cd frontend && npm run dev

pause
