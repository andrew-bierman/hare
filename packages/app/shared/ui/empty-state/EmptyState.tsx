'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@hare/ui/components/card'
import { Button } from '@hare/ui/components/button'
import { cn } from '@hare/ui/lib/utils'

export interface EmptyStateAction {
	label: string
	icon?: LucideIcon
	onClick?: () => void
	href?: string
	variant?: 'default' | 'outline' | 'secondary' | 'ghost'
}

export interface EmptyStateProps {
	icon: LucideIcon
	title: string
	description?: string
	/** Primary action button */
	action?: EmptyStateAction
	/** Secondary action button */
	secondaryAction?: EmptyStateAction
	/** Custom content to render instead of action buttons */
	children?: ReactNode
	/** Icon background color class (e.g., 'bg-primary/10', 'bg-blue-500/10') */
	iconBgColor?: string
	/** Icon color class (e.g., 'text-primary', 'text-blue-500') */
	iconColor?: string
	/** Size variant */
	size?: 'sm' | 'md' | 'lg'
	/** Border style */
	variant?: 'dashed' | 'solid' | 'none'
	/** Additional class names */
	className?: string
}

const sizeConfig = {
	sm: {
		container: 'py-8 px-4',
		iconWrapper: 'h-12 w-12',
		icon: 'h-6 w-6',
		title: 'text-base font-semibold',
		description: 'text-xs',
		gap: 'mb-3',
	},
	md: {
		container: 'py-12 px-4',
		iconWrapper: 'h-16 w-16',
		icon: 'h-8 w-8',
		title: 'text-lg font-semibold',
		description: 'text-sm',
		gap: 'mb-4',
	},
	lg: {
		container: 'py-16 px-6',
		iconWrapper: 'h-20 w-20',
		icon: 'h-10 w-10',
		title: 'text-xl font-semibold',
		description: 'text-base',
		gap: 'mb-6',
	},
}

/**
 * Reusable empty state component for displaying when no data is available.
 *
 * @example
 * // Basic usage
 * <EmptyState
 *   icon={Bot}
 *   title="Create your first agent"
 *   description="AI agents can understand context and complete tasks."
 *   action={{ label: "Create Agent", onClick: handleCreate }}
 * />
 *
 * @example
 * // With custom styling and secondary action
 * <EmptyState
 *   icon={Sparkles}
 *   title="No results found"
 *   description="Try adjusting your search criteria."
 *   iconBgColor="bg-amber-500/10"
 *   iconColor="text-amber-500"
 *   action={{ label: "Clear filters", onClick: clearFilters }}
 *   secondaryAction={{ label: "Browse all", href: "/browse" }}
 *   variant="solid"
 * />
 */
export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	secondaryAction,
	children,
	iconBgColor = 'bg-primary/10',
	iconColor = 'text-primary',
	size = 'md',
	variant = 'dashed',
	className,
}: EmptyStateProps) {
	const config = sizeConfig[size]

	const borderClass =
		variant === 'dashed' ? 'border-dashed border-2' : variant === 'solid' ? 'border' : 'border-0'

	const renderAction = (actionConfig: EmptyStateAction, isPrimary = true) => {
		const buttonVariant = actionconfig.variant ?? (isPrimary ? 'default' : 'outline')
		const ActionIcon = actionconfig.icon

		if (actionconfig.href) {
			return (
				<a href={actionconfig.href} className={isPrimary ? 'w-full sm:w-auto' : ''}>
					<Button variant={buttonVariant} className={cn('gap-2 h-11', isPrimary && 'w-full sm:w-auto')}>
						{ActionIcon && <ActionIcon className="h-4 w-4" />}
						{actionconfig.label}
					</Button>
				</a>
			)
		}

		return (
			<Button
				variant={buttonVariant}
				className={cn('gap-2 h-11', isPrimary && 'w-full sm:w-auto')}
				onClick={actionconfig.onClick}
			>
				{ActionIcon && <ActionIcon className="h-4 w-4" />}
				{actionconfig.label}
			</Button>
		)
	}

	return (
		<Card className={cn(borderClass, className)}>
			<CardContent className={cn('flex flex-col items-center justify-center text-center', config.container)}>
				<div
					className={cn(
						'flex items-center justify-center rounded-xl',
						config.iconWrapper,
						config.gap,
						iconBgColor,
					)}
				>
					<Icon className={cn(config.icon, iconColor)} />
				</div>

				<h3 className={cn(config.title, 'mb-2')}>{title}</h3>

				{description && (
					<p className={cn(config.description, 'text-muted-foreground max-w-xs mb-6')}>{description}</p>
				)}

				{children ? (
					children
				) : (action || secondaryAction) ? (
					<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
						{action && renderAction(action, true)}
						{secondaryAction && renderAction(secondaryAction, false)}
					</div>
				) : null}
			</CardContent>
		</Card>
	)
}
