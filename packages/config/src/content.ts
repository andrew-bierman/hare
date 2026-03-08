/**
 * UI Content Configuration
 * All static text content for the application
 */

import { APP_CONFIG } from './app'

// =============================================================================
// Landing Page Content
// =============================================================================

export const LANDING_PAGE = {
	hero: {
		badge: 'Public Beta',
		title: 'Build & Deploy',
		titleHighlight: 'AI Agents',
		titleSuffix: 'at the Edge',
		description:
			'The fastest way to create, deploy, and scale AI agents. Open source and self-hostable.',
		primaryCta: 'Start Building Free',
		secondaryCta: 'Live Demo',
	},
	stats: [
		{ value: '300+', label: 'Edge Locations', icon: 'Globe' },
		{ value: '<50ms', label: 'Global Latency', icon: 'Zap' },
		{ value: '99.99%', label: 'Uptime SLA', icon: 'Shield' },
		{ value: '59+', label: 'Built-in Tools', icon: 'Bot' },
	],
	badges: [
		{ label: 'Open Source', icon: 'GitBranch' },
		{ label: '300+ Locations', icon: 'Globe' },
		{ label: '<50ms Latency', icon: 'Zap' },
	],
	features: [
		{
			title: 'Visual Agent Builder',
			description: 'Design complex agent workflows with our intuitive drag-and-drop interface.',
			icon: 'Boxes',
		},
		{
			title: 'Instant Deployment',
			description: "Deploy to Cloudflare's global edge network in seconds.",
			icon: 'Cloud',
		},
		{
			title: 'Built-in Tools',
			description: 'SQL, HTTP, KV, R2, and vector search ready to go.',
			icon: 'Layers',
		},
		{
			title: 'Developer SDK',
			description: 'Full TypeScript SDK with type-safe APIs.',
			icon: 'Code',
		},
		{
			title: 'Real-time Streaming',
			description: 'Stream responses with built-in WebSocket support.',
			icon: 'MessageSquare',
		},
		{
			title: 'Enterprise Security',
			description: 'Security-first architecture with end-to-end encryption.',
			icon: 'Shield',
		},
	],
	steps: [
		{ title: 'Define', description: 'Configure your agent', icon: 'Bot' },
		{ title: 'Add Tools', description: 'Connect databases & APIs', icon: 'Terminal' },
		{ title: 'Deploy', description: '300+ edge locations', icon: 'Globe' },
	],
	cta: {
		title: 'Ready to build your first agent?',
		description: 'Free to start, scales with you. Hop to it!',
		primaryCta: 'Get Started Free',
		secondaryCta: 'GitHub',
	},
	codeExample: `import { Agent } from '@hare/sdk'

const agent = new Agent({
  name: 'Support Bot',
  model: 'claude-3-sonnet',
  tools: ['database', 'email'],
})

await agent.deploy()`,
} as const

// =============================================================================
// Auth Pages Content
// =============================================================================

