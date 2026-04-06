/**
 * Tests for @hare/config - Smoke tests and export verification
 */

import { describe, expect, it } from 'vitest'
import {
	ACTIVITY_EVENT_TYPES,
	AGENT_STATUSES,
	API_MESSAGE_ROLES,
	AUDIT_ACTIONS,
	clientEnv,
	config,
	DEPLOYMENT_STATUSES,
	EXECUTION_STATUSES,
	EXPORT_FORMATS,
	getAvailableTools,
	getModelById,
	getModelName,
	getModelsByProvider,
	getProviderLabel,
	getResponseStyleById,
	getResponseStyleFromConfig,
	getTemplateById,
	HTTP_METHODS,
	INVITATION_STATUSES,
	MEMBER_ROLES,
	MESSAGE_ROLES,
	NODE_ENVS,
	PLAN_IDS,
	type ResponseStyle,
	SCHEDULE_STATUSES,
	SCHEDULE_TYPES,
	serverEnv,
	TOOL_TYPES,
	USAGE_GROUP_BY_OPTIONS,
	VALIDATION_ISSUE_SEVERITIES,
	WIDGET_POSITIONS,
	WORKSPACE_ROLES,
} from '../index'

describe('@hare/config exports', () => {
	it('exports the main config object', () => {
		expect(config).toBeDefined()
		expect(typeof config).toBe('object')
	})

	it('exports clientEnv and serverEnv', () => {
		expect(clientEnv).toBeDefined()
		expect(serverEnv).toBeDefined()
	})

	it('does not export undefined values', () => {
		const exports = {
			config,
			getModelById,
			getModelName,
			getModelsByProvider,
			getProviderLabel,
			getAvailableTools,
			getTemplateById,
			getResponseStyleById,
			getResponseStyleFromConfig,
			TOOL_TYPES,
			AGENT_STATUSES,
			DEPLOYMENT_STATUSES,
		}
		for (const [key, value] of Object.entries(exports)) {
			expect(value, `${key} should be defined`).toBeDefined()
		}
	})
})

describe('config object structure', () => {
	it('has expected top-level sections', () => {
		expect(config.app).toBeDefined()
		expect(config.features).toBeDefined()
		expect(config.models).toBeDefined()
		expect(config.agents).toBeDefined()
		expect(config.tools).toBeDefined()
		expect(config.enums).toBeDefined()
		expect(config.ui).toBeDefined()
		expect(config.content).toBeDefined()
		expect(config.navigation).toBeDefined()
		expect(config.validation).toBeDefined()
		expect(config.http).toBeDefined()
		expect(config.cookies).toBeDefined()
		expect(config.security).toBeDefined()
		expect(config.logging).toBeDefined()
		expect(config.defaults).toBeDefined()
	})

	it('has correct app metadata', () => {
		expect(config.app.name).toBe('Hare')
		expect(config.app.version).toMatch(/^\d+\.\d+\.\d+/)
		expect(config.app.stage).toBeTruthy()
	})

	it('has a non-empty models list', () => {
		expect(config.models.list.length).toBeGreaterThan(0)
		expect(config.models.defaultId).toBeTruthy()
		expect(typeof config.models.defaultId).toBe('string')
	})

	it('has agent templates', () => {
		expect(config.agents.templates.length).toBeGreaterThan(0)
		for (const template of config.agents.templates) {
			expect(template.id).toBeTruthy()
			expect(template.name).toBeTruthy()
			expect(template.instructions).toBeTruthy()
		}
	})

	it('has response styles', () => {
		expect(config.agents.responseStyles).toHaveLength(3)
		const ids = config.agents.responseStyles.map((s) => s.id)
		expect(ids).toContain('precise')
		expect(ids).toContain('balanced')
		expect(ids).toContain('creative')
	})

	it('has system tools with required properties', () => {
		expect(config.tools.system.length).toBeGreaterThan(0)
		for (const tool of config.tools.system) {
			expect(tool.type).toBeTruthy()
			expect(tool.name).toBeTruthy()
			expect(tool.description).toBeTruthy()
			expect(typeof tool.available).toBe('boolean')
		}
	})
})

