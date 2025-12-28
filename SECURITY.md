# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Hare, please report it by emailing **security@example.com** (update this before deployment).

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes

We will acknowledge receipt within 48 hours and provide a detailed response within 5 business days.

## Security Features

### Authentication

- **Better Auth** with secure session management
- Session cookies with `httpOnly`, `secure`, and `sameSite: Strict`
- 7-day session expiry with automatic refresh
- API key authentication with SHA-256 hashing

### Password Security

Passwords are validated with:
- Minimum 8 characters (12+ recommended)
- Required: uppercase, lowercase, numbers, special characters
- Common password detection (24+ blocked patterns)
- Sequential character detection (123, abc, qwerty)
- Strength scoring system

```typescript
import { validatePassword } from '@/lib/security'

const result = validatePassword(password)
if (!result.valid) {
  console.error(result.errors)
}
```

### CSRF Protection

Double-submit cookie pattern with timing-safe comparison:

```typescript
import { csrfProtection } from '@/lib/security'

// Apply to state-changing routes
app.use('/api/protected/*', csrfProtection())
```

### Encryption

AES-256-GCM for sensitive data at rest:

```typescript
import { encryptData, decryptData } from '@/lib/security'

const encrypted = await encryptData(sensitiveData, secret)
const decrypted = await decryptData(encrypted, secret)
```

### Request Validation

- Body size limits (1MB JSON, 10MB forms)
- Content-Type enforcement
- Dangerous header blocking

### Security Headers

- Content Security Policy (CSP)
- Strict-Transport-Security (HSTS) with preload
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Permissions-Policy restrictions

### Audit Logging

Structured logging for security events:

```typescript
import { logAuthEvent, logSecurityEvent } from '@/lib/security'

logAuthEvent({
  type: 'auth.login',
  userId: user.id,
  success: true,
  ipAddress: req.ip,
})
```

## Security Checklist for Developers

When adding new features:

- [ ] Validate all user inputs with Zod schemas
- [ ] Use parameterized queries (Drizzle ORM)
- [ ] Apply rate limiting to new endpoints
- [ ] Add CSRF protection for state-changing operations
- [ ] Log security-relevant events
- [ ] Never log sensitive data (passwords, tokens)
- [ ] Use environment variables for secrets
- [ ] Test for common vulnerabilities

## OWASP Top 10 Coverage

| Vulnerability | Mitigation |
|---------------|------------|
| Injection | Parameterized queries via Drizzle ORM |
| Broken Auth | Better Auth + secure sessions |
| Sensitive Data Exposure | AES-256-GCM encryption |
| XXE | JSON-only APIs |
| Broken Access Control | Workspace-based authorization |
| Security Misconfiguration | Secure defaults, CSP, HSTS |
| XSS | Input sanitization, CSP |
| Insecure Deserialization | Zod schema validation |
| Vulnerable Components | Automated dependency scanning |
| Insufficient Logging | Structured audit logging |

## Automated Security

- **Weekly**: Dependency audit via GitHub Actions
- **On PR**: CodeQL static analysis
- **On PR**: Secret scanning with TruffleHog
- **On PR**: Security test suite

## Contact

For security concerns, contact: **security@example.com**

For general issues, use GitHub Issues.
