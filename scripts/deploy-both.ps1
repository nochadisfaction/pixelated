# Dual Deployment Script - Deploy to both Vercel and Cloudflare (PowerShell)
param(
    [switch]$Parallel,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host "🚀 Starting dual deployment (Vercel + Cloudflare)..." -ForegroundColor Green

# Function to deploy to Vercel
function Deploy-Vercel {
    Write-Host "📦 Deploying to Vercel (Primary)..." -ForegroundColor Blue
    $env:NODE_ENV = "production"
    $env:VERCEL = "1"
    $env:BUILDING_FOR_VERCEL = "1"
    
    # Build and deploy to Vercel
    pnpm astro build --config astro.config.mjs
    npx vercel --prod
    
    Write-Host "✅ Vercel deployment complete!" -ForegroundColor Green
}

# Function to deploy to Cloudflare
function Deploy-Cloudflare {
    Write-Host "☁️ Deploying to Cloudflare (Backup)..." -ForegroundColor Cyan
    $env:NODE_ENV = "production"
    $env:CLOUDFLARE_BUILD = "1"
    $env:BUILDING_FOR_CLOUDFLARE = "1"
    
    # Clean and rebuild for Cloudflare
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
    if (Test-Path ".astro") { Remove-Item -Recurse -Force ".astro" }
    
    # Build with Cloudflare config
    pnpm astro build --config astro.config.cloudflare.mjs
    npx wrangler pages deploy dist --project-name=pixelated-backup
    
    Write-Host "✅ Cloudflare deployment complete!" -ForegroundColor Green
}

# Execute deployments
if ($Parallel) {
    Write-Host "🔄 Running deployments in parallel..." -ForegroundColor Yellow
    
    # Start Vercel deployment in background
    $vercelJob = Start-Job -ScriptBlock {
        $env:NODE_ENV = "production"
        $env:VERCEL = "1"
        $env:BUILDING_FOR_VERCEL = "1"
        
        Set-Location $using:PWD
        pnpm astro build --config astro.config.mjs
        npx vercel --prod
    }
    
    # Start Cloudflare deployment in background
    $cloudflareJob = Start-Job -ScriptBlock {
        $env:NODE_ENV = "production"
        $env:CLOUDFLARE_BUILD = "1"
        $env:BUILDING_FOR_CLOUDFLARE = "1"
        
        Set-Location $using:PWD
        if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
        if (Test-Path ".astro") { Remove-Item -Recurse -Force ".astro" }
        
        pnpm astro build --config astro.config.cloudflare.mjs
        npx wrangler pages deploy dist --project-name=pixelated-backup
    }
    
    # Wait for both jobs to complete
    Write-Host "⏳ Waiting for deployments to complete..." -ForegroundColor Yellow
    $vercelJob, $cloudflareJob | Wait-Job
    
    # Check results
    $vercelResult = Receive-Job $vercelJob
    $cloudflareResult = Receive-Job $cloudflareJob
    
    # Clean up jobs
    Remove-Job $vercelJob, $cloudflareJob
    
    if ($vercelJob.State -eq "Completed" -and $cloudflareJob.State -eq "Completed") {
        Write-Host "🎉 Both deployments completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ One or more deployments failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "🔄 Running deployments sequentially..." -ForegroundColor Yellow
    Deploy-Vercel
    Deploy-Cloudflare
    Write-Host "🎉 Both deployments completed successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🌐 Deployment URLs:" -ForegroundColor Magenta
Write-Host "Primary (Vercel): https://pixelatedempathy.com" -ForegroundColor White
Write-Host "Backup (Cloudflare): https://pixelated-backup.pages.dev" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Management:" -ForegroundColor Magenta
Write-Host "Vercel Dashboard: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "Cloudflare Dashboard: https://dash.cloudflare.com/" -ForegroundColor White 