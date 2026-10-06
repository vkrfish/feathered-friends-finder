@echo off
echo ============================================================
echo Running UltraLearn Backend Integration Tests...
echo ============================================================
echo.

:: Ensure python is installed and in PATH
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in your PATH. Please install Python 3.
    pause
    exit /b 1
)

:: Run the tests
python -m unittest tests/test_backend.py

echo.
echo ============================================================
echo Tests Completed!
echo ============================================================
pause
