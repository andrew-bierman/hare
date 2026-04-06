import { z } from 'zod'
import { ContentLengths } from './constants'
import { createTool, failure, type HareEnv, success, type ToolContext } from './types'

/**
 * Helper to check if AI binding is available.
 */
function requireAI(context: ToolContext<HareEnv>): context is ToolContext<HareEnv & { AI: Ai }> {
	return context.env.AI !== undefined
}

// Zod schemas for AI response validation
const TextGenerationResponseSchema = z.object({
	response: z.string(),
})

const TextClassificationResponseSchema = z.array(
	z.object({
		label: z.string(),
		score: z.number(),
	}),
)

const TranslationResponseSchema = z.object({
	translated_text: z.string(),
})

const EmbeddingResponseSchema = z.object({
	data: z.array(z.array(z.number())),
})

// Entity type literals for NER tool
const EntityTypeSchema = z.enum([
	'person',
	'organization',
	'location',
	'date',
	'money',
	'email',
	'phone',
	'url',
])
type EntityType = z.infer<typeof EntityTypeSchema>

function isEntityType(value: string): value is EntityType {
	return EntityTypeSchema.safeParse(value).success
}

// Output schemas for AI tools
const SentimentOutputSchema = z.object({
	sentiment: z.string().describe('The detected sentiment (positive, negative, or neutral)'),
	confidence: z.number().describe('Confidence score (0-1)'),
	label: z.string().describe('Raw label from the model'),
	allScores: z
		.array(z.object({ label: z.string(), score: z.number() }))
		.optional()
		.describe('All scores when detailed mode is enabled'),
})

const SummarizeOutputSchema = z.object({
	summary: z.string().describe('The generated summary'),
	originalLength: z.number().describe('Character length of the original text'),
	summaryLength: z.number().describe('Character length of the summary'),
	compressionRatio: z.number().describe('Percentage of text reduced'),
	style: z.enum(['brief', 'detailed', 'bullets']).describe('The summary style used'),
})

const TranslateOutputSchema = z.object({
	translatedText: z.string().describe('The translated text'),
	sourceLanguage: z.string().describe('Source language code or auto-detected'),
	targetLanguage: z.string().describe('Target language code'),
	originalLength: z.number().describe('Character length of the original text'),
	translatedLength: z.number().describe('Character length of the translated text'),
})

const ImageGenerateOutputSchema = z.object({
	image: z.string().describe('Base64-encoded image data'),
	mimeType: z.string().describe('MIME type of the image (e.g., image/png)'),
	width: z.number().describe('Width of the generated image'),
	height: z.number().describe('Height of the generated image'),
	prompt: z.string().describe('The prompt used to generate the image'),
	dataUrl: z.string().describe('Data URL for embedding the image directly'),
})

const ClassifyOutputSchema = z.object({
	categories: z.array(z.string()).describe('Matched categories'),
	allCategories: z.array(z.string()).describe('All possible categories provided'),
	confidence: z.enum(['high', 'low']).describe('Confidence level of the classification'),
	rawResponse: z.string().describe('Raw response from the model'),
})

const NerOutputSchema = z.object({
	entities: z
		.record(z.string(), z.array(z.string()))
		.describe('Extracted entities grouped by type'),
	totalCount: z.number().describe('Total number of entities found'),
	typesFound: z.array(z.string()).describe('Types of entities that were found'),
})

const EmbeddingOutputSchema = z.object({
	embeddings: z.array(z.array(z.number())).describe('Vector embeddings for each input text'),
	dimensions: z.number().describe('Dimensionality of the embedding vectors'),
	count: z.number().describe('Number of embeddings generated'),
	model: z
		.enum(['bge-base-en', 'bge-small-en', 'bge-large-en'])
		.optional()
		.describe('The embedding model used'),
})

const QaOutputSchema = z.object({
	answer: z.string().describe('The answer to the question'),
	question: z.string().describe('The original question'),
	quote: z.string().optional().describe('Relevant quote from the context if requested'),
})

/**
 * AI model constants - using valid model names from @cloudflare/workers-types AiModels interface.
 * These are the actual model identifiers that Cloudflare Workers AI accepts.
 */
