#!/usr/bin/env node

/**
 * Azure Static Web Apps Deployment Script
 * 
 * This script helps with Azure deployments and provides useful commands
 * for managing the Azure Static Web Apps deployment.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const AZURE_CONFIG = {
  resourceGroup: 'pixelated-rg',
  appName: 'pixelated-app',
  location: 'Central US',
  sku: 'Free'
};

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
    const output = execSync(command, { 
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    log(`✅ ${description} completed`, 'success');
    return output;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'error');
    throw error;
  }
}

function checkAzureCLI() {
  try {
    execSync('az --version', { stdio: 'ignore' });
    log('✅ Azure CLI is installed', 'success');
  } catch {
    log('❌ Azure CLI is not installed. Please install it first:', 'error');
    log('https://docs.microsoft.com/en-us/cli/azure/install-azure-cli', 'info');
    process.exit(1);
  }
}

function checkLogin() {
  try {
    execSync('az account show', { stdio: 'ignore' });
    log('✅ Already logged in to Azure', 'success');
  } catch {
    log('🔐 Please login to Azure...', 'warning');
    executeCommand('az login', 'Azure login');
  }
}

function buildProject() {
  log('🏗️  Building project for Azure...', 'info');
  executeCommand('pnpm run build:azure', 'Building Astro project');
}

function deployToAzure() {
  log('🚀 Deploying to Azure Static Web Apps...', 'info');
  
  // Check if we have the Azure Static Web Apps CLI
  try {
    execSync('swa --version', { stdio: 'ignore' });
  } catch {
    log('Installing Azure Static Web Apps CLI...', 'info');
    executeCommand('npm install -g @azure/static-web-apps-cli', 'Installing SWA CLI');
  }

  // Deploy using SWA CLI
  executeCommand(
    'swa deploy ./dist/client --api-location ./dist/server --env production',
    'Deploying to Azure Static Web Apps'
  );
}

function showUsage() {
  console.log(`
Azure Deployment Script

Usage:
  node scripts/deploy-azure.js [command]

Commands:
  build           Build the project for Azure
  deploy          Deploy to Azure Static Web Apps
  full            Build and deploy (default)
  setup           Set up Azure resources
  status          Check deployment status
  logs            View deployment logs
  help            Show this help message

Examples:
  node scripts/deploy-azure.js full     # Build and deploy
  node scripts/deploy-azure.js build    # Just build
  node scripts/deploy-azure.js deploy   # Just deploy
  node scripts/deploy-azure.js setup    # Set up Azure resources
`);
}

function setupAzureResources() {
  log('🔧 Setting up Azure resources...', 'info');
  
  checkAzureCLI();
  checkLogin();
  
  // Create resource group
  executeCommand(
    `az group create --name ${AZURE_CONFIG.resourceGroup} --location "${AZURE_CONFIG.location}"`,
    'Creating resource group'
  );
  
  // Create Static Web App
  executeCommand(
    `az staticwebapp create \\
      --name ${AZURE_CONFIG.appName} \\
      --resource-group ${AZURE_CONFIG.resourceGroup} \\
      --source https://github.com/YOUR_USERNAME/pixelated \\
      --location "${AZURE_CONFIG.location}" \\
      --branch main \\
      --app-location "/" \\
      --api-location "dist/server" \\
      --output-location "dist/client"`,
    'Creating Static Web App'
  );
  
  log('🎉 Azure resources created successfully!', 'success');
  log('📝 Next steps:', 'info');
  log('1. Get the deployment token from Azure portal', 'info');
  log('2. Add AZURE_STATIC_WEB_APPS_API_TOKEN to your GitHub secrets', 'info');
  log('3. Push to main branch to trigger deployment', 'info');
}

function checkStatus() {
  log('📊 Checking deployment status...', 'info');
  executeCommand(
    `az staticwebapp show --name ${AZURE_CONFIG.appName} --resource-group ${AZURE_CONFIG.resourceGroup}`,
    'Getting Static Web App status'
  );
}

function showLogs() {
  log('📋 Recent deployment logs:', 'info');
  executeCommand(
    `az staticwebapp logs show --name ${AZURE_CONFIG.appName} --resource-group ${AZURE_CONFIG.resourceGroup}`,
    'Fetching deployment logs'
  );
}

// Main execution
const command = process.argv[2] || 'full';

try {
  switch (command) {
    case 'build':
      buildProject();
      break;
      
    case 'deploy':
      deployToAzure();
      break;
      
    case 'full':
      buildProject();
      deployToAzure();
      break;
      
    case 'setup':
      setupAzureResources();
      break;
      
    case 'status':
      checkStatus();
      break;
      
    case 'logs':
      showLogs();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showUsage();
      break;
      
    default:
      log(`Unknown command: ${command}`, 'error');
      showUsage();
      process.exit(1);
  }
} catch (error) {
  log(`Deployment failed: ${error.message}`, 'error');
  process.exit(1);
} 