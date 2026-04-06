'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hare/ui/components/card'
import { Skeleton } from '@hare/ui/components/skeleton'
import type { ReactNode } from 'react'

export interface ChartContainerProps {
	title: string
	description?: string
	isLoading?: boolean
	isEmpty?: boolean
	emptyMessage?: string
	children: ReactNode
	action?: ReactNode
	className?: string
}

/**
 * Container component for charts with loading and empty states.
 *
 * @param title - Chart title
 * @param description - Optional description
 * @param isLoading - Shows skeleton when loading
 * @param isEmpty - Shows empty message when true
 * @param emptyMessage - Custom empty state message
 * @param children - Chart content
 * @param action - Optional action button/element
 * @param className - Additional CSS classes
 */
export function ChartContainer({
	title,
	description,
	isLoading,
	isEmpty,
	emptyMessage = 'No data available',
	children,
	action,
	className,
}: ChartContainerProps) {
	return (
		<Card className={className}>
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle>{title}</CardTitle>
					{description && <CardDescription>{description}</CardDescription>}
				</div>
				{action}
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-[300px] w-full" />
				) : isEmpty ? (
					<div className="h-[300px] flex items-center justify-center text-muted-foreground">
						{emptyMessage}
					</div>
				) : (
					children
				)}
			</CardContent>
		</Card>
	)
}
