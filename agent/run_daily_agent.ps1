# Daily study agent — runs at 6am via Windows Task Scheduler
# Requires: Claude Code CLI in PATH, backend running on localhost:8000

$root = "C:\Users\joaog\PycharmProjects\study-plataform"
$logDir = "$root\agent\logs"
$logFile = "$logDir\$(Get-Date -Format 'yyyy-MM-dd').log"
$promptFile = "$root\agent\daily_prompt.md"

if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

"=== Daily agent started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Tee-Object -FilePath $logFile -Append

Set-Location $root

# Check backend is up before running
try {
    Invoke-RestMethod -Uri "http://localhost:8000/" -TimeoutSec 5 -ErrorAction Stop | Out-Null
} catch {
    "ERROR: Backend not responding on localhost:8000. Aborting." | Tee-Object -FilePath $logFile -Append
    exit 1
}

# Run the agent with the daily prompt (non-interactive)
Get-Content $promptFile -Raw | claude --print 2>&1 | Tee-Object -FilePath $logFile -Append

"=== Daily agent finished: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Tee-Object -FilePath $logFile -Append
