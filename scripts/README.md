# Project Scripts

This directory contains utility scripts for the project. Many individual scripts have been consolidated into a few main scripts for easier maintenance and use.

## Consolidated Scripts

The project now uses four main consolidated scripts:

- **consolidated-fix.js**: Combines multiple fixing scripts into one utility
  - Fixes ReactNode imports
  - Fixes unused imports
  - Fixes Astro frontmatter
  - Fixes JSX tags and typos
  - Fixes Vitest mocks

- **consolidated-build.js**: Handles the complete build process
  - Sets up environment variables
  - Runs pre-build checks
  - Copies polyfills
  - Applies fixes if needed
  - Performs post-build cleanup

- **consolidated-deploy.js**: Manages deployment processes
  - Deploys to staging or production
  - Handles Convex deployment
  - Manages Vercel secrets
  - Provides rollback functionality
  - Includes deployment monitoring

- **consolidated-test.js**: Centralized testing utility
  - HIPAA compliance checks
  - Backup testing
  - Security and PHI detection
  - Crypto validation

## Usage

These scripts can be executed through npm/pnpm scripts defined in package.json:

```bash
# Fix code issues
pnpm fix

# Build with auto-fixing
pnpm build:auto-fix

# Build for production
pnpm build:prod

# Deploy to staging
pnpm deploy

# Deploy to production
pnpm deploy:prod

# Roll back to previous deployment
pnpm rollback

# Run all tests
pnpm test:all

# Run specific tests
pnpm test:hipaa
pnpm test:crypto
pnpm test:backup
pnpm test:security
```

## Core Remaining Scripts

Here are the specialized scripts that remain as individual files:

- **copy-polyfills.js**: Manages browser polyfills
- **generate-compatibility-report.js**: Creates browser compatibility reports
- **pre-build-check.js**: Performs pre-build validations
- **setup-dev-env.js**: Sets up development environment
- **verify-env-vars.js**: Validates environment variables
- **verify-headers.js** & **verify-security-headers.js**: Security checks
- **schedule-posts.js**: Blog post scheduling utility
- **clean-credentials.js**: Credential security scanning
- **run-tests.sh**: Primary test runner
- **diagnostics.ts**: System diagnostic utility
- **run-pagefind.ts**: Search indexing utility
- **setup-env.ts**: Environment setup utility
- **load-test.ts**: Performance testing utility

## Environment Variables

For environment variable management:
- Add them to your `.env` file for local development
- Add them to GitHub Secrets for CI/CD workflows
- Use the `deploy:secrets` command to set up Vercel secrets

## Script Management

To optimize this folder further:

```bash
# Optimize scripts folder (backs up unnecessary scripts)
pnpm optimize-scripts
```

The optimization process:
1. Moves unnecessary scripts to a backup folder
2. Creates consolidated scripts for common functionality
3. Updates package.json references
4. Provides documentation of changes

See `OPTIMIZATION.md` for details on the optimization process.

# Build Tools & Scripts

This directory contains various utility scripts for the Astro project.

## Image Format Handling

We've added special handling for image formats to prevent errors with the Sharp image processing library during builds.

### Scripts

- **fix-image-files.js**: Finds and fixes problematic image files that could cause Sharp errors during build
- **find-problematic-images.js**: Diagnostic tool to locate potentially problematic image files

### Common Error and Solution

During builds, you might encounter this error:

```
Error: Input file contains unsupported image format
    at Sharp.metadata (/tmp/build_XXXXX/node_modules/.pnpm/sharp@0.33.5/node_modules/sharp/lib/input.js:487:17)
```

This typically happens when files with image extensions (like .jpg or .png) don't actually contain valid image data. Our scripts solve this by:

1. Automatically identifying problematic files
2. Backing up these files to `problematic-images-backup/`
3. Replacing them with valid placeholder images
4. Adding necessary exclusions to the `astro-compress` configuration

### Usage

The standard build commands (`npm run build`) now use the safe build process automatically. No extra steps required.

If you want to run the image fix process manually:

```bash
node scripts/fix-image-files.js
```

To diagnose image issues without fixing them:

```bash
node scripts/find-problematic-images.js
```

### How It Works

1. The image processing is disabled in `astro-compress` configuration with `img: false`
2. Problem files are excluded using the `filter` property
3. Any remaining problematic files are replaced with valid images

This approach ensures a successful build process without unnecessary processing that could cause errors.

# Reddit Mental Health Dataset Combiner

This script efficiently combines multiple Reddit mental health-related datasets into a unified structure, with basic cleaning and filtering applied during the process.

## Features

- Reads dataset paths from `ai/datasets/collection.csv`
- Organizes files by mental health category (anxiety, depression, loneliness, etc.)
- Performs basic text cleaning (removes URLs, special characters, extra whitespace)
- Adds metadata (source file, category, year, month)
- Handles column name variations across different datasets
- Deduplicates entries where possible
- Outputs both combined category-specific datasets and a unified dataset
- Uses parallel processing for improved performance
- Saves in both Parquet (efficient storage) and CSV sample formats

## Requirements

```
pandas
tqdm
pyarrow (for Parquet support)
```

## Usage

1. Ensure the `collection.csv` file contains all dataset paths
2. Run the script:

```bash
python scripts/combine_datasets.py
```

3. Find the outputs in the `ai/datasets/combined/` directory:
   - Category-specific datasets: `<category>_combined.parquet`
   - Category samples (for quick inspection): `<category>_sample.csv`
   - Unified dataset: `all_reddit_mental_health.parquet`
   - Unified sample: `all_reddit_mental_health_sample.csv`

## Categories

The script automatically categorizes files into:
- anxiety
- depression
- loneliness
- mental_health
- suicidal
- other (for files that don't match the above categories)

## Notes

- The script uses parallel processing which significantly improves performance on multi-core systems
- Some datasets might be skipped if they:
  - Don't exist at the specified path
  - Are not in CSV format
  - Don't contain recognizable text columns
  - Are completely empty
- Error handling is in place to ensure the process continues even if individual files fail
