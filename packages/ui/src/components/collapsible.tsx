'use client'

import { cn } from '@hare/ui/lib/utils'
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import type * as React from 'react'

const Collapsible = CollapsiblePrimitive.Root
const CollapsibleTrigger = CollapsiblePrimitive.Trigger

function CollapsibleContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
	return (
		<CollapsiblePrimitive.Content
			className={cn(
				'overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
				className,
			)}
			{...props}
		>
			{children}
		</CollapsiblePrimitive.Content>
	)
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
