#!/bin/bash

echo "🚀 Quick Azure Deployment (bypassing MDX issues)"

# Create backup directory
mkdir -p .temp-backup

# Move problematic docs files temporarily
echo "📦 Backing up problematic docs files..."
if [ -d "src/content/docs" ]; then
    mv src/content/docs .temp-backup/docs-backup
    echo "✅ Docs files backed up"
fi

# Create minimal docs directory to prevent build errors
mkdir -p src/content/docs
echo '---
title: "Documentation"
description: "Documentation is temporarily unavailable during deployment"
---

# Documentation

Documentation is being updated and will be available shortly.
' > src/content/docs/index.md

echo "🏗️  Building project..."
pnpm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Check if SWA CLI is installed
    if ! command -v swa &> /dev/null; then
        echo "📦 Installing Azure Static Web Apps CLI..."
        npm install -g @azure/static-web-apps-cli
    fi
    
    echo "🚀 Deploying to Azure..."
    swa deploy ./dist --env production
    
    if [ $? -eq 0 ]; then
        echo "🎉 Deployment successful!"
    else
        echo "❌ Deployment failed"
    fi
else
    echo "❌ Build failed"
fi

# Restore docs files
echo "🔄 Restoring docs files..."
rm -rf src/content/docs
if [ -d ".temp-backup/docs-backup" ]; then
    mv .temp-backup/docs-backup src/content/docs
    echo "✅ Docs files restored"
fi

# Clean up
rm -rf .temp-backup

echo "✨ Quick deployment complete!" 