@echo off
cd /d "%~dp0"
echo 🚀 Deployando rotina para Cloudflare Pages...
call npx wrangler@latest pages deploy . --project-name=rotina --branch=main
echo.
echo ✅ Deploy concluído! Acesse: https://rotina-2e1.pages.dev
pause