#!/bin/bash

# Dual Deployment Script - Deploy to both Vercel and Cloudflare
set -e

echo "🚀 Starting dual deployment (Vercel + Cloudflare)..."

# Function to deploy to Vercel
deploy_vercel() {
    echo "📦 Deploying to Vercel (Primary)..."
    export NODE_ENV=production
    export VERCEL=1
    export BUILDING_FOR_VERCEL=1
    
    # Build and deploy to Vercel
    pnpm astro build --config astro.config.mjs
    npx vercel --prod
    
    echo "✅ Vercel deployment complete!"
}

# Function to deploy to Cloudflare
deploy_cloudflare() {
    echo "☁️ Deploying to Cloudflare (Backup)..."
    export NODE_ENV=production
    export CLOUDFLARE_BUILD=1
    export BUILDING_FOR_CLOUDFLARE=1
    
    # Clean and rebuild for Cloudflare
    rm -rf dist
    rm -rf .astro
    
    # Build with Cloudflare config
    pnpm astro build --config astro.config.cloudflare.mjs
    npx wrangler pages deploy dist --project-name=pixelated-backup
    
    echo "✅ Cloudflare deployment complete!"
}

# Check if running in parallel mode
if [ "$1" = "--parallel" ]; then
    echo "🔄 Running deployments in parallel..."
    deploy_vercel &
    VERCEL_PID=$!
    
    deploy_cloudflare &
    CLOUDFLARE_PID=$!
    
    # Wait for both deployments
    wait $VERCEL_PID
    VERCEL_EXIT=$?
    
    wait $CLOUDFLARE_PID
    CLOUDFLARE_EXIT=$?
    
    if [ $VERCEL_EXIT -eq 0 ] && [ $CLOUDFLARE_EXIT -eq 0 ]; then
        echo "🎉 Both deployments completed successfully!"
    else
        echo "❌ One or more deployments failed"
        exit 1
    fi
else
    echo "🔄 Running deployments sequentially..."
    deploy_vercel
    deploy_cloudflare
    echo "🎉 Both deployments completed successfully!"
fi

echo ""
echo "🌐 Deployment URLs:"
echo "Primary (Vercel): https://pixelatedempathy.com"
echo "Backup (Cloudflare): https://pixelated-backup.pages.dev"
echo ""
echo "🔧 Management:"
echo "Vercel Dashboard: https://vercel.com/dashboard"
echo "Cloudflare Dashboard: https://dash.cloudflare.com/" 