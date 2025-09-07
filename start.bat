@echo off
echo Starting QCM Prisma Backend...
echo.

echo Installing dependencies...
call npm install

echo.
echo Generating Prisma client...
call npx prisma generate

echo.
echo Starting development server...
call npm run dev
