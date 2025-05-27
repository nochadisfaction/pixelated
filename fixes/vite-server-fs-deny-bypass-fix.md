# Vite `server.fs.deny` Vulnerability Fix (CVE-2025-32395)

## Issue Description

A security vulnerability was identified in Vite version 6.2.5 and earlier. The vulnerability allowed attackers to bypass the `server.fs.deny` protection mechanism using an invalid `request-target` with special characters (specifically the `#` character). This could allow an attacker to read arbitrary files on the server when the Vite dev server was exposed to the network.

**Affected versions:**
- Vite <= 4.5.10
- 5.0.0 <= Vite <= 5.4.15
- 6.0.0 <= Vite <= 6.0.12
- 6.1.0 <= Vite <= 6.1.2
- 6.2.0 <= Vite <= 6.2.5

## Vulnerability Details

According to HTTP specifications (RFC 9112), the `#` character is not allowed in the request-target. However, on Node and Bun runtimes, requests with invalid request-targets were not rejected and were passed to Vite's user-land code.

When processing these requests, Vite did not properly validate the URL path, which allowed attackers to:
1. Bypass the `server.fs.deny` check
2. Access arbitrary files on the server
3. Potentially view sensitive files like `.env` files or credentials

Example exploit:
```bash
curl --request-target /@fs/path/to/project/#/../../../../../etc/passwd http://127.0.0.1:5173
```

## Fix Implementation

To address this vulnerability, we:

1. **Updated Vite to Version 6.2.6**
   - Upgraded from version 6.2.5 to 6.2.6, which contains the official patch for this vulnerability
   - The update prevents bypassing the `server.fs.deny` protection using invalid request-targets

2. **Enhanced `server.fs.deny` Configuration**
   - Updated `astro.config.mjs` to include a more comprehensive deny list
   - Added additional file patterns to protect sensitive files and directories

```javascript
server: {
  fs: {
    strict: true,
    deny: [
      '.env',
      '.env.*',
      '*.{crt,pem,key,cert}',
      'config.*.json',
      'credentials/**',
      '.git/**',
      '**/.DS_Store',
      '**/node_modules/.vite/**',
      'custom.secret'
    ],
  },
}
```

## Summary of Changes

1. **Files Modified:**
   - `package.json` - Updated Vite version from 6.2.5 to 6.2.6
   - `astro.config.mjs` - Added comprehensive server.fs.deny configuration
   - `.notes/status.mdx` - Updated progress to include security vulnerability fix
   - `.notes/tasks.mdx` - Added completed task for the vulnerability fix

2. **Dependencies Verified:**
   - Ensured vite-related dependencies are compatible with the updated version
   - The fix should be applied when running `pnpm install` to regenerate the lockfile

3. **Documentation Created:**
   - Created `fixes/vite-server-fs-deny-bypass-fix.md` to document the vulnerability and fix

4. **Additional Protections:**
   - Added protection against accessing several sensitive file types and directories
   - Configured the fs.strict setting to true to restrict access outside the workspace

## Mitigation Recommendations

If immediate patching is not possible:
1. Do not expose the Vite dev server to the network (avoid using `--host` or setting `server.host` to `true` or `0.0.0.0`)
2. Use a reverse proxy with proper security rules to limit access to the development server
3. Run the development server in a restricted environment

## References

- [Official Vite Security Advisory](https://github.com/vitejs/vite/security/advisories/GHSA-356w-63v5-8wf4)
- [CVE-2025-32395](https://vulert.com/vuln-db/CVE-2025-32395)
- [HTTP 1.1 Specification (RFC 9112)](https://www.rfc-editor.org/rfc/rfc9112.html)
