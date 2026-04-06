---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, security]
dependencies: []
---

# Document Upload Missing File Validation

## Problem Statement

Document upload has no MIME type validation (magic bytes), no streaming size enforcement, no per-workspace quotas, and no protection against malicious PDFs that could cause `toMarkdown()` to OOM.

## Findings

- No magic byte validation — user can claim any Content-Type
- Size limit (25MB) not enforced at stream level — could buffer entire file before checking
- Malicious PDFs can contain zip bombs or deeply nested objects
- No per-workspace document count or storage quotas
- `toMarkdown()` output not size-limited — 1MB PDF could produce 100MB markdown
- Source: Security sentinel agent

## Proposed Solutions

### Option 1: Validate + Limit + Quota (Recommended)

**Approach:**
1. R2 presigned URLs for upload (bypass Worker memory)
2. Validate file magic bytes after upload (check R2 object)
3. 25MB max file size (checked via R2 object metadata)
4. Limit toMarkdown() output to 10MB
5. Per-workspace quotas: max 100 documents, 500MB total storage

**Effort:** Medium (2-3 hours)
**Risk:** Low

## Acceptance Criteria

- [ ] File type validated via magic bytes
- [ ] File size enforced via R2 metadata before processing
- [ ] toMarkdown() output truncated at reasonable limit
- [ ] Per-workspace document quotas enforced
