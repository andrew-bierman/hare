/**
 * Email Service
 *
 * Uses Resend SDK with React Email templates for transactional emails.
 * Falls back to console logging when no API key is configured.
 *
 * @see https://resend.com/docs
 * @see https://react.email
 */

import { getErrorMessage } from '@hare/checks'
import { Resend } from 'resend'
import { PasswordResetEmail } from './templates/password-reset'
import { WorkspaceInvitationEmail } from './templates/workspace-invitation'

/**
 * Environment configuration for email service
 */
export interface EmailEnv {
	/** Resend API key */
	RESEND_API_KEY?: string
	/** Default from address */
	EMAIL_FROM?: string
	/** App name for email templates */
	APP_NAME?: string
	/** App URL for links in emails */
	APP_URL?: string
}

/**
 * Email send result
 */
export interface EmailResult {
	success: boolean
	messageId?: string
	error?: string
}

/**
 * Email service using Resend with React Email templates
 */
export class EmailService {
	private resend: Resend | null
	private from: string
	private appName: string
	private isDev: boolean

	constructor(env: EmailEnv) {
		this.from = env.EMAIL_FROM || 'Hare <noreply@hare.dev>'
		this.appName = env.APP_NAME || 'Hare'
		this.isDev = !env.RESEND_API_KEY

		if (env.RESEND_API_KEY) {
			this.resend = new Resend(env.RESEND_API_KEY)
		} else {
			this.resend = null
			// biome-ignore lint/suspicious/noConsole: server logging
			console.warn('[Email] No RESEND_API_KEY configured. Emails will be logged to console.')
		}
	}

	/**
	 * Send a password reset email
	 */
	async sendPasswordReset(options: { to: string; resetUrl: string }): Promise<EmailResult> {
		const { to, resetUrl } = options

		if (this.isDev || !this.resend) {
			// biome-ignore lint/suspicious/noConsole: server logging
			console.log('[Email] Password reset email (dev mode):')
			// biome-ignore lint/suspicious/noConsole: server logging
			console.log(`  To: ${to}`)
			// biome-ignore lint/suspicious/noConsole: server logging
			console.log(`  Reset URL: ${resetUrl}`)
			return { success: true, messageId: `dev-${Date.now()}` }
		}

		try {
			const { data, error } = await this.resend.emails.send({
				from: this.from,
				to,
				subject: `Reset your ${this.appName} password`,
				react: PasswordResetEmail({
					resetUrl,
					appName: this.appName,
				}),
			})

			if (error) {
				return { success: false, error: error.message }
			}

			return { success: true, messageId: data?.id }
		} catch (error) {
			return {
				success: false,
				error: getErrorMessage(error),
			}
		}
	}

	/**
	 * Send a workspace invitation email
	 */
	async sendWorkspaceInvitation(options: {
		to: string
		workspaceName: string
		inviterName: string
		inviterEmail: string
		role: string
		inviteUrl: string
		expiresAt: Date
	}): Promise<EmailResult> {
		const { to, workspaceName, inviterName, inviterEmail, role, inviteUrl, expiresAt } = options

		if (this.isDev || !this.resend) {
			// biome-ignore lint/suspicious/noConsole: server logging
			console.log('[Email] Workspace invitation email (dev mode):')
			// biome-ignore lint/suspicious/noConsole: server logging
			console.log(`  To: ${to}`)
			// biome-ignore lint/suspicious/noConsole: server logging
			console.log(`  Workspace: ${workspaceName}`)
			// biome-ignore lint/suspicious/noConsole: server logging
			console.log(`  Inviter: ${inviterName} (${inviterEmail})`)
			// biome-ignore lint/suspicious/noConsole: server logging
			console.log(`  Role: ${role}`)
			// biome-ignore lint/suspicious/noConsole: server logging
			console.log(`  Invite URL: ${inviteUrl}`)
			// biome-ignore lint/suspicious/noConsole: server logging
			console.log(`  Expires: ${expiresAt.toISOString()}`)
			return { success: true, messageId: `dev-${Date.now()}` }
		}

		try {
			const { data, error } = await this.resend.emails.send({
				from: this.from,
				to,
				subject: `${inviterName} invited you to join ${workspaceName} on ${this.appName}`,
				react: WorkspaceInvitationEmail({
					workspaceName,
					inviterName,
					inviterEmail,
					role,
					inviteUrl,
					expiresAt,
					appName: this.appName,
				}),
			})

			if (error) {
				return { success: false, error: error.message }
			}

			return { success: true, messageId: data?.id }
		} catch (error) {
			return {
				success: false,
				error: getErrorMessage(error),
			}
		}
	}
}

/**
 * Create an email service instance
 */
export function createEmailService(env: EmailEnv): EmailService {
	return new EmailService(env)
}
