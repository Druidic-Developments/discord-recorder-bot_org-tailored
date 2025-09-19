<# start-app.ps1
   Purpose: Set EP (session only) -> npm run register -> npm start
#>

# Work from the script's folder (project root)
Set-Location -Path $PSScriptRoot

# 1) Allow scripts in THIS PowerShell session only
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

# 2) Ensure npm exists
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm not found in PATH. Install Node.js (includes npm), then reopen PowerShell."
  exit 1
}

# (Optional) Install dependencies if node_modules is missing
if (-not (Test-Path -LiteralPath (Join-Path $PWD "node_modules"))) {
  Write-Host "node_modules not found. Running 'npm ci'..."
  npm ci
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# 3) Run your register script
npm run register
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 4) Start the app
npm start
exit $LASTEXITCODE
