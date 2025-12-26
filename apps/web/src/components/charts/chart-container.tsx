'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import type { ReactNode } from 'react'

interface ChartContainerProps {
	title: string
	description?: string
	isLoading?: boolean
	isEmpty?: boolean
	emptyMessage?: string
	children: ReactNode
	action?: ReactNode
	className?: string
}

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
