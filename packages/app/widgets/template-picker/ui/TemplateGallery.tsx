'use client'

import { config } from '@hare/config'
import { TemplateCard, ScratchCard } from './TemplateCard'
import { Separator } from '@hare/ui/components/separator'

export interface TemplateGalleryProps {
	onSelectTemplate: (templateId: string) => void
	onStartFromScratch: () => void
}

export function TemplateGallery({
	onSelectTemplate,
	onStartFromScratch,
}: TemplateGalleryProps) {
	return (
		<div className="space-y-8">
			{/* Template Cards */}
			<div className="grid gap-4 sm:grid-cols-2">
				{config.agents.templates.map((template) => (
					<TemplateCard
						key={template.id}
						template={template}
						onClick={() => onSelectTemplate(template.id)}
					/>
				))}
			</div>

			{/* Separator */}
			<div className="relative">
				<Separator />
				<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-sm text-muted-foreground">
					or
				</span>
			</div>

			{/* Start from scratch */}
			<ScratchCard onClick={onStartFromScratch} />
		</div>
	)
}
