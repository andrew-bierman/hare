'use client'

import { useState, useCallback } from 'react'
import { Button } from '@hare/ui/components/button'
import { Textarea } from '@hare/ui/components/textarea'
import { Label } from '@hare/ui/components/label'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@hare/ui/components/dialog'
import { Loader2, Sparkles, Wand2 } from 'lucide-react'
import { cn } from '@hare/ui/lib/utils'

export interface PromptGeneratorProps {
	/** Called when a prompt is generated */
	onGenerate: (prompt: string) => void
	/** Whether the generator is disabled */
	disabled?: boolean
	/** Custom trigger button */
	trigger?: React.ReactNode
	className?: string
}

interface PromptSection {
	title: string
	content: string
}

/**
 * Generates a structured system prompt based on a natural language description.
 * This is a client-side implementation using pattern matching.
 * For production, you'd want to use an LLM API.
 */
function generateStructuredPrompt(description: string): string {
	const lower = description.toLowerCase()

	// Detect intent
	const sections: PromptSection[] = []

	// Role detection
	let role = 'a helpful AI assistant'
	if (lower.includes('customer support') || lower.includes('help desk')) {
		role = 'a friendly and professional customer support agent'
	} else if (lower.includes('sales') || lower.includes('selling')) {
		role = 'a knowledgeable and persuasive sales assistant'
	} else if (lower.includes('technical') || lower.includes('developer')) {
		role = 'an expert technical assistant with deep programming knowledge'
	} else if (lower.includes('writing') || lower.includes('content')) {
		role = 'a creative and skilled content writer'
	} else if (lower.includes('research') || lower.includes('analysis')) {
		role = 'an analytical research assistant'
	} else if (lower.includes('tutor') || lower.includes('teaching') || lower.includes('education')) {
		role = 'a patient and encouraging educational tutor'
	}

	sections.push({
		title: 'Role',
		content: `You are ${role}.`,
	})

	// Core behavior
	const behaviors: string[] = []

	if (lower.includes('friendly') || lower.includes('helpful') || lower.includes('warm')) {
		behaviors.push('Be warm, friendly, and approachable in your responses.')
	}
	if (lower.includes('professional') || lower.includes('formal')) {
		behaviors.push('Maintain a professional and formal tone.')
	}
	if (lower.includes('concise') || lower.includes('brief') || lower.includes('short')) {
		behaviors.push('Keep responses concise and to the point.')
	}
	if (lower.includes('detailed') || lower.includes('thorough') || lower.includes('comprehensive')) {
		behaviors.push('Provide thorough and comprehensive responses.')
	}
	if (lower.includes('explain') || lower.includes('teaching')) {
		behaviors.push('Break down complex topics into simple, understandable parts.')
	}
	if (lower.includes('question') || lower.includes('clarif')) {
		behaviors.push('Ask clarifying questions when the user request is ambiguous.')
	}

	// Add default behaviors if none detected
	if (behaviors.length === 0) {
		behaviors.push('Be helpful, accurate, and professional in your responses.')
		behaviors.push('Ask clarifying questions when needed.')
	}

	sections.push({
		title: 'Behavior Guidelines',
		content: behaviors.join('\n'),
	})

	// Capabilities based on context
	const capabilities: string[] = []

	if (lower.includes('code') || lower.includes('programming') || lower.includes('developer')) {
		capabilities.push('- Write and review code in multiple programming languages')
		capabilities.push('- Debug issues and suggest optimizations')
		capabilities.push('- Explain technical concepts clearly')
	}
	if (lower.includes('customer') || lower.includes('support') || lower.includes('help')) {
		capabilities.push('- Address customer inquiries and concerns')
		capabilities.push('- Escalate complex issues when appropriate')
		capabilities.push('- Provide accurate product/service information')
	}
	if (lower.includes('sales') || lower.includes('product')) {
		capabilities.push('- Explain product features and benefits')
		capabilities.push('- Address objections professionally')
		capabilities.push('- Guide customers through the purchasing process')
	}
	if (lower.includes('write') || lower.includes('content') || lower.includes('creative')) {
		capabilities.push('- Create engaging and original content')
		capabilities.push('- Adapt writing style to different audiences')
		capabilities.push('- Proofread and edit text')
	}
	if (lower.includes('data') || lower.includes('analysis') || lower.includes('research')) {
		capabilities.push('- Analyze data and extract insights')
		capabilities.push('- Provide evidence-based recommendations')
		capabilities.push('- Summarize complex information')
	}

	if (capabilities.length > 0) {
		sections.push({
			title: 'Key Capabilities',
			content: capabilities.join('\n'),
		})
	}

	// Constraints
	const constraints: string[] = [
		'- Always be truthful. If you don\'t know something, say so.',
		'- Never share false or misleading information.',
	]

	if (lower.includes('sensitive') || lower.includes('private') || lower.includes('confidential')) {
		constraints.push('- Handle sensitive information with care and discretion.')
	}
	if (lower.includes('compan') || lower.includes('brand')) {
		constraints.push('- Represent the brand professionally at all times.')
	}

	sections.push({
		title: 'Constraints',
		content: constraints.join('\n'),
	})

	// Build the final prompt
	let prompt = ''
	for (const section of sections) {
		prompt += `## ${section.title}\n\n${section.content}\n\n`
	}

	// Add a note about customization
	prompt += `---\n*This prompt was generated based on your description. Feel free to customize it further.*`

	return prompt.trim()
}

