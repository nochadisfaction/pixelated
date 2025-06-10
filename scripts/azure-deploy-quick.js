#!/usr/bin/env node

/**
 * Quick Azure Deployment Script
 * Temporarily bypasses MDX issues to get deployment working
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

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
    log('🚀 Quick Azure Deployment (bypassing MDX issues)', 'info');
    
    // Create backup directory
    const backupDir = '.temp-backup';
    const docsPath = 'src/content/docs';
    const backupPath = path.join(backupDir, 'docs-backup');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Backup docs directory if it exists
    if (fs.existsSync(docsPath)) {
      log('📦 Backing up problematic docs files...', 'info');
      
      // Remove backup path if it exists
      if (fs.existsSync(backupPath)) {
        fs.rmSync(backupPath, { recursive: true, force: true });
      }
      
      // Copy instead of rename to avoid file system issues
      fs.cpSync(docsPath, backupPath, { recursive: true });
      fs.rmSync(docsPath, { recursive: true, force: true });
      log('✅ Docs files backed up', 'success');
    }
    
    // Create minimal docs directory
    fs.mkdirSync(docsPath, { recursive: true });
    
    const minimalDoc = `---
title: "Documentation"
description: "Documentation is temporarily unavailable during deployment"
pubDate: 2024-01-15
author: "System"
tags: []
draft: false
toc: false
share: false
---

# Documentation

Documentation is being updated and will be available shortly.

This is a temporary placeholder during the Azure deployment process.
The full documentation will be restored after deployment.
`;
    
    fs.writeFileSync(path.join(docsPath, 'index.md'), minimalDoc);
    log('📝 Created minimal docs placeholder', 'info');
    
    // Build the project using Azure config with higher memory
    const buildSuccess = executeCommand(
      'cross-env NODE_OPTIONS="--max-old-space-size=8192" astro build --config astro.config.azure.mjs', 
      'Building project with Azure config (8GB memory)'
    );
    
    if (buildSuccess) {
      // Check if SWA CLI is installed
      try {
        execSync('swa --version', { stdio: 'ignore' });
        log('✅ Azure SWA CLI already installed', 'success');
      } catch {
        log('📦 Installing Azure Static Web Apps CLI...', 'info');
        executeCommand('npm install -g @azure/static-web-apps-cli', 'Installing SWA CLI');
      }
      
      // Deploy to Azure
      const deploySuccess = executeCommand(
        'swa deploy ./dist --env production',
        'Deploying to Azure Static Web Apps'
      );
      
      if (deploySuccess) {
        log('🎉 Deployment successful!', 'success');
        log('Your app should be available at your Azure Static Web Apps URL', 'info');
      }
    }
    
  } catch (error) {
    log(`Unexpected error: ${error.message}`, 'error');
  } finally {
    // Always restore docs files
    log('🔄 Restoring docs files...', 'info');
    
    const docsPath = 'src/content/docs';
    const backupPath = '.temp-backup/docs-backup';
    
    // Remove temporary docs
    if (fs.existsSync(docsPath)) {
      fs.rmSync(docsPath, { recursive: true, force: true });
    }
    
    // Restore original docs
    if (fs.existsSync(backupPath)) {
      fs.cpSync(backupPath, docsPath, { recursive: true });
      log('✅ Docs files restored', 'success');
    }
    
    // Clean up backup directory
    if (fs.existsSync('.temp-backup')) {
      fs.rmSync('.temp-backup', { recursive: true, force: true });
      log('🧹 Cleanup complete', 'info');
    }
    
    log('✨ Quick deployment process complete!', 'success');
  }
}

main(); 