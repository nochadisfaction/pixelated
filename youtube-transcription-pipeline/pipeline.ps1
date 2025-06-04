# PowerShell script to run pipeline with faster-whisper
# Avoids all recursion issues

Write-Host "🚀 Running YouTube transcription pipeline with faster-whisper" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

# Check requirements
if (-not (Test-Path "pipeline.sh")) {
    Write-Host "❌ Error: pipeline.sh not found" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "whisper_wrapper.py")) {
    Write-Host "❌ Error: whisper_wrapper.py not found" -ForegroundColor Red
    Write-Host "💡 Run: bash integrate_faster_whisper.sh first" -ForegroundColor Yellow
    exit 1
}

# Test faster-whisper availability
try {
    python -c "import faster_whisper; print('✅ faster-whisper is available')" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "📦 Installing faster-whisper..." -ForegroundColor Yellow
        python -m pip install faster-whisper
    }
} catch {
    Write-Host "📦 Installing faster-whisper..." -ForegroundColor Yellow
    python -m pip install faster-whisper
}

# Create temporary whisper script
$tempDir = New-TemporaryFile | %{ Remove-Item $_; New-Item -ItemType Directory -Path $_ }
$whisperScript = Join-Path $tempDir "whisper.bat"

# Create batch file that calls our wrapper
@"
@echo off
python "%~dp0\..\whisper_wrapper.py" %*
"@ | Out-File -FilePath $whisperScript -Encoding ASCII

Write-Host "✅ Faster-whisper integration active" -ForegroundColor Green
Write-Host "🔄 Starting pipeline..." -ForegroundColor Cyan
Write-Host ""

# Run pipeline with our whisper replacement in PATH
$originalPath = $env:PATH
$env:PATH = "$tempDir;$originalPath"

try {
    # Run the pipeline
    if ($args.Count -gt 0) {
        bash pipeline.sh @args
    } else {
        bash pipeline.sh
    }
    $result = $LASTEXITCODE
} finally {
    # Restore PATH and cleanup
    $env:PATH = $originalPath
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
if ($result -eq 0) {
    Write-Host "🎉 Pipeline completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Pipeline failed with exit code: $result" -ForegroundColor Red
}

exit $result 