# Security and Credential Management Scripts

This directory contains scripts to help manage security, credentials, and environment variables in the project.

## Overview

These scripts are designed to help maintain security best practices, particularly for HIPAA compliance:

1. **clean-credentials.js**: Scans and replaces hardcoded credentials in the codebase
2. **verify-env-vars.js**: Verifies environment variables and generates configuration reports
3. **hipaa-security-check.js**: Performs HIPAA compliance checks (if present)

## Preventing Credential Exposure

### 1. `clean-credentials.js`

This script scans your codebase for hardcoded credentials and API keys, replacing them with environment variable references.

#### Usage

Check for hardcoded credentials:
```bash
node scripts/clean-credentials.js --check-only
```

Replace hardcoded credentials with environment variable references:
```bash
node scripts/clean-credentials.js
```

Check a specific file:
```bash
node scripts/clean-credentials.js --check-only path/to/file.ts
```

Fix a specific file:
```bash
node scripts/clean-credentials.js path/to/file.ts
```

Verbose mode (more detailed output):
```bash
node scripts/clean-credentials.js --verbose
```

#### What it does

- Replaces hardcoded credentials with environment variable references
- Handles different file types appropriately (tests, documentation, TypeScript interfaces)
- Maintains code functionality while improving security
- Generates detailed reports of findings

### 2. `verify-env-vars.js`

This script helps manage environment variables across different environments.

#### Usage

Check environment variables and generate reports:
```bash
node scripts/verify-env-vars.js
```

Generate .env.example and report only:
```bash
node scripts/verify-env-vars.js --generate-only
```

#### What it does

- Checks your existing `.env` files for required variables
- Generates a comprehensive `.env.example` with all needed variables
- Creates a detailed credential management report
- Provides guidance on securing environment configurations

## Best Practices for Credential Management

### Environment Variables

1. **Never commit credentials to version control**
   - Add all `.env*` files to `.gitignore` (except `.env.example`)
   - Use environment variables for all credentials

2. **Use different .env files for different environments**
   - `.env.local` - Local development
   - `.env.test` - Testing environment
   - `.env.production` - Production configuration

3. **Secure storage for production credentials**
   - Use secrets management in your deployment platform
   - Rotate credentials regularly
   - Apply principle of least privilege

### HIPAA Compliance

For HIPAA compliance, ensure:

1. **PHI protection**
   - Encrypt all PHI at rest and in transit
   - Use environment variables for encryption keys
   - Implement proper access controls and audit logging

2. **Environment variable validation**
   - Validate all required environment variables on startup
   - Fail securely if critical variables are missing
   - Log appropriate warnings (without exposing sensitive information)

3. **Authentication & authorization**
   - Store authentication credentials securely
   - Use proper OAuth flow for EHR integrations
   - Never hardcode patient identifiers

## CI/CD Integration

These scripts are integrated into your GitHub Actions workflow:

- **Security scanning workflow**: `.github/workflows/security-scanning.yml`
- **Pre-commit hook**: Scans code before commits
- **Pull request checks**: Verifies no credentials are exposed

## Troubleshooting

### False Positives

If you encounter false positives with credential detection:

1. Modify the patterns in `clean-credentials.js` to be more specific
2. Add legitimate variable name patterns to the allowlist
3. For test data, use clearly marked test credentials

### Missing Environment Variables

If you get errors about missing environment variables:

1. Check your `.env` files against the generated `.env.example`
2. Ensure variables are correctly named and formatted
3. Verify your deployment platform has the correct environment variables set

## Additional Resources

- [HIPAA Security Rule Summary](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [OWASP Secure Configuration Guide](https://cheatsheetseries.owasp.org/cheatsheets/Securing_Configuration_Practices_Cheat_Sheet.html)
- [Twelve-Factor App: Config](https://12factor.net/config)
