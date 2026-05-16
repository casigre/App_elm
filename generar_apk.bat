@echo off
setlocal
echo ===========================================
echo   LIMPIEZA Y REPARACION - ELM327 K9K
echo ===========================================
echo.
echo 1. Instalando dependencias y construyendo web assets...
call npm.cmd install
call npm.cmd run build

echo.
echo 2. Cerrando procesos en segundo plano...
taskkill /F /IM java.exe /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
echo.

echo 3. Forzando eliminacion de carpeta Android (Limpieza Profunda)...
echo Si este paso falla, es porque una carpeta o programa (como Android Studio) la esta usando.
timeout /t 2 >nul
rd /s /q "android" >nul 2>&1

if exist "android" (
    echo.
    echo [ADVERTENCIA] No se pudo borrar la carpeta 'android' completamente.
    echo Esto suele ocurrir si tienes Android Studio abierto o la carpeta abierta en el explorador.
    echo.
    pause
    rd /s /q "android" >nul 2>&1
    if exist "android" (
        echo [ERROR] No se pudo eliminar android/. Aborta.
        pause
        exit /b 1
    )
)

echo.
echo 4. Inicializando Android de nuevo...
call npx.cmd cap add android
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al anadir plataforma Android.
    pause
    exit /b 1
)

echo.
echo 5. Sincronizando archivos...
call npx.cmd cap sync
if %errorlevel% neq 0 (
    echo [ERROR] Fallo en la sincronizacion.
    pause
    exit /b 1
)

echo.
echo 6. Aplicando configuraciones de build (SDK, Java 17)...
call node fix_android_build.js
if %errorlevel% neq 0 (
    echo [ERROR] Fallo en fix_android_build.js.
    pause
    exit /b 1
)

echo.
echo 7. Injectando permisos Bluetooth...
call node fix_android_permissions.js
if %errorlevel% neq 0 (
    echo [ERROR] Fallo en fix_android_permissions.js.
    pause
    exit /b 1
)

echo.
echo 8. Compilando APK final...
cd android
call ./gradlew assembleDebug

if %errorlevel% neq 0 (
    echo [ERROR] Fallo al compilar el APK.
    pause
    exit /b
)

echo.
echo ===========================================
echo   APK GENERADO CON EXITO
echo ===========================================
echo El archivo esta en: 
echo elm327\android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