/**
 * Natural language prompt generator.
 * Allows users to describe their agent in plain English and generates a structured system prompt.
 */
export function PromptGenerator({
	onGenerate,
	disabled,
	trigger,
	className,
}: PromptGeneratorProps) {
	const [open, setOpen] = useState(false)
	const [description, setDescription] = useState('')
	const [isGenerating, setIsGenerating] = useState(false)
	const [generatedPrompt, setGeneratedPrompt] = useState('')
	const [step, setStep] = useState<'input' | 'review'>('input')

	const handleGenerate = useCallback(async () => {
		if (!description.trim()) return

		setIsGenerating(true)

		// Simulate async for UX (in production, this would call an LLM API)
		await new Promise((resolve) => setTimeout(resolve, 800))

		const prompt = generateStructuredPrompt(description)
		setGeneratedPrompt(prompt)
		setStep('review')
		setIsGenerating(false)
	}, [description])

	const handleApply = useCallback(() => {
		onGenerate(generatedPrompt)
		setOpen(false)
		// Reset state
		setDescription('')
		setGeneratedPrompt('')
		setStep('input')
	}, [generatedPrompt, onGenerate])

	const handleBack = useCallback(() => {
		setStep('input')
	}, [])

	const handleClose = useCallback(() => {
		setOpen(false)
		setDescription('')
		setGeneratedPrompt('')
		setStep('input')
	}, [])

	return (
		<Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
			<DialogTrigger asChild>
				{trigger ?? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={disabled}
						className={cn('gap-2', className)}
					>
						<Wand2 className="h-4 w-4" />
						Generate with AI
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				{step === 'input' ? (
					<>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<Sparkles className="h-5 w-5 text-primary" />
								Describe Your Agent
							</DialogTitle>
							<DialogDescription>
								Tell us what you want your agent to do, and we'll generate a system prompt for you.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 my-4">
							<div className="space-y-2">
								<Label htmlFor="agent-description">What should your agent do?</Label>
								<Textarea
									id="agent-description"
									placeholder="Example: I want a friendly customer support agent that can help users with technical issues, billing questions, and general inquiries. It should be professional but warm."
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									className="min-h-[120px]"
								/>
							</div>
							<div className="space-y-2">
								<p className="text-xs text-muted-foreground">Tips for better results:</p>
								<ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
									<li>Describe the agent's purpose and role</li>
									<li>Mention the tone (friendly, professional, casual)</li>
									<li>Include any specific capabilities or constraints</li>
								</ul>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={handleClose}>
								Cancel
							</Button>
							<Button
								onClick={handleGenerate}
								disabled={!description.trim() || isGenerating}
								className="gap-2"
							>
								{isGenerating ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										Generating...
									</>
								) : (
									<>
										<Sparkles className="h-4 w-4" />
										Generate Prompt
									</>
								)}
							</Button>
						</DialogFooter>
					</>
				) : (
					<>
						<DialogHeader>
							<DialogTitle>Review Generated Prompt</DialogTitle>
							<DialogDescription>
								Here's your generated system prompt. You can edit it after applying.
							</DialogDescription>
						</DialogHeader>
						<div className="my-4">
							<Textarea
								value={generatedPrompt}
								onChange={(e) => setGeneratedPrompt(e.target.value)}
								className="min-h-[250px] font-mono text-sm"
							/>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={handleBack}>
								Back
							</Button>
							<Button onClick={handleApply} className="gap-2">
								<Sparkles className="h-4 w-4" />
								Apply Prompt
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	)
}
