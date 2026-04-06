import { z } from 'zod'

// ==========================================
// DATETIME SCHEMAS
// ==========================================

/** Output for datetime 'now' operation */
export const DatetimeNowOutputSchema = z.object({
	iso: z.string(),
	unix: z.number(),
	formatted: z.string(),
	timezone: z.string().optional(),
})

/** Output for datetime 'format' operation */
export const DatetimeFormatOutputSchema = z.object({
	original: z.string().optional(),
	formatted: z.string(),
	iso: z.string(),
})

/** Output for datetime 'parse' operation */
export const DatetimeParseOutputSchema = z.object({
	original: z.string().optional(),
	iso: z.string(),
	unix: z.number(),
	year: z.number(),
	month: z.number(),
	day: z.number(),
	hour: z.number(),
	minute: z.number(),
	second: z.number(),
	dayOfWeek: z.string(),
})

/** Output for datetime 'diff' operation */
export const DatetimeDiffOutputSchema = z.object({
	milliseconds: z.number(),
	seconds: z.number(),
	minutes: z.number(),
	hours: z.number(),
	days: z.number(),
	weeks: z.number(),
	humanReadable: z.string(),
})

/** Output for datetime 'add'/'subtract' operations */
export const DatetimeAddSubtractOutputSchema = z.object({
	original: z.string(),
	result: z.string(),
	formatted: z.string(),
})

/** Combined output schema for datetime tool */
export const DatetimeOutputSchema = z.union([
	DatetimeNowOutputSchema,
	DatetimeFormatOutputSchema,
	DatetimeParseOutputSchema,
	DatetimeDiffOutputSchema,
	DatetimeAddSubtractOutputSchema,
])

// ==========================================
// JSON SCHEMAS
// ==========================================

/** Output for JSON 'parse' operation */
export const JsonParseOutputSchema = z.object({
	result: z.unknown(),
	type: z.string(),
})

/** Output for JSON 'stringify' operation */
export const JsonStringifyOutputSchema = z.object({
	result: z.string(),
	length: z.number(),
})

/** Output for JSON 'get' operation */
export const JsonGetOutputSchema = z.object({
	path: z.string(),
	value: z.unknown(),
	found: z.boolean(),
})

/** Output for JSON 'set'/'delete'/'merge' operations */
export const JsonMutateOutputSchema = z.object({
	result: z.unknown(),
})

/** Output for JSON 'keys' operation */
export const JsonKeysOutputSchema = z.object({
	keys: z.array(z.string()),
	count: z.number(),
})

/** Output for JSON 'values' operation */
export const JsonValuesOutputSchema = z.object({
	values: z.array(z.unknown()),
	count: z.number(),
})

/** Output for JSON 'flatten' operation */
export const JsonFlattenOutputSchema = z.object({
	result: z.record(z.string(), z.unknown()),
	keys: z.array(z.string()),
})

/** Combined output schema for JSON tool - using passthrough to preserve all keys during union matching */
export const JsonOutputSchema = z.union([
	JsonParseOutputSchema.passthrough(),
	JsonStringifyOutputSchema.passthrough(),
	JsonGetOutputSchema.passthrough(),
	JsonMutateOutputSchema.passthrough(),
	JsonKeysOutputSchema.passthrough(),
	JsonValuesOutputSchema.passthrough(),
	JsonFlattenOutputSchema.passthrough(),
])

// ==========================================
// TEXT SCHEMAS
// ==========================================

/** Output for text 'split' operation */
export const TextSplitOutputSchema = z.object({
	result: z.array(z.string()),
	count: z.number(),
})

/** Output for text 'join'/'replace'/'replaceAll'/'uppercase'/'lowercase'/'capitalize'/'titleCase'/'trim'/'padStart'/'padEnd'/'reverse'/'slug'/'camelCase'/'snakeCase'/'kebabCase'/'repeat' operations */
export const TextResultOutputSchema = z.object({
	result: z.string(),
})

/** Output for text 'truncate' operation */
export const TextTruncateOutputSchema = z.object({
	result: z.string(),
	truncated: z.boolean(),
})

/** Output for text 'wordCount' operation */
export const TextWordCountOutputSchema = z.object({
	count: z.number(),
	words: z.array(z.string()),
})

/** Output for text 'charCount' operation */
export const TextCharCountOutputSchema = z.object({
	total: z.number(),
	withoutSpaces: z.number(),
	letters: z.number(),
	digits: z.number(),
})

/** Output for text 'lines' operation */
export const TextLinesOutputSchema = z.object({
	lines: z.array(z.string()),
	count: z.number(),
})

/** Output for text 'extract' operation */
export const TextExtractOutputSchema = z.object({
	matches: z.array(z.string()),
	count: z.number(),
})