const AI_MODELS = {
	// Text classification
	SENTIMENT: '@cf/huggingface/distilbert-sst-2-int8',
	// Text generation (using fp8 variant which is in the types)
	TEXT_GENERATION: '@cf/meta/llama-3.1-8b-instruct-fp8',
	// Translation
	TRANSLATION: '@cf/meta/m2m100-1.2b',
	// Image generation
	IMAGE_GENERATION: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
	// Embeddings
	EMBEDDING_BASE: '@cf/baai/bge-base-en-v1.5',
	EMBEDDING_SMALL: '@cf/baai/bge-small-en-v1.5',
	EMBEDDING_LARGE: '@cf/baai/bge-large-en-v1.5',
} as const satisfies Record<string, keyof AiModels>

/**
 * Sentiment Analysis Tool - Analyze the sentiment of text.
 */
export const sentimentTool = createTool({
	id: 'sentiment',
	description:
		'Analyze the sentiment of text. Returns positive, negative, or neutral classification with confidence scores.',
	inputSchema: z.object({
		text: z.string().min(1).max(ContentLengths.AI_SHORT).describe('Text to analyze for sentiment'),
		detailed: z.boolean().optional().default(false).describe('Return detailed emotion breakdown'),
	}),
	outputSchema: SentimentOutputSchema,
	execute: async (params, context) => {
		try {
			if (!requireAI(context)) {
				return failure(
					'AI binding is not available. Please configure the AI binding in your Worker.',
				)
			}
			const { text, detailed } = params

			// Use Workers AI for sentiment analysis
			const rawResponse = await context.env.AI.run(AI_MODELS.SENTIMENT, { text })

			const parseResult = TextClassificationResponseSchema.safeParse(rawResponse)
			if (!parseResult.success) {
				return failure('Sentiment analysis failed: Invalid response format')
			}

			const results = parseResult.data
			const sortedResults = results.sort((a, b) => b.score - a.score)
			const topResult = sortedResults[0]

			if (!topResult) {
				return failure('Sentiment analysis failed: Empty response')
			}

			// Map labels to sentiment
			const sentimentMap: Record<string, string> = {
				POSITIVE: 'positive',
				NEGATIVE: 'negative',
				NEUTRAL: 'neutral',
			}

			const sentiment = sentimentMap[topResult.label] || topResult.label.toLowerCase()
			const confidence = topResult.score

			return success({
				sentiment,
				confidence: Math.round(confidence * 100) / 100,
				label: topResult.label,
				...(detailed && { allScores: sortedResults }),
			})
		} catch (error) {
			return failure(
				`Sentiment analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Text Summarization Tool - Generate summaries of long text.
 */
export const summarizeTool = createTool({
	id: 'summarize',
	description:
		'Generate a concise summary of longer text content. Useful for distilling articles, documents, or conversations.',
	inputSchema: z.object({
		text: z.string().min(50).max(ContentLengths.AI_LONG).describe('Text content to summarize'),
		maxLength: z.number().optional().default(200).describe('Maximum summary length in words'),
		style: z
			.enum(['brief', 'detailed', 'bullets'])
			.optional()
			.default('brief')
			.describe('Summary style'),
	}),
	outputSchema: SummarizeOutputSchema,
	execute: async (params, context) => {
		try {
			if (!requireAI(context)) {
				return failure(
					'AI binding is not available. Please configure the AI binding in your Worker.',
				)
			}
			const { text, maxLength, style } = params

			let prompt: string
			switch (style) {
				case 'bullets':
					prompt = `Summarize the following text as bullet points (max ${maxLength} words total):\n\n${text}`
					break
				case 'detailed':
					prompt = `Provide a comprehensive summary of the following text (max ${maxLength} words):\n\n${text}`
					break
				default:
					prompt = `Provide a brief, concise summary of the following text (max ${maxLength} words):\n\n${text}`
			}

			const rawResponse = await context.env.AI.run(AI_MODELS.TEXT_GENERATION, {
				prompt,
				max_tokens: Math.min(maxLength * 2, 1000),
			})

			const parseResult = TextGenerationResponseSchema.safeParse(rawResponse)
			if (!parseResult.success) {
				return failure('Summarization failed: Invalid response format')
			}

			const summary = parseResult.data.response.trim()

			return success({
				summary,
				originalLength: text.length,
				summaryLength: summary.length,
				compressionRatio: Math.round((1 - summary.length / text.length) * 100),
				style,
			})
		} catch (error) {
			return failure(
				`Summarization error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Translation Tool - Translate text between languages.
 */
export const translateTool = createTool({
	id: 'translate',
	description: 'Translate text from one language to another. Supports many common languages.',
	inputSchema: z.object({
		text: z.string().min(1).max(ContentLengths.AI_MEDIUM).describe('Text to translate'),
		targetLanguage: z
			.string()
			.describe(
				'Target language code (e.g., "es", "fr", "de", "ja", "zh", "ko", "pt", "it", "ru", "ar")',
			),
		sourceLanguage: z
			.string()
			.optional()
			.describe('Source language code (auto-detect if not specified)'),
	}),
	outputSchema: TranslateOutputSchema,
	execute: async (params, context) => {
		try {
			if (!requireAI(context)) {
				return failure(
					'AI binding is not available. Please configure the AI binding in your Worker.',
				)
			}
			const { text, targetLanguage, sourceLanguage } = params

			// Use Workers AI translation model
			const rawResponse = await context.env.AI.run(AI_MODELS.TRANSLATION, {
				text,
				target_lang: targetLanguage,
				source_lang: sourceLanguage || 'en',
			})

			const parseResult = TranslationResponseSchema.safeParse(rawResponse)
			if (!parseResult.success) {
				return failure('Translation failed: Invalid response format')
			}

			const translatedText = parseResult.data.translated_text

			return success({
				translatedText,
				sourceLanguage: sourceLanguage || 'auto-detected',
				targetLanguage,
				originalLength: text.length,
				translatedLength: translatedText.length,
			})
		} catch (error) {
			return failure(
				`Translation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Image Generation Tool - Generate images from text descriptions.
 */
export const imageGenerateTool = createTool({
	id: 'image_generate',
	description:
		'Generate images from text descriptions using AI. Returns the image as base64-encoded data.',
	inputSchema: z.object({
		prompt: z.string().min(1).max(1000).describe('Description of the image to generate'),
		negativePrompt: z.string().optional().describe('Things to avoid in the image'),
		width: z.number().optional().default(512).describe('Image width (256-1024)'),
		height: z.number().optional().default(512).describe('Image height (256-1024)'),
		steps: z.number().optional().default(20).describe('Number of diffusion steps (1-50)'),
		guidance: z.number().optional().default(7.5).describe('Guidance scale (1-20)'),
	}),
	outputSchema: ImageGenerateOutputSchema,
	execute: async (params, context) => {
		try {
			if (!requireAI(context)) {
				return failure(
					'AI binding is not available. Please configure the AI binding in your Worker.',
				)
			}
			const { prompt, negativePrompt, width, height, steps, guidance } = params

			// Validate dimensions
			const validWidth = Math.min(Math.max(width ?? 512, 256), 1024)
			const validHeight = Math.min(Math.max(height ?? 512, 256), 1024)
			const validSteps = Math.min(Math.max(steps ?? 20, 1), 50)
			const validGuidance = Math.min(Math.max(guidance ?? 7.5, 1), 20)

			const response = await context.env.AI.run(AI_MODELS.IMAGE_GENERATION, {
				prompt,
				negative_prompt: negativePrompt,
				width: validWidth,
				height: validHeight,
				num_steps: validSteps,
				guidance: validGuidance,
			})

			if (!response) {
				return failure('Image generation failed: No response')
			}

			// The response is a ReadableStream<Uint8Array>
			const reader = response.getReader()
			const chunks: Uint8Array[] = []
			let done = false

			while (!done) {
				const result = await reader.read()
				done = result.done
				if (result.value) {
					chunks.push(result.value)
				}
			}

			const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
			const combined = new Uint8Array(totalLength)
			let offset = 0
			for (const chunk of chunks) {
				combined.set(chunk, offset)
				offset += chunk.length
			}

			const base64Image = btoa(String.fromCharCode(...combined))

			return success({
				image: base64Image,
				mimeType: 'image/png',
				width: validWidth,
				height: validHeight,
				prompt,
				dataUrl: `data:image/png;base64,${base64Image}`,
			})
		} catch (error) {
			return failure(
				`Image generation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Text Classification Tool - Classify text into categories.
 */
export const classifyTool = createTool({
	id: 'classify',
	description:
		'Classify text into custom categories. Useful for routing, tagging, or categorizing content.',
	inputSchema: z.object({
		text: z.string().min(1).max(ContentLengths.AI_SHORT).describe('Text to classify'),
		categories: z.array(z.string()).min(2).max(20).describe('List of possible categories'),
		multiLabel: z
			.boolean()
			.optional()
			.default(false)
			.describe('Allow multiple categories to match'),
	}),
	outputSchema: ClassifyOutputSchema,
	execute: async (params, context) => {
		try {
			if (!requireAI(context)) {
				return failure(
					'AI binding is not available. Please configure the AI binding in your Worker.',
				)
			}
			const { text, categories, multiLabel } = params

			// Create a classification prompt
			const prompt = multiLabel
				? `Classify the following text into one or more of these categories: ${categories.join(', ')}

Text: "${text}"

Return only the matching category names, comma-separated. If none match, return "unknown".`
				: `Classify the following text into exactly one of these categories: ${categories.join(', ')}

Text: "${text}"

Return only the single most appropriate category name.`

			const rawResponse = await context.env.AI.run(AI_MODELS.TEXT_GENERATION, {
				prompt,
				max_tokens: 100,
			})

			const parseResult = TextGenerationResponseSchema.safeParse(rawResponse)
			if (!parseResult.success) {
				return failure('Classification failed: Invalid response format')
			}

			const result = parseResult.data.response.trim().toLowerCase()
			const matchedCategories = categories.filter((cat) => result.includes(cat.toLowerCase()))

			if (matchedCategories.length === 0) {
				// Try to find the closest match
				const resultCategories = result.split(',').map((s) => s.trim())
				for (const rescat of resultCategories) {
					const found = categories.find(
						(cat) => cat.toLowerCase() === rescat || rescat.includes(cat.toLowerCase()),
					)
					if (found) matchedCategories.push(found)
				}
			}

			return success({
				categories: multiLabel ? matchedCategories : [matchedCategories[0] || 'unknown'],
				allCategories: categories,
				confidence: matchedCategories.length > 0 ? 'high' : 'low',
				rawResponse: result,
			})
		} catch (error) {
			return failure(
				`Classification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	},
})

/**
 * Named Entity Recognition Tool - Extract entities from text.
 */
export const nerTool = createTool({
	id: 'ner',
	description:
		'Extract named entities from text such as people, organizations, locations, dates, and more.',
	inputSchema: z.object({
		text: z.string().min(1).max(ContentLengths.AI_MEDIUM).describe('Text to analyze for entities'),
		entityTypes: z
			.array(EntityTypeSchema)
			.optional()
			.describe('Specific entity types to extract (all if not specified)'),
	}),
	outputSchema: NerOutputSchema,
	execute: async (params, context) => {
		try {
			const { text, entityTypes } = params

			// Use regex patterns for common entities
			const patterns: Record<string, RegExp> = {
				email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
				phone: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
				url: /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/g,
				money:
					/\$[\d,]+(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s?(?:USD|EUR|GBP|JPY|dollars?|euros?|pounds?)/gi,
				date: /(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/gi,
			}

			const entities: Record<string, string[]> = {}

			// Extract pattern-based entities
			for (const [type, pattern] of Object.entries(patterns)) {
				if (isEntityType(type) && (!entityTypes || entityTypes.includes(type))) {
					const matches = text.match(pattern) || []
					if (matches.length > 0) {
						entities[type] = [...new Set(matches)]
					}
				}
			}

			// Use AI for person, organization, location extraction
			const aiEntityTypes: EntityType[] = ['person', 'organization', 'location']
			const aiTypes = aiEntityTypes.filter((t) => !entityTypes || entityTypes.includes(t))

			if (aiTypes.length > 0 && context.env.AI) {
				const prompt = `Extract all ${aiTypes.join(', ')} names from the following text. Return them as JSON with keys: ${aiTypes.map((t) => `"${t}s"`).join(', ')} (arrays of strings). Only output valid JSON, nothing else.

Text: "${text.slice(0, 3000)}"`

				try {
					const rawResponse = await context.env.AI.run(AI_MODELS.TEXT_GENERATION, {
						prompt,
						max_tokens: 500,
					})

					const parseResult = TextGenerationResponseSchema.safeParse(rawResponse)
					if (parseResult.success) {
						const aiResult = parseResult.data.response
						// Try to parse JSON from the response
						const jsonMatch = aiResult.match(/\{[\s\S]*\}/)
						if (jsonMatch) {
							const NerResultSchema = z.record(z.string(), z.array(z.string()))
							const parseJsonResult = NerResultSchema.safeParse(JSON.parse(jsonMatch[0]))
							if (parseJsonResult.success) {
								for (const type of aiTypes) {
									const key = `${type}s`
									const values = parseJsonResult.data[key]
									if (values && values.length > 0) {
										entities[type] = [...new Set(values)]
									}
								}
							}
						}
					}
				} catch {
					// AI extraction failed, continue with pattern-based results
				}
			}

			const totalEntities = Object.values(entities).reduce((acc, arr) => acc + arr.length, 0)

			return success({
				entities,
				totalCount: totalEntities,
				typesFound: Object.keys(entities),
			})
		} catch (error) {
			return failure(`NER error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Text Embedding Tool - Generate vector embeddings for text.
 */
export const embeddingTool = createTool({
	id: 'embedding',
	description:
		'Generate vector embeddings for text. Useful for semantic search, similarity comparison, and clustering.',
	inputSchema: z.object({
		text: z.union([z.string(), z.array(z.string())]).describe('Text or array of texts to embed'),
		model: z
			.enum(['bge-base-en', 'bge-small-en', 'bge-large-en'])
			.optional()
			.default('bge-base-en')
			.describe('Embedding model to use'),
	}),
	outputSchema: EmbeddingOutputSchema,
	execute: async (params, context) => {
		try {
			if (!requireAI(context)) {
				return failure(
					'AI binding is not available. Please configure the AI binding in your Worker.',
				)
			}
			const { text, model } = params

			const texts = Array.isArray(text) ? text : [text]

			// Map model name to constant
			const embeddingModels = {
				'bge-base-en': AI_MODELS.EMBEDDING_BASE,
				'bge-small-en': AI_MODELS.EMBEDDING_SMALL,
				'bge-large-en': AI_MODELS.EMBEDDING_LARGE,
			} as const
			const modelId = embeddingModels[model ?? 'bge-base-en']

			const rawResponse = await context.env.AI.run(modelId, { text: texts })

			const parseResult = EmbeddingResponseSchema.safeParse(rawResponse)
			if (!parseResult.success) {
				return failure('Embedding generation failed: Invalid response format')
			}

			const embeddings = parseResult.data.data

			return success({
				embeddings,
				dimensions: embeddings[0]?.length ?? 0,
				count: embeddings.length,
				model,
			})
		} catch (error) {
			return failure(`Embedding error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Question Answering Tool - Answer questions based on context.
 */
export const qaTool = createTool({
	id: 'question_answer',
	description: 'Answer questions based on provided context. Useful for RAG and document Q&A.',
	inputSchema: z.object({
		question: z.string().min(1).max(500).describe('Question to answer'),
		context: z.string().min(1).max(20000).describe('Context/document to find the answer in'),
		options: z
			.object({
				maxLength: z.number().optional().default(200).describe('Maximum answer length'),
				includeQuote: z
					.boolean()
					.optional()
					.default(false)
					.describe('Include relevant quote from context'),
			})
			.optional(),
	}),
	outputSchema: QaOutputSchema,
	execute: async (params, context) => {
		try {
			if (!requireAI(context)) {
				return failure(
					'AI binding is not available. Please configure the AI binding in your Worker.',
				)
			}
			const { question, context: textContext, options } = params
			const { maxLength = 200, includeQuote = false } = options || {}

			const prompt = includeQuote
				? `Based on the following context, answer the question and provide a relevant quote.

Context: "${textContext.slice(0, ContentLengths.RAG_CONTEXT)}"

Question: ${question}

Provide your answer in this format:
Answer: [your answer here, max ${maxLength} words]
Quote: [relevant quote from the context]`
				: `Based on the following context, answer the question concisely (max ${maxLength} words).

Context: "${textContext.slice(0, ContentLengths.RAG_CONTEXT)}"

Question: ${question}

Answer:`

			const rawResponse = await context.env.AI.run(AI_MODELS.TEXT_GENERATION, {
				prompt,
				max_tokens: maxLength * 2,
			})

			const parseResult = TextGenerationResponseSchema.safeParse(rawResponse)
			if (!parseResult.success) {
				return failure('Question answering failed: Invalid response format')
			}

			const result = parseResult.data.response.trim()

			if (includeQuote) {
				const answerMatch = result.match(/Answer:\s*([\s\S]*?)(?=Quote:|$)/i)
				const quoteMatch = result.match(/Quote:\s*([\s\S]*?)$/i)

				return success({
					answer: answerMatch?.[1]?.trim() || result,
					quote: quoteMatch?.[1]?.trim(),
					question,
				})
			}

			return success({
				answer: result,
				question,
			})
		} catch (error) {
			return failure(`Q&A error: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	},
})

/**
 * Get all AI tools.
 */
export function getAITools(_context: ToolContext) {
	return [
		sentimentTool,
		summarizeTool,
		translateTool,
		imageGenerateTool,
		classifyTool,
		nerTool,
		embeddingTool,
		qaTool,
	]
}
