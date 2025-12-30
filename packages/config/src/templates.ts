/**
 * Agent Templates & Response Style Presets
 *
 * Pre-configured agent templates and response style presets for
 * simplified agent creation and progressive disclosure UI.
 */

import { DEFAULT_MODEL_ID } from './models'
import type { SystemToolType } from './tools'

// =============================================================================
// Response Style Presets
// =============================================================================

export type ResponseStyle = 'precise' | 'balanced' | 'creative'

export interface ResponseStylePreset {
	id: ResponseStyle
	name: string
	description: string
	config: {
		temperature: number
		topP: number
	}
}

export const RESPONSE_STYLE_PRESETS: ResponseStylePreset[] = [
	{
		id: 'precise',
		name: 'Precise',
		description: 'Factual, consistent responses. Best for support and data tasks.',
		config: {
			temperature: 0.3,
			topP: 0.9,
		},
	},
	{
		id: 'balanced',
		name: 'Balanced',
		description: 'Good mix of consistency and variety. Works for most use cases.',
		config: {
			temperature: 0.7,
			topP: 0.95,
		},
	},
	{
		id: 'creative',
		name: 'Creative',
		description: 'More varied, imaginative responses. Good for brainstorming.',
		config: {
			temperature: 1.0,
			topP: 1.0,
		},
	},
] as const

export function getResponseStyleById(id: ResponseStyle): ResponseStylePreset | undefined {
	return RESPONSE_STYLE_PRESETS.find((s) => s.id === id)
}

export function getResponseStyleFromConfig(temperature: number): ResponseStyle {
	if (temperature <= 0.4) return 'precise'
	if (temperature <= 0.8) return 'balanced'
	return 'creative'
}

// =============================================================================
// Agent Templates
// =============================================================================

export type AgentTemplateId =
	| 'customer-support'
	| 'knowledge-base'
	| 'sales-assistant'
	| 'general-assistant'

export interface AgentTemplate {
	id: AgentTemplateId
	name: string
	description: string
	icon: string // Lucide icon name
	color: string // Tailwind bg color class
	instructions: string
	model: string
	responseStyle: ResponseStyle
	suggestedToolTypes: SystemToolType[]
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
	{
		id: 'customer-support',
		name: 'Customer Support',
		description: 'Handle FAQs, route tickets, and check order status',
		icon: 'Headphones',
		color: 'bg-blue-500',
		instructions: `You are a friendly and professional customer support agent. Your role is to help customers with their questions and issues.

## Guidelines
- Be warm, patient, and empathetic in all interactions
- Ask clarifying questions when the customer's issue isn't clear
- Provide clear, step-by-step solutions when possible
- If you can't resolve an issue, explain the escalation process
- Always confirm the customer's problem is resolved before ending

## Common Topics
- Order status and tracking
- Returns and refunds
- Product questions
- Account issues
- Billing inquiries

## Tone
Keep responses concise but thorough. Use a friendly, professional tone. Avoid jargon unless the customer uses it first.`,
		model: DEFAULT_MODEL_ID,
		responseStyle: 'balanced',
		suggestedToolTypes: ['http', 'sql', 'kv'],
	},
	{
		id: 'knowledge-base',
		name: 'Knowledge Base',
		description: 'Answer questions from documentation and content',
		icon: 'BookOpen',
		color: 'bg-purple-500',
		instructions: `You are a knowledgeable assistant that helps users find information from documentation and knowledge bases.

## Guidelines
- Provide accurate, well-sourced answers from available documentation
- Quote or reference specific sections when relevant
- If information isn't available, say so clearly rather than guessing
- Suggest related topics the user might find helpful
- Break down complex topics into digestible explanations

## Response Format
- Start with a direct answer to the question
- Provide supporting details and context
- Include relevant links or references when available
- Offer to clarify or expand on any points

## Tone
Be informative and helpful. Use clear, accessible language while maintaining accuracy.`,
		model: DEFAULT_MODEL_ID,
		responseStyle: 'precise',
		suggestedToolTypes: ['search', 'r2'],
	},
	{
		id: 'sales-assistant',
		name: 'Sales Assistant',
		description: 'Qualify leads, share product info, and schedule meetings',
		icon: 'TrendingUp',
		color: 'bg-green-500',
		instructions: `You are a helpful sales assistant that guides potential customers through their buying journey.

## Guidelines
- Understand the customer's needs before suggesting solutions
- Highlight relevant features and benefits, not just specifications
- Be honest about what the product can and cannot do
- Handle objections professionally and informatively
- Guide qualified leads toward next steps (demo, trial, purchase)

## Qualification Questions
- What problem are you trying to solve?
- What's your timeline for making a decision?
- Who else is involved in the decision?
- Have you looked at other solutions?

## Tone
Be enthusiastic but not pushy. Focus on being helpful and building trust. Let the customer lead the conversation.`,
		model: DEFAULT_MODEL_ID,
		responseStyle: 'balanced',
		suggestedToolTypes: ['http', 'sql'],
	},
	{
		id: 'general-assistant',
		name: 'General Assistant',
		description: 'Flexible helper with sensible defaults for any task',
		icon: 'Sparkles',
		color: 'bg-amber-500',
		instructions: `You are a helpful AI assistant ready to assist with a wide variety of tasks.

## Guidelines
- Adapt your communication style to match the user's needs
- Ask clarifying questions when requests are ambiguous
- Provide thorough but concise responses
- Offer to break down complex tasks into steps
- Be honest about limitations

## Capabilities
- Answer questions and explain concepts
- Help with writing and editing
- Assist with analysis and problem-solving
- Provide recommendations and suggestions

## Tone
Be friendly, professional, and adaptable. Match the formality level of the user.`,
		model: DEFAULT_MODEL_ID,
		responseStyle: 'balanced',
		suggestedToolTypes: [],
	},
] as const

export function getTemplateById(id: string): AgentTemplate | undefined {
	return AGENT_TEMPLATES.find((t) => t.id === id)
}