describe('helper functions', () => {
	describe('getModelById', () => {
		it('returns a model for the default model ID', () => {
			const model = getModelById(config.models.defaultId)
			expect(model).toBeDefined()
			expect(model!.name).toBeTruthy()
			expect(model!.provider).toBeTruthy()
		})

		it('returns undefined for an unknown ID', () => {
			expect(getModelById('nonexistent-model')).toBeUndefined()
		})
	})

	describe('getModelName', () => {
		it('returns a non-empty name for a known model ID', () => {
			const defaultModel = config.models.list[0]
			if (!defaultModel) throw new Error('No models configured')
			const name = getModelName(defaultModel.id)
			expect(name).toBeTruthy()
			expect(typeof name).toBe('string')
		})

		it('returns the ID itself for an unknown model', () => {
			expect(getModelName('unknown-model')).toBe('unknown-model')
		})
	})

	describe('getModelsByProvider', () => {
		it('returns a Map grouped by provider', () => {
			const grouped = getModelsByProvider()
			expect(grouped).toBeInstanceOf(Map)
			expect(grouped.has('anthropic')).toBe(true)
			expect(grouped.has('openai')).toBe(true)
			expect(grouped.has('workers-ai')).toBe(true)
		})

		it('groups models correctly', () => {
			const grouped = getModelsByProvider()
			const anthropicModels = grouped.get('anthropic')!
			expect(anthropicModels.length).toBeGreaterThan(0)
			for (const model of anthropicModels) {
				expect(model.provider).toBe('anthropic')
			}
		})
	})

	describe('getProviderLabel', () => {
		it('returns display labels for providers', () => {
			expect(getProviderLabel('anthropic')).toBe('Anthropic')
			expect(getProviderLabel('openai')).toBe('OpenAI')
			expect(getProviderLabel('workers-ai')).toBe('Cloudflare Workers AI')
		})
	})

	describe('getAvailableTools', () => {
		it('returns only available tools', () => {
			const tools = getAvailableTools()
			expect(tools.length).toBeGreaterThan(0)
			for (const tool of tools) {
				expect(tool.available).toBe(true)
			}
		})

		it('excludes unavailable tools', () => {
			const available = getAvailableTools()
			const total = config.tools.system
			expect(available.length).toBeLessThanOrEqual(total.length)
		})
	})

	describe('getTemplateById', () => {
		it('returns a template for a known ID', () => {
			const template = getTemplateById('customer-support')
			expect(template).toBeDefined()
			expect(template!.name).toBe('Customer Support')
		})

		it('returns undefined for an unknown ID', () => {
			expect(getTemplateById('nonexistent')).toBeUndefined()
		})
	})

	describe('getResponseStyleById', () => {
		it('returns a style for a known ID', () => {
			const style = getResponseStyleById('precise')
			expect(style).toBeDefined()
			expect(style!.config.temperature).toBe(0.3)
		})

		it('returns undefined for an unknown ID', () => {
			expect(getResponseStyleById('nonexistent' as unknown as ResponseStyle)).toBeUndefined()
		})
	})

	describe('getResponseStyleFromConfig', () => {
		it('returns precise for low temperature', () => {
			expect(getResponseStyleFromConfig(0.1)).toBe('precise')
			expect(getResponseStyleFromConfig(0.3)).toBe('precise')
			expect(getResponseStyleFromConfig(0.4)).toBe('precise')
		})

		it('returns balanced for medium temperature', () => {
			expect(getResponseStyleFromConfig(0.5)).toBe('balanced')
			expect(getResponseStyleFromConfig(0.7)).toBe('balanced')
			expect(getResponseStyleFromConfig(0.8)).toBe('balanced')
		})

		it('returns creative for high temperature', () => {
			expect(getResponseStyleFromConfig(0.9)).toBe('creative')
			expect(getResponseStyleFromConfig(1.0)).toBe('creative')
		})
	})
})

describe('enum arrays', () => {
	it('exports non-empty enum arrays', () => {
		const enumArrays = {
			TOOL_TYPES,
			AGENT_STATUSES,
			DEPLOYMENT_STATUSES,
			SCHEDULE_STATUSES,
			EXECUTION_STATUSES,
			INVITATION_STATUSES,
			WORKSPACE_ROLES,
			MEMBER_ROLES,
			MESSAGE_ROLES,
			API_MESSAGE_ROLES,
			SCHEDULE_TYPES,
			EXPORT_FORMATS,
			USAGE_GROUP_BY_OPTIONS,
			VALIDATION_ISSUE_SEVERITIES,
			HTTP_METHODS,
			NODE_ENVS,
			PLAN_IDS,
			WIDGET_POSITIONS,
			AUDIT_ACTIONS,
			ACTIVITY_EVENT_TYPES,
		}

		for (const [name, arr] of Object.entries(enumArrays)) {
			expect(Array.isArray(arr), `${name} should be an array`).toBe(true)
			expect(arr.length, `${name} should not be empty`).toBeGreaterThan(0)
		}
	})

	it('AGENT_STATUSES contains expected values', () => {
		expect(AGENT_STATUSES).toContain('draft')
		expect(AGENT_STATUSES).toContain('deployed')
		expect(AGENT_STATUSES).toContain('archived')
	})

	it('MESSAGE_ROLES contains expected values', () => {
		expect(MESSAGE_ROLES).toContain('user')
		expect(MESSAGE_ROLES).toContain('assistant')
		expect(MESSAGE_ROLES).toContain('system')
		expect(MESSAGE_ROLES).toContain('tool')
	})

	it('API_MESSAGE_ROLES excludes tool role', () => {
		expect(API_MESSAGE_ROLES).toContain('user')
		expect(API_MESSAGE_ROLES).toContain('assistant')
		expect(API_MESSAGE_ROLES).toContain('system')
		expect(API_MESSAGE_ROLES).not.toContain('tool')
	})

	it('HTTP_METHODS contains standard methods', () => {
		expect(HTTP_METHODS).toContain('GET')
		expect(HTTP_METHODS).toContain('POST')
		expect(HTTP_METHODS).toContain('PUT')
		expect(HTTP_METHODS).toContain('DELETE')
	})
})
