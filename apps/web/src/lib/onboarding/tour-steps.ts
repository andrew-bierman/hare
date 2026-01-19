/**
 * Onboarding Tour Steps Configuration
 *
 * Defines the steps for the guided onboarding tour that helps new users
 * understand the key features of the dashboard.
 */

/**
 * Position of the tour tooltip relative to the target element
 */
export type TourStepPosition = 'top' | 'bottom' | 'left' | 'right'

/**
 * A single step in the onboarding tour
 */
export interface TourStep {
	/** Unique identifier for the step */
	id: string
	/** CSS selector for the target element to highlight */
	targetSelector: string
	/** Title displayed in the tour tooltip */
	title: string
	/** Description/content displayed in the tour tooltip */
	description: string
	/** Position of the tooltip relative to the target */
	position: TourStepPosition
	/** Optional: Route where this step should be shown (for multi-page tours) */
	route?: string
}

/**
 * Dashboard onboarding tour steps
 *
 * These steps guide new users through the key features of the dashboard,
 * highlighting navigation, agent creation, tools, analytics, and settings.
 */
export const DASHBOARD_TOUR_STEPS: TourStep[] = [
	{
		id: 'sidebar-navigation',
		targetSelector: '[data-tour="sidebar-nav"]',
		title: 'Dashboard Navigation',
		description:
			'Use the sidebar to navigate between different sections of your dashboard. Access your agents, tools, analytics, and settings from here.',
		position: 'right',
		route: '/dashboard',
	},
	{
		id: 'create-agent-button',
		targetSelector: '[data-tour="create-agent"]',
		title: 'Create Your First Agent',
		description:
			'Click here to create a new AI agent. Choose from templates or start from scratch to build your custom agent.',
		position: 'bottom',
		route: '/dashboard/agents',
	},
	{
		id: 'tools-page',
		targetSelector: '[data-tour="nav-tools"]',
		title: 'Tools Library',
		description:
			'Explore available tools that your agents can use. Tools enable agents to search, fetch data, transform content, and more.',
		position: 'right',
		route: '/dashboard',
	},
	{
		id: 'analytics-page',
		targetSelector: '[data-tour="nav-analytics"]',
		title: 'Analytics Dashboard',
		description:
			'Monitor your agent performance and usage metrics. Track conversations, response times, and tool usage.',
		position: 'right',
		route: '/dashboard',
	},
	{
		id: 'settings-page',
		targetSelector: '[data-tour="nav-settings"]',
		title: 'Settings & Configuration',
		description:
			'Manage your account, API keys, team members, and workspace preferences. Configure billing and security options.',
		position: 'right',
		route: '/dashboard',
	},
]

/**
 * Get tour steps for a specific route
 */
export function getTourStepsForRoute(route: string): TourStep[] {
	return DASHBOARD_TOUR_STEPS.filter((step) => !step.route || step.route === route)
}

/**
 * Get a specific tour step by ID
 */
export function getTourStepById(id: string): TourStep | undefined {
	return DASHBOARD_TOUR_STEPS.find((step) => step.id === id)
}

/**
 * Tour step IDs for type safety
 */
export const TOUR_STEP_IDS = DASHBOARD_TOUR_STEPS.map((step) => step.id) as [string, ...string[]]
export type TourStepId = (typeof TOUR_STEP_IDS)[number]
