/**
 * Email Service
 *
 * A simple email service abstraction that supports multiple providers.
 * Falls back to console logging when no provider is configured.
 */

/**
 * Escape HTML special characters to prevent XSS in email templates
 */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
}

export interface EmailMessage {
	to: string
	subject: string
	text: string
	html?: string
}

export interface EmailProvider {
	send(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }>
}

/**
 * Environment configuration for email service
 */
export interface EmailEnv {
	/** Resend API key - if set, uses Resend */
	RESEND_API_KEY?: string
	/** SendGrid API key - if set, uses SendGrid */
	SENDGRID_API_KEY?: string
	/** Default from address */
	EMAIL_FROM?: string
	/** App name for email templates */
	APP_NAME?: string
	/** App URL for links in emails */
	APP_URL?: string
}

/**
 * Console email provider (development fallback)
 */
class ConsoleEmailProvider implements EmailProvider {
	async send(message: EmailMessage): Promise<{ success: boolean; messageId?: string }> {
		console.log('[Email] Sending email (console mode):')
		console.log(`  To: ${message.to}`)
		console.log(`  Subject: ${message.subject}`)
		console.log(`  Body: ${message.text}`)
		return { success: true, messageId: `console-${Date.now()}` }
	}
}

/**
 * Resend email provider
 * @see https://resend.com/docs
 */
class ResendEmailProvider implements EmailProvider {
	constructor(
		private apiKey: string,
		private from: string,
	) {}

	async send(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
		try {
			const response = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					from: this.from,
					to: message.to,
					subject: message.subject,
					text: message.text,
					html: message.html,
				}),
			})

			if (!response.ok) {
				const error = await response.text()
				return { success: false, error }
			}

			const data = (await response.json()) as { id: string }
			return { success: true, messageId: data.id }
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			}
		}
	}
}

/**
 * SendGrid email provider
 * @see https://docs.sendgrid.com/api-reference/mail-send/mail-send
 */
class SendGridEmailProvider implements EmailProvider {
	constructor(
		private apiKey: string,
		private from: string,
	) {}

	async send(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
		try {
			const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					personalizations: [{ to: [{ email: message.to }] }],
					from: { email: this.from },
					subject: message.subject,
					content: [
						{ type: 'text/plain', value: message.text },
						...(message.html ? [{ type: 'text/html', value: message.html }] : []),
					],
				}),
			})

			if (!response.ok) {
				const error = await response.text()
				return { success: false, error }
			}

			// SendGrid returns message ID in headers
			const messageId = response.headers.get('x-message-id') || `sg-${Date.now()}`
			return { success: true, messageId }
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			}
		}
	}
}

/**
 * Create an email provider based on environment configuration
 */
export function createEmailProvider(env: EmailEnv): EmailProvider {
	const from = env.EMAIL_FROM || 'noreply@hare.dev'

	if (env.RESEND_API_KEY) {
		return new ResendEmailProvider(env.RESEND_API_KEY, from)
	}

	if (env.SENDGRID_API_KEY) {
		return new SendGridEmailProvider(env.SENDGRID_API_KEY, from)
	}

	// Fallback to console logging
	console.warn('[Email] No email provider configured. Using console logging.')
	return new ConsoleEmailProvider()
}

/**
 * Email service with templated email helpers
 */
export class EmailService {
	private provider: EmailProvider
	private appName: string
	private appUrl: string

	constructor(env: EmailEnv) {
		this.provider = createEmailProvider(env)
		this.appName = env.APP_NAME || 'Hare'
		this.appUrl = env.APP_URL || 'http://localhost:3000'
	}

	/**
	 * Send a raw email
	 */
	async send(message: EmailMessage) {
		return this.provider.send(message)
	}

	/**
	 * Send a password reset email
	 */
	async sendPasswordReset(options: { to: string; resetUrl: string }) {
		const { to, resetUrl } = options
		const safeAppName = escapeHtml(this.appName)
		const safeResetUrl = escapeHtml(resetUrl)

		return this.provider.send({
			to,
			subject: `Reset your ${this.appName} password`,
			text: `You requested a password reset for your ${this.appName} account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

- The ${this.appName} Team`,
			html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #333; font-size: 24px;">Reset Your Password</h1>
  <p style="color: #555; font-size: 16px; line-height: 1.5;">
    You requested a password reset for your ${safeAppName} account.
  </p>
  <p style="margin: 30px 0;">
    <a href="${safeResetUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Reset Password
    </a>
  </p>
  <p style="color: #888; font-size: 14px;">
    This link will expire in 1 hour.
  </p>
  <p style="color: #888; font-size: 14px;">
    If you didn't request this, you can safely ignore this email.
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #888; font-size: 12px;">
    &mdash; The ${safeAppName} Team
  </p>
</body>
</html>`,
		})
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
	}) {
		const { to, workspaceName, inviterName, inviterEmail, role, inviteUrl, expiresAt } = options

		// Escape user-controlled values for HTML
		const safeWorkspaceName = escapeHtml(workspaceName)
		const safeInviterName = escapeHtml(inviterName)
		const safeInviterEmail = escapeHtml(inviterEmail)
		const safeRole = escapeHtml(role)
		const safeInviteUrl = escapeHtml(inviteUrl)
		const safeAppName = escapeHtml(this.appName)

		return this.provider.send({
			to,
			subject: `${inviterName} invited you to join ${workspaceName} on ${this.appName}`,
			text: `${inviterName} (${inviterEmail}) has invited you to join the "${workspaceName}" workspace on ${this.appName} as a ${role}.

Click the link below to accept the invitation:
${inviteUrl}

This invitation expires on ${expiresAt.toLocaleDateString()}.

- The ${this.appName} Team`,
			html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #333; font-size: 24px;">You're Invited!</h1>
  <p style="color: #555; font-size: 16px; line-height: 1.5;">
    <strong>${safeInviterName}</strong> (${safeInviterEmail}) has invited you to join the
    <strong>"${safeWorkspaceName}"</strong> workspace on ${safeAppName} as a <strong>${safeRole}</strong>.
  </p>
  <p style="margin: 30px 0;">
    <a href="${safeInviteUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Accept Invitation
    </a>
  </p>
  <p style="color: #888; font-size: 14px;">
    This invitation expires on ${expiresAt.toLocaleDateString()}.
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #888; font-size: 12px;">
    &mdash; The ${safeAppName} Team
  </p>
</body>
</html>`,
		})
	}
}

/**
 * Create an email service instance
 */
export function createEmailService(env: EmailEnv): EmailService {
	return new EmailService(env)
}
