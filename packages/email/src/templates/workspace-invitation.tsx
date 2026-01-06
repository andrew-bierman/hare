import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Link,
	Preview,
	Section,
	Text,
} from '@react-email/components'

interface WorkspaceInvitationEmailProps {
	workspaceName: string
	inviterName: string
	inviterEmail: string
	role: string
	inviteUrl: string
	expiresAt: Date
	appName?: string
}

export function WorkspaceInvitationEmail({
	workspaceName,
	inviterName,
	inviterEmail,
	role,
	inviteUrl,
	expiresAt,
	appName = 'Hare',
}: WorkspaceInvitationEmailProps) {
	const formattedExpiry = expiresAt.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})

	return (
		<Html>
			<Head />
			<Preview>
				{inviterName} invited you to join {workspaceName} on {appName}
			</Preview>
			<Body style={main}>
				<Container style={container}>
					<Heading style={heading}>You're Invited!</Heading>
					<Text style={paragraph}>
						<strong>{inviterName}</strong> ({inviterEmail}) has invited you to join the{' '}
						<strong>"{workspaceName}"</strong> workspace on {appName} as a{' '}
						<strong>{role}</strong>.
					</Text>
					<Section style={buttonContainer}>
						<Button style={button} href={inviteUrl}>
							Accept Invitation
						</Button>
					</Section>
					<Text style={secondaryText}>
						This invitation expires on {formattedExpiry}.
					</Text>
					<Hr style={hr} />
					<Text style={footer}>
						&mdash; The {appName} Team
					</Text>
					<Text style={linkText}>
						Or copy and paste this URL into your browser:{' '}
						<Link href={inviteUrl} style={link}>
							{inviteUrl}
						</Link>
					</Text>
				</Container>
			</Body>
		</Html>
	)
}

export default WorkspaceInvitationEmail

// Styles
const main = {
	backgroundColor: '#f6f9fc',
	fontFamily:
		'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
	backgroundColor: '#ffffff',
	margin: '0 auto',
	padding: '40px 20px',
	maxWidth: '560px',
	borderRadius: '8px',
}

const heading = {
	color: '#1a1a1a',
	fontSize: '24px',
	fontWeight: '600',
	lineHeight: '1.3',
	margin: '0 0 20px',
}

const paragraph = {
	color: '#525f7f',
	fontSize: '16px',
	lineHeight: '1.5',
	margin: '0 0 24px',
}

const buttonContainer = {
	textAlign: 'center' as const,
	margin: '32px 0',
}

const button = {
	backgroundColor: '#000000',
	borderRadius: '6px',
	color: '#ffffff',
	fontSize: '16px',
	fontWeight: '600',
	textDecoration: 'none',
	textAlign: 'center' as const,
	display: 'inline-block',
	padding: '12px 24px',
}

const secondaryText = {
	color: '#8898aa',
	fontSize: '14px',
	lineHeight: '1.5',
	margin: '0 0 8px',
}

const hr = {
	borderColor: '#e6ebf1',
	margin: '32px 0',
}

const footer = {
	color: '#8898aa',
	fontSize: '12px',
	lineHeight: '1.5',
	margin: '0 0 16px',
}

const linkText = {
	color: '#8898aa',
	fontSize: '12px',
	lineHeight: '1.5',
	margin: '0',
}

const link = {
	color: '#556cd6',
	textDecoration: 'underline',
}