export const AUTH_CONTENT = {
	signIn: {
		title: 'Welcome back',
		subtitle: 'Sign in to your account to continue',
		submitButton: 'Sign In',
		loadingButton: 'Signing in...',
		forgotPassword: 'Forgot password?',
		noAccount: "Don't have an account?",
		signUpLink: 'Sign up',
	},
	signUp: {
		title: 'Create an account',
		subtitle: 'Get started with Hare for free',
		submitButton: 'Create Account',
		loadingButton: 'Creating account...',
		hasAccount: 'Already have an account?',
		signInLink: 'Sign in',
		terms: 'By creating an account, you agree to our',
		termsLink: 'Terms of Service',
		privacyLink: 'Privacy Policy',
	},
	layout: {
		headline: 'Build & Deploy\nAI Agents at the Edge',
		description:
			'The fastest way to create, deploy, and scale AI agents. Hop into production in seconds with Cloudflare Workers.',
		footer: 'Built for speed - just like a hare',
	},
	fields: {
		email: { label: 'Email', placeholder: 'you@example.com' },
		password: { label: 'Password', placeholder: 'Enter your password' },
		confirmPassword: {
			label: 'Confirm Password',
			placeholder: 'Confirm your password',
		},
		name: { label: 'Full Name', placeholder: 'John Doe' },
	},
	validation: {
		passwordMinLength: 'Password must be at least 8 characters',
		passwordsNoMatch: 'Passwords do not match',
	},
	success: {
		signIn: 'Signed in successfully',
		signUp: 'Account created successfully',
		signOut: 'Signed out',
		passwordResetSent: 'Password reset link sent to your email',
		passwordReset: 'Password reset successfully',
	},
	forgotPassword: {
		title: 'Forgot password?',
		subtitle: 'Enter your email and we will send you a reset link',
		submitButton: 'Send Reset Link',
		loadingButton: 'Sending...',
		backToSignIn: 'Back to sign in',
		emailSent: {
			title: 'Check your email',
			subtitle: 'We sent a password reset link to',
			resendPrompt: "Didn't receive the email?",
			resendLink: 'Click to resend',
		},
	},
	resetPassword: {
		title: 'Reset password',
		subtitle: 'Enter your new password below',
		submitButton: 'Reset Password',
		loadingButton: 'Resetting...',
		newPassword: { label: 'New Password', placeholder: 'Enter new password' },
		confirmNewPassword: { label: 'Confirm New Password', placeholder: 'Confirm new password' },
		success: {
			title: 'Password reset!',
			subtitle: 'Your password has been reset successfully',
			signInLink: 'Sign in with your new password',
		},
		invalidToken: 'Invalid or expired reset link. Please request a new one.',
	},
} as const

// =============================================================================
// Dashboard Content
// =============================================================================

export const DASHBOARD_CONTENT = {
	header: {
		searchPlaceholder: 'Search agents, tools...',
	},
	sidebar: {
		docsLink: 'View Docs',
	},
	home: {
		title: 'Dashboard',
		subtitle: 'Overview of your agents and usage',
		newAgentButton: 'New Agent',
		noAgents: {
			title: 'No agents yet',
			description: 'Create your first AI agent to get started.',
			cta: 'Create Agent',
		},
		recentAgents: {
			title: 'Recent Agents',
			subtitle: 'Ordered by last update',
			viewAll: 'View all',
			createNew: 'Create New Agent',
		},
		stats: {
			totalAgents: { title: 'Total Agents', description: 'deployed' },
			apiCalls: { title: 'API Calls', description: 'This period' },
			tokensUsed: { title: 'Tokens Used', description: 'in / out' },
			activeTools: { title: 'Active Tools', description: 'Available' },
		},
		quickActions: [
			{
				title: 'Create Agent',
				description: 'Build a new AI agent',
				icon: 'Bot',
				href: '/dashboard/agents/new',
			},
			{
				title: 'Manage Tools',
				description: 'Configure capabilities',
				icon: 'Wrench',
				href: '/dashboard/tools',
			},
			{
				title: 'View Usage',
				description: 'Monitor performance',
				icon: 'Activity',
				href: '/dashboard/usage',
			},
		],
	},
	agents: {
		title: 'Agents',
		subtitle: 'Manage your AI agents',
		newButton: 'New Agent',
		status: {
			deployed: 'Live',
			draft: 'Draft',
			archived: 'Archived',
		},
	},
	tools: {
		title: 'Tools',
		subtitle: 'Configure agent capabilities',
	},
	usage: {
		title: 'Usage',
		subtitle: 'Monitor your API usage and costs',
	},
	settings: {
		title: 'Settings',
		subtitle: 'Manage your account and preferences',
	},
} as const

// =============================================================================
// Dev Tools Content
// =============================================================================

export const DEV_TOOLS_CONTENT = {
	title: 'Dev Tools',
	badge: 'DEV',
	sections: {
		auth: {
			title: 'Authentication',
			signIn: 'Sign In',
			signUp: 'New User',
			signOut: 'Sign Out',
		},
		quickCreate: {
			title: 'Quick Create',
			agent: 'Agent',
			workspace: 'Workspace',
		},
		cache: {
			title: 'Cache',
			refresh: 'Refresh',
			clear: 'Clear',
		},
	},
	// Random rabbit-themed names for quick agent creation
	agentNames: [
		'Hoppy Helper',
		'Bunny Bot',
		'Carrot Cruncher',
		'Warren Wizard',
		'Fluffy Assistant',
		'Thumper AI',
		'Cotton Tail',
		'Jack Rabbit',
		'Velvet Ears',
		'Meadow Mind',
	],
	agentDescriptions: [
		'A speedy assistant that hops to help',
		'Burrows deep into problems to find solutions',
		'Quick as a hare, smart as a fox',
		'Your friendly neighborhood rabbit helper',
		'Nibbles through tasks with ease',
	],
	defaultInstructions:
		'You are a helpful AI assistant with a playful rabbit personality. Be quick, helpful, and add occasional rabbit puns.',
} as const

