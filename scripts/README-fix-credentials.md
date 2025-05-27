# Fix Credentials Script

A tool to replace hardcoded credentials with environment variables across the codebase.

## Setup

First, make sure to install the required `glob` package:

```bash
pnpm add glob
```

## Usage

### Fix All Credentials

To automatically fix all hardcoded credentials in the codebase:

```bash
node fix-credentials.js
```

This will:
- Replace hardcoded credentials with environment variables
- Generate a `.env.example` file with all required variables
- Apply different replacement strategies for test files and type definitions

### Check Only Mode

To check for hardcoded credentials without making changes:

```bash
node fix-credentials.js --dry-run
```

This will generate a report without modifying any files.

### Verbose Mode

For detailed logging:

```bash
node fix-credentials.js --verbose
```

### Fix Specific File

To fix just one file:

```bash
node fix-credentials.js path/to/file.ts
```

## After Running

1. Create a `.env` file based on the generated `.env.example`
2. Ensure `.env` is in your `.gitignore`
3. Update your CI/CD pipelines to use environment variables

## Related Documentation

See [CREDENTIAL-SECURITY.md](../docs/security/credential-security.md) for more details about credential security in this project.
