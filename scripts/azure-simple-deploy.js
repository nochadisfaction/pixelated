#!/usr/bin/env node

/**
 * Simplified Azure Deployment Script
 * 
 * Uses the regular build process and deploys to Azure Static Web Apps
 */

import { execSync } from 'node:child_process';

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  
  console.log(`${colors[type]}[${type.toUpperCase()}]${colors.reset} ${message}`);
}

function executeCommand(command, description) {
  log(`${description}...`, 'info');
  try {
    execSync(command, { 
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    log(`✅ ${description} completed`, 'success');
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'error');
    throw error;
  }
}

async function main() {
  try {
    log('🚀 Starting Azure deployment...', 'info');
    
    // Use the regular build process (without bias-detection)
    executeCommand('pnpm run build', 'Building project');
    
    // Check if SWA CLI is installed
    try {
      execSync('swa --version', { stdio: 'ignore' });
    } catch {
      log('Installing Azure Static Web Apps CLI...', 'info');
      executeCommand('npm install -g @azure/static-web-apps-cli', 'Installing SWA CLI');
    }
    
    // Deploy to Azure
    executeCommand(
      'swa deploy ./dist --env production',
      'Deploying to Azure Static Web Apps'
    );
    
    log('🎉 Deployment completed successfully!', 'success');
    log('Your app should be available at your Azure Static Web Apps URL', 'info');
    
  } catch (error) {
    log(`Deployment failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

main(); 