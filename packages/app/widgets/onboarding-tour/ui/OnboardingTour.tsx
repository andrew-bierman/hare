'use client'

import { Button } from '@hare/ui/components/button'
import { Progress } from '@hare/ui/components/progress'
import { cn } from '@hare/ui/lib/utils'
import { ChevronLeft, ChevronRight, SkipForward, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
 * Default dashboard tour steps
 */
export const DEFAULT_TOUR_STEPS: TourStep[] = [
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

export interface OnboardingTourProps {
	/** Whether the tour is active */
	isActive: boolean
	/** Current step index */
	currentStep: number
	/** Callback when moving to next step */
	onNext: () => void
	/** Callback when moving to previous step */
	onPrev: () => void
	/** Callback when tour is skipped */
	onSkip: () => void
	/** Callback when tour is completed */
	onComplete: () => void
	/** Custom tour steps (defaults to DEFAULT_TOUR_STEPS) */
	steps?: TourStep[]
}

interface TooltipPosition {
	top: number
	left: number
}

interface HighlightRect {
	top: number
	left: number
	width: number
	height: number
}

/**
 * Calculate tooltip position relative to target element
 */
function calculateTooltipPosition(options: {
	targetRect: DOMRect
	position: TourStepPosition
	tooltipWidth: number
	tooltipHeight: number
}): TooltipPosition {
	const { targetRect, position, tooltipWidth, tooltipHeight } = options
	const padding = 12
	const arrowSize = 8

	let top = 0
	let left = 0

	switch (position) {
		case 'top':
			top = targetRect.top - tooltipHeight - padding - arrowSize
			left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
			break
		case 'bottom':
			top = targetRect.bottom + padding + arrowSize
			left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
			break
		case 'left':
			top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
			left = targetRect.left - tooltipWidth - padding - arrowSize
			break
		case 'right':
			top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
			left = targetRect.right + padding + arrowSize
			break
	}

	// Clamp to viewport bounds
	const viewportPadding = 16
	top = Math.max(
		viewportPadding,
		Math.min(top, window.innerHeight - tooltipHeight - viewportPadding),
	)
	left = Math.max(
		viewportPadding,
		Math.min(left, window.innerWidth - tooltipWidth - viewportPadding),
	)

	return { top, left }
}

/**
 * Get arrow styles based on position
 */
function getArrowStyles(position: TourStepPosition): string {
	const baseStyles = 'absolute w-3 h-3 bg-card rotate-45 border'

	switch (position) {
		case 'top':
			return cn(baseStyles, 'bottom-[-7px] left-1/2 -translate-x-1/2 border-t-0 border-l-0')
		case 'bottom':
			return cn(baseStyles, 'top-[-7px] left-1/2 -translate-x-1/2 border-b-0 border-r-0')
		case 'left':
			return cn(baseStyles, 'right-[-7px] top-1/2 -translate-y-1/2 border-t-0 border-l-0')
		case 'right':
			return cn(baseStyles, 'left-[-7px] top-1/2 -translate-y-1/2 border-b-0 border-r-0')
	}
}

/**
 * OnboardingTour component
 *
 * A guided tour that highlights elements and shows tooltips to help
 * new users understand the dashboard features.
 *
 * This component is controlled - it receives state from the parent
 * via the useTour hook for proper state persistence across navigation.
 */
export function OnboardingTour({
	isActive,
	currentStep: currentStepIndex,
	onNext,
	onPrev,
	onSkip,
	onComplete,
	steps = DEFAULT_TOUR_STEPS,
}: OnboardingTourProps) {
	const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null)
	const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null)
	const [isVisible, setIsVisible] = useState(false)
	const tooltipRef = useRef<HTMLDivElement>(null)

	const currentStep = steps[currentStepIndex]
	const isFirstStep = currentStepIndex === 0
	const isLastStep = currentStepIndex === steps.length - 1
	const progress = ((currentStepIndex + 1) / steps.length) * 100

	// Position the tooltip and highlight based on target element
	const updatePositions = useCallback(() => {
		if (!currentStep || !isActive) return

		const targetElement = document.querySelector(currentStep.targetSelector)
		if (!targetElement) {
			// Target not found — skip tour entirely to avoid grey overlay with no tooltip
			onSkip()
			return
		}

		const targetRect = targetElement.getBoundingClientRect()

		// Update highlight position
		setHighlightRect({
			top: targetRect.top,
			left: targetRect.left,
			width: targetRect.width,
			height: targetRect.height,
		})

		// Calculate tooltip position after it's rendered
		if (tooltipRef.current) {
			const tooltipRect = tooltipRef.current.getBoundingClientRect()
			const position = calculateTooltipPosition({
				targetRect,
				position: currentStep.position,
				tooltipWidth: tooltipRect.width,
				tooltipHeight: tooltipRect.height,
			})
			setTooltipPosition(position)
		}

		setIsVisible(true)
	}, [currentStep, isActive, isLastStep, onNext])

	// Initial positioning and resize handling
	useEffect(() => {
		if (!isActive) {
			setIsVisible(false)
			return
		}

		// Small delay to let the DOM settle
		const timer = setTimeout(() => {
			updatePositions()
		}, 100)

		window.addEventListener('resize', updatePositions)
		window.addEventListener('scroll', updatePositions, true)

		return () => {
			clearTimeout(timer)
			window.removeEventListener('resize', updatePositions)
			window.removeEventListener('scroll', updatePositions, true)
		}
	}, [isActive, updatePositions])

	// Re-calculate when step changes
	useEffect(() => {
		if (isActive) {
			setIsVisible(false)
			const timer = setTimeout(() => {
				updatePositions()
			}, 100)
			return () => clearTimeout(timer)
		}
	}, [currentStepIndex, isActive, updatePositions])

	// Re-calculate when tooltip ref becomes available
	useEffect(() => {
		if (tooltipRef.current && highlightRect) {
			updatePositions()
		}
	}, [highlightRect, updatePositions])

	const handleNext = () => {
		if (isLastStep) {
			onComplete()
		} else {
			setIsVisible(false)
			onNext()
		}
	}

	const handleBack = () => {
		if (!isFirstStep) {
			setIsVisible(false)
			onPrev()
		}
	}

	const handleSkip = () => {
		setIsVisible(false)
		onSkip()
	}

	// Don't render if not active
	if (!isActive || !currentStep) {
		return null
	}

	const tourContent = (
		<>
			{/* Overlay with cutout for highlighted element */}
			<div className="fixed inset-0 z-[9998]">
				{/* Semi-transparent backdrop — click to dismiss */}
				<div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={handleSkip} />

				{/* Cutout for highlighted element */}
				{highlightRect && (
					<div
						className="absolute bg-transparent rounded-lg ring-4 ring-primary ring-offset-4 ring-offset-transparent"
						style={{
							top: highlightRect.top - 4,
							left: highlightRect.left - 4,
							width: highlightRect.width + 8,
							height: highlightRect.height + 8,
							boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
						}}
					/>
				)}
			</div>

			{/* Tooltip */}
			<div
				ref={tooltipRef}
				className={cn(
					'fixed z-[9999] w-80 bg-card border rounded-xl shadow-lg transition-opacity duration-200',
					isVisible && tooltipPosition ? 'opacity-100' : 'opacity-0',
				)}
				style={
					tooltipPosition
						? { top: tooltipPosition.top, left: tooltipPosition.left }
						: { top: -9999, left: -9999 }
				}
			>
				{/* Arrow */}
				<div className={getArrowStyles(currentStep.position)} />

				{/* Content */}
				<div className="p-4">
					{/* Header with close button */}
					<div className="flex items-start justify-between gap-2 mb-2">
						<h3 className="font-semibold text-base">{currentStep.title}</h3>
						<Button
							variant="ghost"
							size="icon-sm"
							className="shrink-0 -mt-1 -mr-1"
							onClick={handleSkip}
							aria-label="Close tour"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					{/* Description */}
					<p className="text-sm text-muted-foreground mb-4">{currentStep.description}</p>

					{/* Progress indicator */}
					<div className="mb-4">
						<div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
							<span>
								Step {currentStepIndex + 1} of {steps.length}
							</span>
							<span>{Math.round(progress)}%</span>
						</div>
						<Progress value={progress} className="h-1" />
					</div>

					{/* Navigation buttons */}
					<div className="flex items-center justify-between">
						<Button
							variant="ghost"
							size="sm"
							onClick={handleSkip}
							className="text-muted-foreground hover:text-foreground"
						>
							<SkipForward className="h-4 w-4 mr-1" />
							Skip tour
						</Button>
						<div className="flex items-center gap-2">
							{!isFirstStep && (
								<Button variant="outline" size="sm" onClick={handleBack}>
									<ChevronLeft className="h-4 w-4 mr-1" />
									Back
								</Button>
							)}
							<Button size="sm" onClick={handleNext}>
								{isLastStep ? (
									'Finish'
								) : (
									<>
										Next
										<ChevronRight className="h-4 w-4 ml-1" />
									</>
								)}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</>
	)

	// Use portal to render at document body level
	return typeof document !== 'undefined' ? createPortal(tourContent, document.body) : null
}
