$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\node_modules\electron")) {
  throw "Electron is not installed. Run: `$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'; pnpm add -D electron"
}

$env:VITE_DEV_SERVER_URL = "http://127.0.0.1:5173"
pnpm exec electron .\electron\main.cjs

