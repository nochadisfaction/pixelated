#!/usr/bin/env node

/**
 * Minimal Azure Deployment Script
 * Simple approach for testing deployment
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
    return true;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'error');
    return false;
  }
}

async function main() {
  try {
    log('🚀 Minimal Azure Deployment', 'info');
    
    // Simple build with minimal config
    const buildSuccess = executeCommand(
      'cross-env NODE_OPTIONS="--max-old-space-size=6144" astro build --config astro.config.azure-minimal.mjs', 
      'Building with minimal Azure config'
    );
    
    if (buildSuccess) {
      log('🎉 Build successful! Ready for Azure deployment', 'success');
      log('Next step: Deploy the ./dist folder to Azure Static Web Apps', 'info');
      log('You can use the Azure portal or CLI to upload the dist folder', 'info');
    } else {
      log('Build failed. Check the errors above.', 'error');
    }
    
  } catch (error) {
    log(`Unexpected error: ${error.message}`, 'error');
  }
}

main(); 