// =============================================================================
// Common UI Text
// =============================================================================

export const UI_TEXT = {
	loading: 'Loading...',
	saving: 'Saving...',
	deleting: 'Deleting...',
	deploying: 'Deploying...',
	save: 'Save',
	cancel: 'Cancel',
	delete: 'Delete',
	edit: 'Edit',
	create: 'Create',
	deploy: 'Deploy',
	duplicate: 'Duplicate',
	back: 'Back',
	next: 'Next',
	done: 'Done',
	confirm: 'Confirm',
	close: 'Close',
	search: 'Search',
	filter: 'Filter',
	sort: 'Sort',
	refresh: 'Refresh',
	copy: 'Copy',
	copied: 'Copied!',
	viewAll: 'View all',
	learnMore: 'Learn more',
	getStarted: 'Get Started',
	signIn: 'Sign In',
	signUp: 'Sign Up',
	signOut: 'Sign Out',
	profile: 'Profile',
	settings: 'Settings',
	tools: 'tools',
	noDescription: 'No description provided',
} as const

// =============================================================================
// Error Messages
// =============================================================================

export const ERROR_MESSAGES = {
	// Auth
	AUTH_REQUIRED: 'You must be signed in to access this resource',
	AUTH_INVALID_CREDENTIALS: 'Invalid email or password',
	AUTH_SESSION_EXPIRED: 'Your session has expired. Please sign in again.',

	// Agents
	AGENT_NOT_FOUND: 'Agent not found',
	AGENT_CREATE_FAILED: 'Failed to create agent',
	AGENT_UPDATE_FAILED: 'Failed to update agent',
	AGENT_DELETE_FAILED: 'Failed to delete agent',
	AGENT_DEPLOY_FAILED: 'Failed to deploy agent',
	AGENT_NOT_DEPLOYED: 'Agent must be deployed before testing',

	// Tools
	TOOL_NOT_FOUND: 'Tool not found',
	TOOL_CREATE_FAILED: 'Failed to create tool',
	TOOL_INVALID_TYPE: 'Invalid tool type',

	// Workspaces
	WORKSPACE_NOT_FOUND: 'Workspace not found',
	WORKSPACE_CREATE_FAILED: 'Failed to create workspace',
	WORKSPACE_REQUIRED: 'A workspace is required',

	// Chat
	CHAT_FAILED: 'Failed to send message',
	CHAT_STREAM_ERROR: 'Error in chat stream',

	// Generic
	NETWORK_ERROR: 'Network error. Please check your connection.',
	UNKNOWN_ERROR: 'An unexpected error occurred',
	VALIDATION_ERROR: 'Please check your input and try again',
	RATE_LIMITED: 'Too many requests. Please try again later.',
	SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
} as const

// =============================================================================
// Dev Mode Configuration
// =============================================================================

export const DEV_CONFIG = {
	/** Test user credentials for quick sign-in */
	testUser: {
		email: 'test@example.com',
		password: 'password123',
	},
	/** Show API response times in console */
	logApiTiming: true,
	/** Show state changes in console */
	logStateChanges: true,
	/** Artificial delay for API calls (ms) - useful for testing loading states */
	apiDelay: 0,
} as const

// =============================================================================
// Type Exports
// =============================================================================

export type LandingPage = typeof LANDING_PAGE
export type AuthContent = typeof AUTH_CONTENT
export type DashboardContent = typeof DASHBOARD_CONTENT
export type ErrorMessages = typeof ERROR_MESSAGES
export type DevConfig = typeof DEV_CONFIG
