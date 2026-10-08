$ErrorActionPreference = 'Stop'
$hymobilierRoot = $PSScriptRoot
$hymobilierNode = 'C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
try {
    $hymobilierResponse = Invoke-WebRequest -Uri 'http://127.0.0.1:4323/' -TimeoutSec 3
    if ($hymobilierResponse.StatusCode -eq 200 -and $hymobilierResponse.Content -match 'HY Mobilier') {
        Write-Output 'Preview is already running: http://127.0.0.1:4323/'
        exit 0
    }
} catch {}
Start-Process -FilePath $hymobilierNode -ArgumentList @('scripts/serve.mjs') -WorkingDirectory $hymobilierRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $hymobilierRoot 'preview-output.log') -RedirectStandardError (Join-Path $hymobilierRoot 'preview-errors.log')
Write-Output 'Preview started: http://127.0.0.1:4323/'
