'use client'

import { useNavigate } from '@tanstack/react-router'
import { TemplateGallery } from '../../widgets/template-picker'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@hare/ui/components/button'

export function AgentTemplatesPage() {
	const navigate = useNavigate()

	const handleSelectTemplate = (templateId: string) => {
		navigate({
			to: '/dashboard/agents/new',
			search: { template: templateId },
		})
	}

	const handleStartFromScratch = () => {
		navigate({ to: '/dashboard/agents/new' })
	}

	const handleBack = () => {
		navigate({ to: '/dashboard/agents' })
	}

	return (
		<div className="flex-1 space-y-6 p-8 pt-6">
			{/* Header */}
			<div className="space-y-2">
				<Button
					variant="ghost"
					size="sm"
					onClick={handleBack}
					className="-ml-2 mb-2"
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to Agents
				</Button>
				<h2 className="text-3xl font-bold tracking-tight">Choose a Template</h2>
				<p className="text-muted-foreground">
					Start with a pre-configured template or build your own from scratch
				</p>
			</div>

			{/* Gallery */}
			<div className="max-w-3xl">
				<TemplateGallery
					onSelectTemplate={handleSelectTemplate}
					onStartFromScratch={handleStartFromScratch}
				/>
			</div>
		</div>
	)
}
