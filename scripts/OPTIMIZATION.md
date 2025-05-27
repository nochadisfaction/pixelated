# Script Optimization

## Overview
This directory contains utility scripts for the project. Many individual scripts have been consolidated
to improve efficiency and maintainability. This README documents the optimization process and current script structure.

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

## Core Remaining Scripts

- **copy-polyfills.js**: Manages browser polyfills
- **generate-compatibility-report.js**: Creates browser compatibility reports
- **pre-build-check.js**: Performs pre-build validations
- **setup-dev-env.js**: Sets up development environment
- **verify-env-vars.js**: Validates environment variables
- **verify-headers.js** and **verify-security-headers.js**: Security checks
- **schedule-posts.js**: Blog post scheduling utility
- **clean-credentials.js**: Credential security scanning
- **run-tests.sh**: Primary test runner
- **diagnostics.ts**: System diagnostic utility
- **run-pagefind.ts**: Search indexing utility
- **setup-env.ts**: Environment setup utility
- **load-test.ts**: Performance testing utility

## Optimization Process

The following categories of scripts were consolidated:

1. **Build-related scripts**: Multiple build scripts merged into consolidated-build.js
2. **Buffer fix scripts**: Various buffer-related fixes integrated into consolidated-fix.js
3. **Patch scripts**: Different patching utilities combined into consolidated-fix.js
4. **Test scripts**: Testing utilities merged into consolidated-test.js

## Backup
All consolidated scripts were backed up to the `backup` directory before removal.
