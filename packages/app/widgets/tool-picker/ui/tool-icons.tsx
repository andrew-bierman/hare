'use client'

import type { LucideIcon } from 'lucide-react'
import {
	Brain,
	CheckCircle,
	Clock,
	Cloud,
	Code,
	CreditCard,
	Database,
	FileCode,
	FileText,
	Globe,
	Hash,
	HardDrive,
	Image,
	Key,
	Languages,
	Link2,
	Mail,
	MessageSquare,
	Palette,
	Phone,
	Plug,
	QrCode,
	RefreshCw,
	Regex,
	Rss,
	Search,
	Shield,
	Shuffle,
	Type,
	Webhook,
	Wrench,
	Zap,
} from 'lucide-react'
import type { ToolType } from '@hare/types'
import type { ToolCategory } from './types'

/**
 * Icon mapping for individual tool types.
 * Each tool type gets a specific icon for visual identification.
 */
export const TOOL_TYPE_ICONS: Record<ToolType, LucideIcon> = {
	// Cloudflare native
	http: Globe,
	sql: Database,
	kv: HardDrive,
	r2: Cloud,
	search: Search,
	// Utility
	datetime: Clock,
	json: FileCode,
	text: Type,
	math: Hash,
	uuid: Key,
	hash: Shield,
	base64: Code,
	url: Link2,
	delay: Clock,
	// Integrations
	zapier: Zap,
	webhook: Webhook,
	slack: MessageSquare,
	discord: MessageSquare,
	email: Mail,
	teams: MessageSquare,
	twilio_sms: Phone,
	make: Plug,
	n8n: Plug,
	// AI
	sentiment: Brain,
	summarize: FileText,
	translate: Languages,
	image_generate: Image,
	classify: Brain,
	ner: Brain,
	embedding: Brain,
	question_answer: MessageSquare,
	// Data
	rss: Rss,
	scrape: Globe,
	regex: Regex,
	crypto: Shield,
	json_schema: FileCode,
	csv: FileText,
	template: FileText,
	// Sandbox
	code_execute: Code,
	code_validate: CheckCircle,
	sandbox_file: FileCode,
	// Validation
	validate_email: Mail,
	validate_phone: Phone,
	validate_url: Link2,
	validate_credit_card: CreditCard,
	validate_ip: Globe,
	validate_json: FileCode,
	// Transform
	markdown: FileText,
	diff: Shuffle,
	qrcode: QrCode,
	compression: RefreshCw,
	color: Palette,
	// Custom
	custom: Wrench,
}

/**
 * Icon mapping for tool categories.
 * Used in accordion headers and category filters.
 */
export const TOOL_CATEGORY_ICONS: Record<ToolCategory, LucideIcon> = {
	all: Wrench,
	storage: HardDrive,
	database: Database,
	http: Globe,
	search: Search,
	ai: Brain,
	utility: Wrench,
	integrations: Plug,
	data: FileCode,
	sandbox: Code,
	validation: CheckCircle,
	transform: RefreshCw,
}

/**
 * Category labels for display.
 */
export const TOOL_CATEGORY_LABELS: Record<ToolCategory, string> = {
	all: 'All Tools',
	storage: 'Storage',
	database: 'Database',
	http: 'HTTP',
	search: 'Search',
	ai: 'AI',
	utility: 'Utility',
	integrations: 'Integrations',
	data: 'Data',
	sandbox: 'Sandbox',
	validation: 'Validation',
	transform: 'Transform',
}

/**
 * Map tool type to its category.
 */
export function getToolCategory(type: ToolType): ToolCategory {
	switch (type) {
		case 'kv':
		case 'r2':
			return 'storage'
		case 'sql':
			return 'database'
		case 'http':
			return 'http'
		case 'search':
			return 'search'
		case 'sentiment':
		case 'summarize':
		case 'translate':
		case 'image_generate':
		case 'classify':
		case 'ner':
		case 'embedding':
		case 'question_answer':
			return 'ai'
		case 'datetime':
		case 'json':
		case 'text':
		case 'math':
		case 'uuid':
		case 'hash':
		case 'base64':
		case 'url':
		case 'delay':
			return 'utility'
		case 'zapier':
		case 'webhook':
		case 'slack':
		case 'discord':
		case 'email':
		case 'teams':
		case 'twilio_sms':
		case 'make':
		case 'n8n':
			return 'integrations'
		case 'rss':
		case 'scrape':
		case 'regex':
		case 'crypto':
		case 'json_schema':
		case 'csv':
		case 'template':
			return 'data'
		case 'code_execute':
		case 'code_validate':
		case 'sandbox_file':
			return 'sandbox'
		case 'validate_email':
		case 'validate_phone':
		case 'validate_url':
		case 'validate_credit_card':
		case 'validate_ip':
		case 'validate_json':
			return 'validation'
		case 'markdown':
		case 'diff':
		case 'qrcode':
		case 'compression':
		case 'color':
			return 'transform'
		case 'custom':
		default:
			return 'utility'
	}
}

/**
 * Get the icon for a tool type.
 */
export function getToolIcon(type: ToolType): LucideIcon {
	return TOOL_TYPE_ICONS[type] || Wrench
}

/**
 * Get the icon for a category.
 */
export function getCategoryIcon(category: ToolCategory): LucideIcon {
	return TOOL_CATEGORY_ICONS[category] || Wrench
}
