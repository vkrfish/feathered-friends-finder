@echo off
echo Starting UltraLearn Backend Servers...
echo.

:: Start Node.js API Gateway in a new window
start "UltraLearn Node Gateway (port 3001)" cmd /k "cd /d "c:\Users\vkr10\Downloads\learn x\feathered-friends-finder\backend-node" && npm start"

:: Wait 2 seconds, then start FastAPI
timeout /t 2 /nobreak > nul

:: Start FastAPI RAG Service in a new window
start "UltraLearn FastAPI RAG (port 8000)" cmd /k "cd /d "c:\Users\vkr10\Downloads\learn x\feathered-friends-finder\backend-fastapi" && python main.py"

echo.
echo Both backend servers are starting in separate windows.
echo - Node.js Gateway: http://localhost:3001
echo - FastAPI RAG:      http://localhost:8000
echo.
echo You can now run "npm run dev" to start the frontend.
pause
