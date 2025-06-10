#!/usr/bin/env node

/**
 * Monitor Azure deployment status
 */

import { exec } from 'node:child_process';
import fs from 'node:fs';

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function checkBuildStatus() {
  // Check if build is still running
  exec('pgrep -f "astro build"', (error, stdout) => {
    if (stdout.trim()) {
      log('🏗️  Build is still running...', 'info');
    } else {
      log('Build process completed', 'success');
      
      // Check if dist directory exists
      if (fs.existsSync('./dist')) {
        log('✅ Dist directory found - build likely successful!', 'success');
        
        // Check for common build artifacts
        const artifacts = ['index.html', '_astro'];
        const foundArtifacts = artifacts.filter(artifact => 
          fs.existsSync(`./dist/${artifact}`)
        );
        
        log(`📦 Found artifacts: ${foundArtifacts.join(', ')}`, 'info');
        
        if (foundArtifacts.length > 0) {
          log('🎉 Build appears successful! You can now deploy manually if needed.', 'success');
        }
      } else {
        log('❌ No dist directory found - build may have failed', 'error');
      }
    }
  });
}

function checkDeploymentProcess() {
  exec('pgrep -f "azure-deploy-quick"', (error, stdout) => {
    if (stdout.trim()) {
      log('🚀 Deployment script is still running...', 'info');
    } else {
      log('Deployment script completed', 'success');
    }
  });
}

function main() {
  log('🔍 Checking deployment status...', 'info');
  checkDeploymentProcess();
  checkBuildStatus();
}

if (process.argv[2] === '--watch') {
  log('👀 Starting deployment monitor (checking every 30 seconds)...', 'info');
  main();
  setInterval(main, 30000);
} else {
  main();
} 