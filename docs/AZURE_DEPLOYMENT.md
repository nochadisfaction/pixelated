# Azure Static Web Apps Deployment Guide

This guide will help you deploy the Pixelated application to Azure Static Web Apps as an alternative to Vercel.

## Why Azure?

Azure Static Web Apps provides:
- **Higher size limits** compared to Vercel
- **Built-in API support** with Azure Functions
- **Global CDN** for fast content delivery
- **Custom domains** and SSL certificates
- **Authentication** integration
- **Staging environments** for testing

## Prerequisites

1. **Azure Account**: Sign up at [portal.azure.com](https://portal.azure.com)
2. **Azure CLI**: Install from [docs.microsoft.com](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
3. **Git Repository**: Ensure your code is pushed to the `azure` remote

## Quick Setup

### 1. Install Azure CLI and Login

```bash
# Install Azure CLI (if not already installed)
# Windows: Download from Microsoft docs
# macOS: brew install azure-cli
# Linux: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login
```

### 2. Create Azure Resources

```bash
# Use our automated setup script
pnpm run deploy:azure:setup

# Or create manually:
az group create --name pixelated-rg --location "Central US"
az staticwebapp create \
  --name pixelated-app \
  --resource-group pixelated-rg \
  --source https://github.com/YOUR_USERNAME/pixelated \
  --location "Central US" \
  --branch main \
  --app-location "/" \
  --api-location "dist/server" \
  --output-location "dist/client"
```

### 3. Get Deployment Token

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Static Web App resource
3. Go to **Overview** → **Manage deployment token**
4. Copy the deployment token

### 4. Configure GitHub Secrets

If using GitHub for CI/CD:

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Add new secret: `AZURE_STATIC_WEB_APPS_API_TOKEN`
4. Paste your deployment token

### 5. Deploy

```bash
# Build and deploy in one command
pnpm run deploy:azure

# Or step by step
pnpm run build:azure
pnpm run deploy:azure:deploy
```

## Configuration Files

### `staticwebapp.config.json`

This file configures routing, authentication, and other Azure-specific settings:

```json
{
  "routes": [
    {
      "route": "/admin/*",
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html"
  }
}
```

### `astro.config.azure.mjs`

Azure-optimized Astro configuration with:
- Node.js adapter for serverless functions
- Increased memory allocation
- Production optimizations

## Environment Variables

Create `.env.azure` with:

```env
# Azure Static Web Apps API Token
AZURE_STATIC_WEB_APPS_API_TOKEN=your_token_here

# Database URLs (Azure-specific)
DATABASE_URL=your_azure_database_url
REDIS_URL=your_azure_redis_url

# API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Feature Flags
ENABLE_BIAS_DETECTION=false  # Keep disabled for size limits
ENABLE_ANALYTICS=true
ENABLE_MONITORING=true

# Application Config
NODE_ENV=production
ASTRO_SITE_URL=https://your-app.azurestaticapps.net
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm run build:azure` | Build project for Azure |
| `pnpm run deploy:azure` | Build and deploy to Azure |
| `pnpm run deploy:azure:setup` | Set up Azure resources |
| `node scripts/deploy-azure.js help` | Show all deployment options |

## GitHub Actions Workflow

The `.github/workflows/azure-static-web-apps.yml` file provides:

- **Automatic deployment** on push to main branch
- **Build optimization** with increased memory
- **Environment variable** handling
- **Staging deployments** for pull requests

## Troubleshooting

### Build Fails Due to Size

```bash
# Check build size
du -sh dist/

# Optimize build
pnpm run build:azure

# Check what's taking space
npx bundle-analyzer dist/client/_astro/*.js
```

### Deployment Token Issues

```bash
# Get new deployment token
az staticwebapp secrets list --name pixelated-app --resource-group pixelated-rg

# Reset deployment token
az staticwebapp secrets reset-api-key --name pixelated-app --resource-group pixelated-rg
```

### API Routes Not Working

1. Check `staticwebapp.config.json` routing rules
2. Verify API files are in `dist/server` directory
3. Check Azure Functions logs in portal

### Domain and SSL

```bash
# Add custom domain
az staticwebapp hostname set \
  --name pixelated-app \
  --resource-group pixelated-rg \
  --hostname yourdomain.com

# SSL is automatically provisioned
```

## Monitoring and Logs

### View Deployment Logs

```bash
# Using our script
node scripts/deploy-azure.js logs

# Using Azure CLI
az staticwebapp logs show --name pixelated-app --resource-group pixelated-rg
```

### Monitor Performance

1. Azure Portal → Your Static Web App
2. **Monitoring** → **Metrics**
3. **Logs** → **Application Insights**

### Set Up Alerts

```bash
# Create alert for high response times
az monitor metrics alert create \
  --name "High Response Time" \
  --resource-group pixelated-rg \
  --condition "avg ResponseTime > 2000" \
  --description "Alert when response time exceeds 2 seconds"
```

## Scaling and Optimization

### Performance Optimizations

1. **Enable CDN**: Automatically provided
2. **Compression**: Configure in `staticwebapp.config.json`
3. **Caching**: Set cache headers in API responses
4. **Image Optimization**: Use Azure CDN transforms

### Cost Management

- **Free Tier**: 100GB bandwidth, 0.5GB storage
- **Standard Tier**: Unlimited bandwidth, 10GB storage
- **Monitor Usage**: Check Azure portal regularly

## Security

### Authentication

Azure Static Web Apps supports:
- **Azure AD**
- **GitHub**
- **Twitter**
- **Google**
- **Facebook**
- **Custom providers**

### Access Control

Configure in `staticwebapp.config.json`:

```json
{
  "routes": [
    {
      "route": "/admin/*",
      "allowedRoles": ["authenticated", "admin"]
    }
  ],
  "auth": {
    "rolesSource": "/api/getroles",
    "identityProviders": {
      "azureActiveDirectory": {
        "userDetailsClaim": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0",
          "clientIdSettingName": "AAD_CLIENT_ID",
          "clientSecretSettingName": "AAD_CLIENT_SECRET"
        }
      }
    }
  }
}
```

## Next Steps

1. **Set up monitoring** with Application Insights
2. **Configure custom domain** for branding
3. **Set up staging environments** for testing
4. **Implement authentication** as needed
5. **Monitor costs** and optimize as necessary

## Support

- **Azure Documentation**: [docs.microsoft.com/azure/static-web-apps](https://docs.microsoft.com/azure/static-web-apps)
- **GitHub Issues**: Report deployment issues
- **Azure Support**: Available through Azure portal 