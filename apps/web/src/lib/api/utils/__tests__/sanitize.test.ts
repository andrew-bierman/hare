import { describe, expect, it } from 'vitest'
import {
	getRateLimitKey,
	isSafeString,
	sanitizeEmail,
	sanitizeFilename,
	sanitizeHtml,
	sanitizeMetadata,
	sanitizeUrl,
	sanitizeUserInput,
	truncateString,
	validateAgentInstructions,
} from '../sanitize'

describe('sanitizeHtml', () => {
	it('should escape HTML entities', () => {
		expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
			'&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;',
		)
		expect(sanitizeHtml("Hello <b>World</b> & 'test'")).toBe(
			'Hello &lt;b&gt;World&lt;&#x2F;b&gt; &amp; &#x27;test&#x27;',
		)
	})

	it('should handle empty strings', () => {
		expect(sanitizeHtml('')).toBe('')
	})
})

describe('sanitizeUserInput', () => {
	it('should remove control characters', () => {
		expect(sanitizeUserInput('Hello\x00World')).toBe('HelloWorld')
		expect(sanitizeUserInput('Test\x08\x1FString')).toBe('TestString')
	})

	it('should normalize whitespace', () => {
		expect(sanitizeUserInput('Hello   World')).toBe('Hello World')
		expect(sanitizeUserInput('  Trim me  ')).toBe('Trim me')
	})

	it('should preserve newlines and tabs', () => {
		expect(sanitizeUserInput('Hello\nWorld\tTest')).toBe('Hello World Test')
	})
})

describe('sanitizeEmail', () => {
	it('should validate and lowercase emails', () => {
		expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com')
		expect(sanitizeEmail('  test@test.com  ')).toBe('test@test.com')
	})

	it('should throw on invalid emails', () => {
		expect(() => sanitizeEmail('not-an-email')).toThrow('Invalid email format')
		expect(() => sanitizeEmail('missing@')).toThrow('Invalid email format')
		expect(() => sanitizeEmail('@missing.com')).toThrow('Invalid email format')
	})
})

describe('sanitizeUrl', () => {
	it('should allow safe URLs', () => {
		expect(sanitizeUrl('https://example.com')).toBe('https://example.com/')
		expect(sanitizeUrl('http://test.com/path')).toBe('http://test.com/path')
		expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com')
	})

	it('should allow relative URLs', () => {
		expect(sanitizeUrl('/path/to/resource')).toBe('/path/to/resource')
	})

	it('should reject dangerous protocols', () => {
		expect(() => sanitizeUrl('javascript:alert(1)')).toThrow('Invalid URL protocol')
		expect(() => sanitizeUrl('data:text/html,<script>alert(1)</script>')).toThrow(
			'Invalid URL protocol',
		)
	})

	it('should reject malformed URLs', () => {
		expect(() => sanitizeUrl('not a url')).toThrow('Invalid URL format')
	})
})

describe('sanitizeFilename', () => {
	it('should remove path traversal attempts', () => {
		expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd')
		expect(sanitizeFilename('..\\..\\windows\\system32')).toBe('windowssystem32')
	})

	it('should remove path separators', () => {
		expect(sanitizeFilename('path/to/file.txt')).toBe('pathtofile.txt')
		expect(sanitizeFilename('windows\\path\\file.txt')).toBe('windowspathfile.txt')
	})

	it('should remove null bytes', () => {
		expect(sanitizeFilename('file\x00.txt')).toBe('file.txt')
	})

	it('should limit length', () => {
		const longName = 'a'.repeat(300)
		expect(sanitizeFilename(longName)).toHaveLength(255)
	})

	it('should throw on empty filenames', () => {
		expect(() => sanitizeFilename('')).toThrow('Invalid filename')
		expect(() => sanitizeFilename('   ')).toThrow('Invalid filename')
	})
})

describe('sanitizeMetadata', () => {
	it('should remove dangerous keys', () => {
		const input = {
			name: 'test',
			__proto__: { admin: true },
			constructor: 'bad',
			prototype: 'also bad',
		}
		const result = sanitizeMetadata(input)
		expect(result).toEqual({ name: 'test' })
	})

	it('should sanitize nested objects', () => {
		const input = {
			user: {
				name: 'John',
				__secret: 'hidden',
			},
			data: 'test',
		}
		const result = sanitizeMetadata(input)
		expect(result).toEqual({
			user: { name: 'John' },
			data: 'test',
		})
	})

	it('should sanitize strings in arrays', () => {
		const input = {
			tags: ['test  ', '  spaces  ', 'normal'],
		}
		const result = sanitizeMetadata(input)
		expect(result.tags).toEqual(['test', 'spaces', 'normal'])
	})

	it('should preserve safe values', () => {
		const input = {
			string: 'text',
			number: 42,
			boolean: true,
			null: null,
		}
		const result = sanitizeMetadata(input)
		expect(result).toEqual(input)
	})
})

describe('validateAgentInstructions', () => {
	it('should accept safe instructions', () => {
		const result = validateAgentInstructions('You are a helpful assistant.')
		expect(result.valid).toBe(true)
		expect(result.issues).toHaveLength(0)
	})

	it('should detect suspicious patterns', () => {
		const result = validateAgentInstructions('Call eval() to run this code')
		expect(result.valid).toBe(false)
		expect(result.issues.length).toBeGreaterThan(0)
	})

	it('should detect script tags', () => {
		const result = validateAgentInstructions('Instructions with <script>alert(1)</script>')
		expect(result.valid).toBe(false)
		expect(result.issues.length).toBeGreaterThan(0)
	})

	it('should reject extremely long instructions', () => {
		const longInstructions = 'a'.repeat(60000)
		const result = validateAgentInstructions(longInstructions)
		expect(result.valid).toBe(false)
		expect(result.issues).toContain('Instructions exceed maximum length')
	})
})

describe('isSafeString', () => {
	it('should validate safe strings', () => {
		expect(isSafeString('hello-world_123')).toBe(true)
		expect(isSafeString('valid_identifier')).toBe(true)
	})

	it('should reject unsafe characters', () => {
		expect(isSafeString('hello world')).toBe(false) // space
		expect(isSafeString('test@email')).toBe(false) // @
		expect(isSafeString('../path')).toBe(false) // dot and slash
	})

	it('should accept custom patterns', () => {
		const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
		expect(isSafeString('test@example.com', emailPattern)).toBe(true)
		expect(isSafeString('not-an-email', emailPattern)).toBe(false)
	})
})

describe('getRateLimitKey', () => {
	it('should generate consistent keys', () => {
		const key1 = getRateLimitKey('user123', '/api/chat')
		const key2 = getRateLimitKey('user123', '/api/chat')
		expect(key1).toBe(key2)
	})

	it('should sanitize inputs', () => {
		const key = getRateLimitKey('user@#$123', '/api/chat/../../../etc')
		expect(key).toMatch(/^rate:[a-zA-Z0-9_-]+:[a-zA-Z0-9/_-]+$/)
	})
})

describe('truncateString', () => {
	it('should truncate long strings', () => {
		expect(truncateString('This is a very long string', 10)).toBe('This is...')
	})

	it('should not truncate short strings', () => {
		expect(truncateString('Short', 10)).toBe('Short')
	})

	it('should handle exact length', () => {
		expect(truncateString('Exactly10!', 10)).toBe('Exactly10!')
	})
})
