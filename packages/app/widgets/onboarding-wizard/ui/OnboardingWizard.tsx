'use client'

import { useState, useEffect } from 'react'
import { Button } from '@hare/ui/components/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@hare/ui/components/dialog'
import { Config, type AgentTemplate } from '@hare/config'
import { Bot, ChevronRight, Rocket, Sparkles, Wand2, X } from 'lucide-react'
import { cn } from '@hare/ui/lib/utils'

export interface OnboardingWizardProps {
	/** Whether the user is new (no agents) */
	isNewUser: boolean
	/** Called when a template is selected */
	onSelectTemplate: (templateId: string) => void
	/** Called when user wants to skip */
	onSkip: () => void
	/** Called when starting from scratch */
	onStartFromScratch: () => void
}

type WizardStep = 'welcome' | 'template-select'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
	Headphones: Bot,
	BookOpen: Bot,
	TrendingUp: Bot,
	Sparkles: Sparkles,
}

function TemplateOption({
	template,
	isSelected,
	onClick,
}: {
	template: AgentTemplate
	isSelected: boolean
	onClick: () => void
}) {
	const Icon = ICON_MAP[template.icon] || Bot

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all hover:border-primary/50',
				isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
			)}
		>
			<div
				className={cn(
					'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
					template.color,
				)}
			>
				<Icon className="h-5 w-5 text-white" />
			</div>
			<div className="flex-1 min-w-0">
				<h4 className="font-medium text-sm">{template.name}</h4>
				<p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
			</div>
		</button>
	)
}

/**
 * Onboarding wizard for new users.
 * Guides them through creating their first agent with a friendly, step-by-step process.
 */
export function OnboardingWizard({
	isNewUser,
	onSelectTemplate,
	onSkip,
	onStartFromScratch,
}: OnboardingWizardProps) {
	const [open, setOpen] = useState(false)
	const [step, setStep] = useState<WizardStep>('welcome')
	const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

	// Show wizard for new users
	useEffect(() => {
		if (isNewUser) {
			// Small delay to let the page settle
			const timer = setTimeout(() => setOpen(true), 500)
			return () => clearTimeout(timer)
		}
	}, [isNewUser])

	const handleClose = () => {
		setOpen(false)
		onSkip()
	}

	const handleGetStarted = () => {
		setStep('template-select')
	}

	const handleSelectTemplate = () => {
		if (selectedTemplate) {
			setOpen(false)
			onSelectTemplate(selectedTemplate)
		}
	}

	const handleStartFromScratch = () => {
		setOpen(false)
		onStartFromScratch()
	}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
			<DialogContent className="sm:max-w-lg">
				{step === 'welcome' ? (
					<>
						<DialogHeader className="text-center">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25">
								<Rocket className="h-8 w-8 text-white" />
							</div>
							<DialogTitle className="text-2xl">Welcome to Hare!</DialogTitle>
							<DialogDescription className="text-base">
								Let's create your first AI agent. It only takes a minute, and we'll guide you every
								step of the way.
							</DialogDescription>
						</DialogHeader>
						<div className="my-6 space-y-3">
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
									<Wand2 className="h-4 w-4 text-primary" />
								</div>
								<div>
									<p className="text-sm font-medium">Choose a template</p>
									<p className="text-xs text-muted-foreground">Pre-built agents for common use cases</p>
								</div>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
									<Bot className="h-4 w-4 text-primary" />
								</div>
								<div>
									<p className="text-sm font-medium">Customize your agent</p>
									<p className="text-xs text-muted-foreground">Tweak name, behavior, and capabilities</p>
								</div>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
									<Sparkles className="h-4 w-4 text-primary" />
								</div>
								<div>
									<p className="text-sm font-medium">Deploy and chat</p>
									<p className="text-xs text-muted-foreground">Your agent is ready to help</p>
								</div>
							</div>
						</div>
						<DialogFooter className="flex-col sm:flex-row gap-2">
							<Button variant="ghost" onClick={handleClose} className="sm:mr-auto">
								Skip for now
							</Button>
							<Button onClick={handleGetStarted} className="gap-2">
								Get Started
								<ChevronRight className="h-4 w-4" />
							</Button>
						</DialogFooter>
					</>
				) : (
					<>
						<DialogHeader>
							<DialogTitle>Choose a template</DialogTitle>
							<DialogDescription>
								Pick a template that matches your use case. You can customize everything later.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-3 my-4">
							{Config.agents.templates.map((template) => (
								<TemplateOption
									key={template.id}
									template={template}
									isSelected={selectedTemplate === template.id}
									onClick={() => setSelectedTemplate(template.id)}
								/>
							))}
						</div>
						<DialogFooter className="flex-col sm:flex-row gap-2">
							<Button variant="ghost" onClick={handleStartFromScratch} className="sm:mr-auto">
								Start from scratch
							</Button>
							<Button variant="outline" onClick={() => setStep('welcome')}>
								Back
							</Button>
							<Button onClick={handleSelectTemplate} disabled={!selectedTemplate} className="gap-2">
								Continue
								<ChevronRight className="h-4 w-4" />
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	)
}