/** Output for text 'contains' operation */
export const TextContainsOutputSchema = z.object({
	result: z.boolean(),
	index: z.number(),
})

/** Output for text 'startsWith'/'endsWith' operations */
export const TextBooleanOutputSchema = z.object({
	result: z.boolean(),
})

/** Combined output schema for text tool */
export const TextOutputSchema = z.union([
	TextSplitOutputSchema,
	TextResultOutputSchema,
	TextTruncateOutputSchema,
	TextWordCountOutputSchema,
	TextCharCountOutputSchema,
	TextLinesOutputSchema,
	TextExtractOutputSchema,
	TextContainsOutputSchema,
	TextBooleanOutputSchema,
])

// ==========================================
// MATH SCHEMAS
// ==========================================

/** Output for math single result operations */
export const MathResultOutputSchema = z.object({
	result: z.number(),
})

/** Output for math 'percentage' operation */
export const MathPercentageOutputSchema = z.object({
	result: z.number(),
	formatted: z.string(),
})

/** Output for math 'evaluate' operation */
export const MathEvaluateOutputSchema = z.object({
	result: z.number(),
	expression: z.string(),
})

/** Combined output schema for math tool */
export const MathOutputSchema = z.union([
	MathResultOutputSchema,
	MathPercentageOutputSchema,
	MathEvaluateOutputSchema,
])

// ==========================================
// UUID SCHEMAS
// ==========================================

/** Output for uuid single ID generation */
export const UuidSingleOutputSchema = z.object({
	id: z.string(),
})

/** Output for uuid multiple ID generation */
export const UuidMultipleOutputSchema = z.object({
	ids: z.array(z.string()),
	count: z.number(),
})

/** Combined output schema for uuid tool */
export const UuidOutputSchema = z.union([UuidSingleOutputSchema, UuidMultipleOutputSchema])

// ==========================================
// HASH SCHEMAS
// ==========================================

/** Output for hash 'hash' operation */
export const HashOutputSchema = z.object({
	hash: z.string(),
	algorithm: z.string(),
	encoding: z.string(),
	inputLength: z.number(),
})

/** Output for hash 'verify' operation */
export const HashVerifyOutputSchema = z.object({
	matches: z.boolean(),
	computed: z.string(),
	expected: z.string(),
})

/** Output for hash 'hmac' operation */
export const HashHmacOutputSchema = z.object({
	hmac: z.string(),
	algorithm: z.string(),
	encoding: z.string(),
})

/** Combined output schema for hash tool */
export const HashToolOutputSchema = z.union([
	HashOutputSchema,
	HashVerifyOutputSchema,
	HashHmacOutputSchema,
])

// ==========================================
// BASE64 SCHEMAS
// ==========================================

/** Output for base64 'encode' operation */
export const Base64EncodeOutputSchema = z.object({
	result: z.string(),
	originalLength: z.number(),
	encodedLength: z.number(),
})

/** Output for base64 'decode' operation */
export const Base64DecodeOutputSchema = z.object({
	result: z.string(),
	encodedLength: z.number(),
	decodedLength: z.number(),
})

/** Combined output schema for base64 tool */
export const Base64OutputSchema = z.union([Base64EncodeOutputSchema, Base64DecodeOutputSchema])

// ==========================================
// URL SCHEMAS
// ==========================================

/** Output for url 'parse' operation */
export const UrlParseOutputSchema = z.object({
	href: z.string(),
	protocol: z.string(),
	host: z.string(),
	hostname: z.string(),
	port: z.string(),
	pathname: z.string(),
	search: z.string(),
	hash: z.string(),
	origin: z.string(),
	params: z.record(z.string(), z.string()),
})

/** Output for url 'build'/'addParams'/'removeParams'/'join' operations */
export const UrlResultOutputSchema = z.object({
	url: z.string(),
})

/** Output for url 'encode' operation */
export const UrlEncodeOutputSchema = z.object({
	encoded: z.string(),
	original: z.string(),
})

/** Output for url 'decode' operation */
export const UrlDecodeOutputSchema = z.object({
	decoded: z.string(),
	original: z.string(),
})

/** Output for url 'getParams' operation */
export const UrlGetParamsOutputSchema = z.object({
	params: z.record(z.string(), z.string()),
	count: z.number(),
})

/** Combined output schema for url tool */
export const UrlOutputSchema = z.union([
	UrlParseOutputSchema,
	UrlResultOutputSchema,
	UrlEncodeOutputSchema,
	UrlDecodeOutputSchema,
	UrlGetParamsOutputSchema,
])

// ==========================================
// DELAY SCHEMAS
// ==========================================

/** Output schema for delay tool */
export const DelayOutputSchema = z.object({
	requested: z.number(),
	actual: z.number(),
	reason: z.string().optional(),
})
