'use client'

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import type * as React from 'react'
import { cn } from '@workspace/ui/lib/utils'

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
				'overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
				className
			)}
			{...props}
		>
			{children}
		</CollapsiblePrimitive.Content>
	)
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
