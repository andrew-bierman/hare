/**
 * Audit Logging Utility
 *
 * Re-exports the audit logging function from @hare/api.
 */

export { logAudit, type LogAuditInput } from '@hare/api'

// Legacy alias for backwards compatibility
export { logAudit as logAuditEvent, type LogAuditInput as LogAuditEventInput } from '@hare/api'
