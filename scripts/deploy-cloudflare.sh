#!/bin/bash

# Cloudflare Backup Deployment Script
set -e

echo "🚀 Starting Cloudflare backup deployment..."

# Set environment variables for Cloudflare build
export NODE_ENV=production
export CLOUDFLARE_BUILD=1
export BUILDING_FOR_CLOUDFLARE=1

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf .astro

# Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

# Build for Cloudflare using the specific config
echo "🔨 Building for Cloudflare..."
pnpm astro build --config astro.config.cloudflare.mjs

# Deploy to Cloudflare Pages
echo "☁️ Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=pixelated-backup

echo "✅ Cloudflare backup deployment complete!"
echo "🔗 Your backup site will be available at: https://pixelated-backup.pages.dev"
echo "📊 Check deployment status: https://dash.cloudflare.com/" 