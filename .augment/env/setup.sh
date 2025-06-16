#!/bin/bash
set -e

echo "🚀 Setting up Pixelated Empathy development environment..."

# Set shell environment variable
export SHELL=/bin/bash

# Update system packages
sudo apt-get update -qq

# Install Node.js 22.x
echo "📦 Installing Node.js 22.x..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm using npm with sudo to avoid permission issues
echo "📦 Installing pnpm..."
sudo npm install -g pnpm@10.12.1

# Verify installations
echo "✅ Verifying installations..."
node --version
npm --version
pnpm --version

# Navigate to workspace
cd /mnt/persist/workspace

# Install project dependencies
echo "📦 Installing project dependencies..."
pnpm install --frozen-lockfile

# Install Playwright browsers for E2E tests
echo "🎭 Installing Playwright browsers..."
pnpm exec playwright install --with-deps

# Build the project to ensure everything is working
echo "🔨 Building the project..."
pnpm build

# Add executables to PATH
echo "🔧 Adding executables to PATH..."
echo 'export PATH="/usr/local/bin:$PATH"' >> $HOME/.profile

# Source the profile to make PATH changes available
source $HOME/.profile

echo "✅ Setup complete! Environment is ready for testing."