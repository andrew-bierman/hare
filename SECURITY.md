# Security Architecture and Best Practices

This document outlines the security measures implemented in the Hare platform and provides guidelines for maintaining a secure codebase.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Password Security](#password-security)
3. [CSRF Protection](#csrf-protection)
4. [Input Validation & Sanitization](#input-validation--sanitization)
5. [Encryption](#encryption)
6. [Rate Limiting](#rate-limiting)
7. [Security Headers](#security-headers)
8. [Audit Logging](#audit-logging)
9. [API Security](#api-security)
10. [Dependency Management](#dependency-management)
11. [Vulnerability Disclosure](#vulnerability-disclosure)

## Authentication & Authorization

### Session Management

- **Library**: Better Auth with Drizzle adapter
- **Session Duration**: 7 days
- **Session Update**: 1 day
- **Cookie Settings**:
  - `httpOnly: true` - Prevents JavaScript access
  - `secure: true` - HTTPS only (production)
  - `sameSite: 'Strict'` - CSRF protection
  - `prefix: '__Host-'` - Enhanced security prefix

### OAuth Integration

- **Supported Providers**: Google, GitHub
- **Token Storage**: Encrypted at rest using AES-GCM
- **Token Refresh**: Automatic with expiry tracking

### API Keys

- **Hashing**: SHA-256
- **Prefix**: `hare_` for easy identification
- **Rotation**: Supported via API
- **Permissions**: Scoped access control

## Password Security

### Requirements

- **Minimum Length**: 8 characters (recommended 12+)
- **Maximum Length**: 128 characters
- **Character Requirements**:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- **Additional Checks**:
  - No common passwords (password123, etc.)
  - No sequential characters (123, abc)
  - No excessive repeated characters

### Implementation

```typescript
import { validatePassword } from 'web-app/lib/security'

const result = validatePassword(password)
if (!result.valid) {
  // Handle validation errors
  console.error(result.errors)
}
```

### Strength Scoring

Passwords are scored on a scale:
- **Weak**: Score 0-2
- **Fair**: Score 3-4
- **Good**: Score 5
- **Strong**: Score 6+

## CSRF Protection

### Implementation

CSRF protection is implemented using the double-submit cookie pattern:

1. Server generates a random token and stores it in a secure cookie
2. Client includes the token in the `X-CSRF-Token` header for state-changing requests
3. Server validates that both tokens match

### Usage

```typescript
import { csrfProtection } from 'web-app/lib/security'

// Apply to routes that modify state
app.use('/api/protected/*', csrfProtection())
```

### Exemptions

- GET, HEAD, OPTIONS requests (safe methods)
- Requests authenticated with API keys (external APIs)

## Input Validation & Sanitization

### Sanitization Functions

```typescript
import {
  sanitizeHtml,
  sanitizeUserInput,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeFilename,
} from 'web-app/lib/api/utils/sanitize'

// HTML escaping
const safe = sanitizeHtml('<script>alert("xss")</script>')
// Output: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;

// URL validation
const url = sanitizeUrl('https://example.com')

// Filename sanitization (prevents path traversal)
const filename = sanitizeFilename('../../etc/passwd')
```

### Request Validation

```typescript
import { requestSizeLimit, requireContentType } from 'web-app/lib/security'

// Limit request body size
app.use('*', requestSizeLimit()) // Default 1MB

// Require specific content type
app.use('/api/json', requireContentType(['application/json']))
```

## Encryption

### Data Encryption

Uses AES-256-GCM for encrypting sensitive data at rest:

```typescript
import { encryptData, decryptData } from 'web-app/lib/security'

// Encrypt
const encrypted = await encryptData('sensitive data', process.env.ENCRYPTION_KEY)

// Decrypt
const decrypted = await decryptData(encrypted, process.env.ENCRYPTION_KEY)
```

### Hashing

SHA-256 for one-way hashing:

```typescript
import { hashData } from 'web-app/lib/security'

const hash = await hashData('data to hash')
```

### Sensitive Data

Data that should be encrypted at rest:
- OAuth access tokens
- OAuth refresh tokens
- API keys (hashed, not encrypted)
- User PII (if collected)

## Rate Limiting

### Cloudflare Rate Limiting

Implemented using Cloudflare's native rate limiting:

- **API Endpoints**: 100 requests/minute per user
- **Auth Endpoints**: 10 requests/minute per IP (strict)
- **Chat Endpoints**: 30 requests/minute per user
- **External API**: 100 requests/minute per API key

### Configuration

```typescript
import { 
  apiRateLimiter,
  strictRateLimiter,
  chatRateLimiter,
} from 'web-app/lib/api/middleware'

// Apply to routes
app.use('/api/*', apiRateLimiter)
app.use('/api/auth/*', strictRateLimiter)
app.use('/api/chat/*', chatRateLimiter)
```

## Security Headers

### Content Security Policy (CSP)

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob:;
font-src 'self' data:;
connect-src 'self' https://*.cloudflare.com;
frame-src 'none';
object-src 'none';
base-uri 'self';
form-action 'self';
```

### Other Headers

- **Strict-Transport-Security**: Forces HTTPS
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: Legacy XSS filter
- **Referrer-Policy**: Controls referrer leakage
- **Permissions-Policy**: Restricts browser features

## Audit Logging

### Events Tracked

- Authentication events (login, logout, failed attempts)
- API key usage
- Workspace changes
- Agent deployments
- Security events (CSRF failures, rate limits)

### Implementation

```typescript
import { logAuthEvent, logSecurityEvent } from 'web-app/lib/security'

// Log authentication
logAuthEvent({
  type: 'auth.login',
  userId: user.id,
  email: user.email,
  success: true,
  ipAddress: req.ip,
})

// Log security event
logSecurityEvent({
  type: 'security.rate_limit_exceeded',
  action: 'api_request',
  details: { endpoint: '/api/chat' },
})
```

## API Security

### Authentication Methods

1. **Session Cookies**: For web application
2. **API Keys**: For external integrations
3. **OAuth**: For third-party authentication

### Best Practices

- Always use HTTPS in production
- Validate all input parameters
- Use prepared statements for SQL queries (via Drizzle ORM)
- Implement proper error handling (don't leak sensitive info)
- Log security-relevant events

### SQL Injection Prevention

Using Drizzle ORM with parameterized queries:

```typescript
// ✅ Safe - parameterized
const users = await db.select()
  .from(usersTable)
  .where(eq(usersTable.id, userId))

// ❌ Unsafe - never do this
const users = await db.execute(sql`SELECT * FROM users WHERE id = ${userId}`)
```

## Dependency Management

### Regular Updates

- Review dependencies monthly for security updates
- Use `npm audit` or `bun audit` to check for vulnerabilities
- Update dependencies promptly when security patches are available

### Automated Scanning

Consider integrating:
- Dependabot (GitHub)
- Snyk
- npm audit in CI/CD pipeline

## Vulnerability Disclosure

### Security Contact

Report security vulnerabilities to: **security@example.com**

### security.txt

A `security.txt` file is available at:
```
https://hare.run/.well-known/security.txt
```

### Response Timeline

- Acknowledgment: Within 48 hours
- Detailed response: Within 5 business days
- Fix deployment: Varies by severity
- Public disclosure: After fix is deployed

## Security Checklist for Developers

When adding new features:

- [ ] Validate all user inputs
- [ ] Sanitize data before displaying
- [ ] Use parameterized queries for database access
- [ ] Implement proper authentication and authorization
- [ ] Add rate limiting to new endpoints
- [ ] Include CSRF protection for state-changing operations
- [ ] Log security-relevant events
- [ ] Update this documentation if needed
- [ ] Test security measures
- [ ] Review code for common vulnerabilities (XSS, SQL injection, etc.)

## Common Vulnerabilities & Mitigations

| Vulnerability | Mitigation |
|---------------|------------|
| XSS | Input sanitization, CSP, HTML escaping |
| SQL Injection | Parameterized queries via Drizzle ORM |
| CSRF | Double-submit cookie pattern |
| Clickjacking | X-Frame-Options: DENY |
| Man-in-the-Middle | HTTPS with HSTS |
| Brute Force | Rate limiting, account lockouts |
| Session Hijacking | Secure cookies, session expiry |
| Directory Traversal | Path sanitization |
| DoS | Request size limits, rate limiting |

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Better Auth Security](https://www.better-auth.com/docs/concepts/security)
- [Cloudflare Security](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
