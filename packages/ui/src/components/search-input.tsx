import type * as React from 'react'
import { SearchIcon } from 'lucide-react'

import { cn } from '@hare/ui/lib/utils'
import { Input } from './input'

interface SearchInputProps extends Omit<React.ComponentProps<'input'>, 'type'> {
	containerClassName?: string
}

function SearchInput({ className, containerClassName, ...props }: SearchInputProps) {
	return (
		<div className={cn('relative', containerClassName)}>
			<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
			<Input type="search" className={cn('pl-9', className)} {...props} />
		</div>
	)
}

export { SearchInput }
