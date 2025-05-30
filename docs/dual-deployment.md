# 🚀 Dual Deployment Setup (Vercel + Cloudflare)

This project supports dual deployment to both Vercel (primary) and Cloudflare Pages (backup) for maximum reliability and redundancy.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   Primary       │    │    Backup       │
│   Vercel        │    │   Cloudflare    │
│ pixelated  │    │   Pages         │
│    .com         │    │ backup.pages.dev│
└─────────────────┘    └─────────────────┘
         │                        │
         └────────┬─────────────────┘
                  │
         ┌─────────▼─────────┐
         │   Shared Codebase │
         │   Different       │
         │   Configurations  │
         └───────────────────┘
```

## 📋 Key Differences

| Feature | Vercel (Primary) | Cloudflare (Backup) |
|---------|------------------|---------------------|
| **Adapter** | `@astrojs/vercel` | `@astrojs/cloudflare` |
| **Image Service** | Sharp (server-side) | Noop (client-side) |
| **Build Target** | Node.js | Web Worker |
| **Config File** | `astro.config.mjs` | `astro.config.cloudflare.mjs` |
| **URL** | pixelatedempathy.com | pixelated-backup.pages.dev |
| **Analytics** | Vercel Analytics | Cloudflare Analytics |

## 🛠️ Setup Instructions

### 1. Install Dependencies

Ensure you have the Cloudflare adapter installed:

```bash
pnpm add @astrojs/cloudflare wrangler
```

### 2. Configure Environment Variables

#### For Cloudflare Pages Dashboard:
- `NODE_ENV=production`
- `CLOUDFLARE_BUILD=1`
- `BUILDING_FOR_CLOUDFLARE=1`
- `SENTRY_DSN=your_sentry_dsn`
- `SENTRY_AUTH_TOKEN=your_token`

#### For GitHub Actions (Secrets):
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### 3. Configure Wrangler

Update `wrangler.toml` with your account details:

```toml
account_id = "your-cloudflare-account-id"
name = "pixelated-backup"
```

## 🚀 Deployment Methods

### Method 1: Manual Deployment Scripts

#### Deploy to Cloudflare Only:
```bash
# PowerShell (Windows)
.\scripts\deploy-cloudflare.ps1

# Bash (Linux/Mac)
./scripts/deploy-cloudflare.sh
```

#### Deploy to Both Platforms:
```bash
# Sequential deployment (safer)
.\scripts\deploy-both.ps1

# Parallel deployment (faster)
.\scripts\deploy-both.ps1 -Parallel
```

### Method 2: GitHub Actions

The dual deployment workflow automatically triggers on:
- Push to `main` or `production` branches
- Manual workflow dispatch

#### Manual Trigger Options:
1. Go to GitHub Actions tab
2. Select "🚀 Dual Deployment (Vercel + Cloudflare)"
3. Click "Run workflow"
4. Choose options:
   - Deploy to Vercel: ✅/❌
   - Deploy to Cloudflare: ✅/❌
   - Parallel deployment: ✅/❌

### Method 3: Direct Commands

```bash
# Build for Cloudflare
CLOUDFLARE_BUILD=1 pnpm astro build --config astro.config.cloudflare.mjs

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=pixelated-backup
```

## 🔧 Configuration Details

### Image Handling

**Vercel (Primary):**
- Uses Sharp for server-side image optimization
- Supports dynamic image processing
- Better for SEO and performance

**Cloudflare (Backup):**
- Uses noop service (no server-side processing)
- Images served as-is or pre-optimized
- Relies on client-side or build-time optimization

### Build Differences

**Vercel Build:**
```bash
# Uses Node.js runtime
export NODE_ENV=production
export VERCEL=1
pnpm astro build --config astro.config.mjs
```

**Cloudflare Build:**
```bash
# Uses Web Worker runtime
export NODE_ENV=production
export CLOUDFLARE_BUILD=1
pnpm astro build --config astro.config.cloudflare.mjs
```

## 🔄 Failover Strategy

### Automatic Failover
- Set up DNS failover in your domain provider
- Use health checks to monitor both deployments
- Redirect traffic to backup if primary fails

### Manual Failover
1. Update DNS records to point to backup site
2. Update CDN configuration if applicable
3. Monitor backup site performance

## 📊 Monitoring & Health Checks

### Health Check Endpoints
- Primary: `https://pixelatedempathy.com/health`
- Backup: `https://pixelated-backup.pages.dev/health`

### Monitoring Tools
- **Vercel:** Built-in analytics and monitoring
- **Cloudflare:** Pages dashboard and analytics
- **Sentry:** Error tracking for both deployments
- **GitHub Actions:** Deployment status and logs

## 🚨 Troubleshooting

### Common Issues

#### 1. Sharp Compatibility Error
```bash
Error: Could not find Sharp
```
**Solution:** This is expected for Cloudflare builds. The configuration uses `noop` service instead.

#### 2. Build Differences
- Different chunking strategies between platforms
- Some Node.js APIs not available on Cloudflare
- Environment variable differences

#### 3. Session Storage
- Vercel: Can use traditional session storage
- Cloudflare: Requires KV namespace for sessions

### Debug Mode

Enable verbose logging:
```bash
# For Cloudflare builds
CLOUDFLARE_VERBOSE=1 pnpm astro build --config astro.config.cloudflare.mjs
```

## 📈 Performance Considerations

### Vercel Advantages
- Full Node.js runtime support
- Better for complex server-side operations
- Integrated with Vercel Edge Network

### Cloudflare Advantages
- Global CDN with better edge coverage
- Built-in DDoS protection
- Zero cold start times
- Cheaper for high traffic

## 🔒 Security Considerations

### Headers Configuration
Both deployments include security headers, but with platform-specific adjustments:

- **CSP:** Cloudflare includes Cloudflare-specific domains
- **HSTS:** Consistent across both platforms
- **CORS:** Configured per platform requirements

### Environment Variables
- Never commit sensitive data
- Use platform-specific secret management
- Different environment variables per platform

## 📝 Maintenance

### Regular Tasks
1. **Weekly:** Check both deployments are healthy
2. **Monthly:** Update dependencies and rebuild both
3. **Quarterly:** Review performance metrics
4. **Annually:** Evaluate platform choices and costs

### Updates
When updating dependencies or configurations:
1. Test changes on staging environment
2. Deploy to Cloudflare first (backup)
3. If stable, deploy to Vercel (primary)
4. Monitor both for 24 hours

## 🆘 Emergency Procedures

### Primary Site Down
1. Verify backup site is operational
2. Update DNS to point to backup
3. Notify users via status page
4. Debug and fix primary site
5. Restore DNS after verification

### Both Sites Down
1. Check GitHub Actions for deployment failures
2. Verify build configurations
3. Check for service outages (Vercel/Cloudflare)
4. Deploy to both platforms manually
5. Consider static fallback hosting

## 📞 Support Contacts

- **Vercel Issues:** Vercel support dashboard
- **Cloudflare Issues:** Cloudflare support
- **Build Issues:** Check GitHub Actions logs
- **Domain Issues:** DNS provider support

---

For more information, see the individual configuration files:
- [`astro.config.mjs`](../astro.config.mjs) - Vercel configuration
- [`astro.config.cloudflare.mjs`](../astro.config.cloudflare.mjs) - Cloudflare configuration
- [`wrangler.toml`](../wrangler.toml) - Cloudflare deployment settings 