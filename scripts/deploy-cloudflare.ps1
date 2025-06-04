# Cloudflare Backup Deployment Script (PowerShell)
param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host "🚀 Starting Cloudflare backup deployment..." -ForegroundColor Green

# Set environment variables for Cloudflare build
$env:NODE_ENV = "production"
$env:CLOUDFLARE_BUILD = "1"
$env:BUILDING_FOR_CLOUDFLARE = "1"

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path ".astro") { Remove-Item -Recurse -Force ".astro" }

# Install dependencies if needed
Write-Host "📦 Checking dependencies..." -ForegroundColor Blue
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Blue
    pnpm install
}

# Build for Cloudflare using the specific config
Write-Host "🔨 Building for Cloudflare..." -ForegroundColor Magenta
pnpm astro build --config astro.config.cloudflare.mjs

# Deploy to Cloudflare Pages
Write-Host "☁️ Deploying to Cloudflare Pages..." -ForegroundColor Cyan
npx wrangler pages deploy dist --project-name=pixelated-backup

Write-Host "✅ Cloudflare backup deployment complete!" -ForegroundColor Green
Write-Host "🔗 Your backup site will be available at: https://pixelated-backup.pages.dev" -ForegroundColor Green
Write-Host "📊 Check deployment status: https://dash.cloudflare.com/" -ForegroundColor Green 