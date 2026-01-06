/**
 * @hare/email - Email service and React Email templates for Hare platform
 *
 * @example
 * ```ts
 * import { createEmailService, type EmailEnv } from '@hare/email'
 *
 * const emailService = createEmailService(env as EmailEnv)
 * await emailService.sendPasswordReset({ to: 'user@example.com', resetUrl: '...' })
 * ```
 */

// Service exports
export { createEmailService, EmailService, type EmailEnv, type EmailResult } from './service'

// Template exports
export { PasswordResetEmail } from './templates/password-reset'
export { WorkspaceInvitationEmail } from './templates/workspace-invitation'
