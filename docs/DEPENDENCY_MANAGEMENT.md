# Dependency Management and Security Updates

This guide outlines the process for managing dependencies and handling security updates in the Hare platform.

## Regular Maintenance Schedule

### Weekly
- Check for security advisories via GitHub Dependabot alerts
- Review and address critical vulnerabilities

### Monthly
- Run dependency audit: `bun audit`
- Check for outdated packages: `bun outdated`
- Update patch versions: `bun update`
- Review changelogs for breaking changes

### Quarterly
- Review and update minor versions
- Test thoroughly in development environment
- Update major versions one at a time with careful testing

## Checking for Vulnerabilities

### Using Bun

```bash
# Check for known vulnerabilities
bun audit

# Check for outdated packages
bun outdated

# Update packages to latest patch versions
bun update
```

### Using npm (alternative)

```bash
# Check for vulnerabilities
npm audit

# Fix automatically (where possible)
npm audit fix

# See detailed report
npm audit --json
```

## Security Update Process

### 1. Identify the Vulnerability

Check:
- GitHub Dependabot alerts (Settings → Security → Dependabot alerts)
- `bun audit` output
- Security mailing lists for dependencies
- CVE databases

### 2. Assess Impact

Determine:
- **Severity**: Critical, High, Medium, Low
- **Exploitability**: Is it exploitable in our context?
- **Affected Components**: Which parts of the application are affected?
- **User Impact**: Are user data or credentials at risk?

### 3. Update Priority

| Severity | Response Time | Action |
|----------|---------------|--------|
| Critical | Within 24 hours | Immediate patch and deploy |
| High | Within 1 week | Scheduled update and test |
| Medium | Within 2 weeks | Include in next sprint |
| Low | Within 1 month | Batch with other updates |

### 4. Update Process

```bash
# 1. Create a new branch
git checkout -b security/update-package-name

# 2. Update the specific package
bun update package-name

# 3. Run tests
bun test
bun run typecheck
bun run lint

# 4. Test the application
bun run dev
# Manual testing of affected features

# 5. Build for production
bun run build

# 6. Commit and push
git add .
git commit -m "security: update package-name to fix CVE-XXXX-XXXX"
git push origin security/update-package-name

# 7. Create PR and get review
# 8. Deploy after approval
```

### 5. Verification

After updating:
- ✅ Run `bun audit` to confirm vulnerability is fixed
- ✅ Run full test suite
- ✅ Check for breaking changes in changelog
- ✅ Test affected functionality manually
- ✅ Deploy to staging environment first
- ✅ Monitor for errors after production deployment

## Critical Dependencies

These dependencies require extra attention due to security implications:

### Authentication & Authorization
- `better-auth` - Authentication library
- `drizzle-orm` - Database ORM (SQL injection prevention)

### API & Security
- `hono` - Web framework
- `@hono/zod-openapi` - API validation
- `@elithrar/workers-hono-rate-limit` - Rate limiting

### Data Validation
- `zod` - Schema validation
- `drizzle-zod` - Database schema validation

### Cryptography
- Built-in `crypto` module (Web Crypto API)

## Automated Security Scanning

### GitHub Actions

The repository includes automated security scanning:

```yaml
# .github/workflows/security-audit.yml
- Dependency audit (weekly)
- Secret scanning (on every push)
- CodeQL analysis (on PRs)
- Security unit tests
```

## Handling Breaking Changes

When updates include breaking changes:

1. **Read the Migration Guide**: Check package changelog/docs
2. **Update Code**: Make necessary code changes
3. **Update Tests**: Ensure tests reflect new API
4. **Update Documentation**: Update any affected documentation
5. **Test Thoroughly**: Extra testing for breaking changes
6. **Staged Rollout**: Deploy to staging first

## Common Vulnerabilities to Watch For

### 1. Prototype Pollution
**Risk**: Can lead to RCE or privilege escalation
**Check**: Review any deep merge or clone utilities
**Fix**: Update affected packages, use safe alternatives

### 2. ReDoS (Regular Expression Denial of Service)
**Risk**: Can cause application to hang
**Check**: Review regex patterns in validation
**Fix**: Simplify regex or add timeouts

### 3. Path Traversal
**Risk**: Unauthorized file access
**Check**: File upload/download functionality
**Fix**: Use path sanitization (already implemented)

### 4. SQL Injection
**Risk**: Database compromise
**Check**: All database queries
**Fix**: Use parameterized queries (Drizzle ORM handles this)

### 5. XSS (Cross-Site Scripting)
**Risk**: Session hijacking, data theft
**Check**: User input display, HTML rendering
**Fix**: Sanitize output (already implemented)

## Emergency Security Patch Process

For critical vulnerabilities requiring immediate action:

### 1. Assess (< 1 hour)
- Confirm vulnerability affects our deployment
- Determine if exploit is active in the wild
- Identify affected versions

### 2. Patch (< 4 hours)
```bash
# Hot-fix branch from main
git checkout -b hotfix/critical-security-CVE-XXXX

# Update vulnerable package
bun update vulnerable-package

# Minimal testing (critical paths only)
bun test
bun run build

# Deploy immediately
git commit -m "SECURITY: Emergency patch for CVE-XXXX-XXXX"
git push && deploy to production
```

### 3. Communicate (< 24 hours)
- Notify team via Slack/email
- Document in incident report
- Update security advisory if public-facing

### 4. Follow-up (< 1 week)
- Conduct thorough testing
- Review why this wasn't caught earlier
- Implement preventive measures

## Security Contacts

- **Security Team**: security@example.com
- **Emergency**: [Phone number for critical issues]
- **Dependabot Alerts**: Check GitHub notifications daily

## Resources

### Vulnerability Databases
- [GitHub Advisory Database](https://github.com/advisories)
- [npm Advisory Database](https://github.com/advisories?query=ecosystem%3Anpm)
- [CVE Database](https://cve.mitre.org/)
- [Snyk Vulnerability DB](https://security.snyk.io/)

### Security News
- [The Daily Swig](https://portswigger.net/daily-swig)
- [Bleeping Computer](https://www.bleepingcomputer.com/)
- [OWASP](https://owasp.org/)

### Tools
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [Socket.dev](https://socket.dev/)
- [Renovate](https://www.mend.io/renovate/)

## Checklist for Security Updates

- [ ] Identify the vulnerability and affected versions
- [ ] Check if our version is affected
- [ ] Review CVE details and exploit availability
- [ ] Create security update branch
- [ ] Update the vulnerable package
- [ ] Run automated tests
- [ ] Perform manual security testing
- [ ] Check for breaking changes
- [ ] Update changelog/documentation
- [ ] Create PR with security label
- [ ] Get code review
- [ ] Deploy to staging
- [ ] Monitor for issues
- [ ] Deploy to production
- [ ] Verify vulnerability is fixed
- [ ] Document in security log
