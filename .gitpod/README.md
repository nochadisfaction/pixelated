# Pixelated Gitpod Setup

This directory contains the configuration to replicate your exact Cursor development environment in Gitpod.

## What's Preserved

Your Gitpod workspace will have:

### ✅ Exact Same Environment
- Node.js 22.16.0 (same version as Cursor)
- pnpm package manager
- Python 3.12 with conda (pixel environment)
- All project dependencies pre-installed

### ✅ MCP Servers
- MCP Installer
- Shadcn registry
- Perplexity search
- @21st-dev/magic
- GitHub integration
- Sequential thinking server
- GitIngest MCP
- Think MCP server
- Playwright MCP

### ✅ AI Assistant Rules
- All `.cursor/rules/*.mdc` files copied to `.vscode/rules/`
- Same AI behavior and guidelines
- Consistent code standards and patterns

### ✅ VS Code Configuration
- Same editor settings
- Proper file associations (.astro, .mdc)
- Integrated terminal with conda
- Astro and Tailwind support
- Python environment configuration

## Quick Start

1. **Set up environment variables** (one-time setup):
   - Follow instructions in [env-template.md](./env-template.md)
   - Configure all required API keys in Gitpod user variables

2. **Open in Gitpod**:
   ```
   https://gitpod.io/#https://github.com/chadisfaction/pixelated
   ```

3. **Wait for initialization** (2-3 minutes):
   - Environment setup runs automatically
   - Dependencies are installed
   - Conda environment is created
   - Development server starts

## Files Overview

- `.gitpod.yml` - Main Gitpod configuration
- `.gitpod.Dockerfile` - Custom environment image
- `mcp.json` - MCP servers configuration (adapted for Gitpod paths)
- `settings.json` - VS Code settings
- `setup-env.sh` - Environment initialization script
- `env-template.md` - Environment variables guide
- `README.md` - This file

## Manual Commands

If you need to manually set up the environment:

```bash
# Activate conda environment
conda activate pixel

# Use correct Node version
nvm use 22.16.0

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Differences from Local Cursor

The only differences are path adaptations for Gitpod:
- Workspace root: `/workspace/pixelated` instead of `/workspaces/pixelated`
- Node.js path: `/home/gitpod/.nvm/versions/node/v22.16.0/bin/`
- Configuration location: `.vscode/` instead of `.cursor/`

Everything else is identical to your Cursor setup.

## Troubleshooting

### MCP Servers Not Working
- Check that environment variables are set correctly
- Restart the workspace if needed
- Verify API keys in Gitpod user variables

### Python Environment Issues
```bash
# Recreate conda environment
conda remove -n pixel --all
conda create -n pixel python=3.12 -y
conda activate pixel
```

### Node/pnpm Issues
```bash
# Reset Node version
nvm install 22.16.0
nvm use 22.16.0
npm install -g pnpm@latest
```

## Support

If you encounter issues:
1. Check the Gitpod terminal for error messages
2. Verify all environment variables are set
3. Try restarting the workspace
4. Open an issue in the repository

Your Cursor setup is now fully portable to Gitpod! 🚀 