'use client'

import type { AgentConfig } from '@hare/types'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@hare/ui/components/collapsible'
import { Input } from '@hare/ui/components/input'
import { Label } from '@hare/ui/components/label'
import { cn } from '@hare/ui/lib/utils'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

export interface AdvancedSettingsProps {
	config: AgentConfig
	onConfigChange: (config: AgentConfig) => void
	defaultOpen?: boolean
	disabled?: boolean
}

export function AdvancedSettings({
	config,
	onConfigChange,
	defaultOpen = false,
	disabled = false,
}: AdvancedSettingsProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen)

	const handleChange = (field: keyof AgentConfig, value: number | undefined) => {
		onConfigChange({
			...config,
			[field]: value,
		})
	}

	const parseNumber = (value: string, min: number, max: number): number | undefined => {
		if (value === '') return undefined
		const num = parseFloat(value)
		if (Number.isNaN(num)) return undefined
		return Math.min(Math.max(num, min), max)
	}

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<CollapsibleTrigger
				className={cn(
					'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium',
					'hover:bg-accent/50 transition-colors',
					disabled && 'opacity-50 pointer-events-none',
				)}
				disabled={disabled}
			>
				<span>Advanced Settings</span>
				<ChevronDown
					className={cn(
						'h-4 w-4 text-muted-foreground transition-transform',
						isOpen && 'rotate-180',
					)}
				/>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="space-y-4 rounded-md border bg-muted/30 p-4 mt-2">
					<p className="text-xs text-muted-foreground">
						Fine-tune how the AI generates responses. These settings override the response style
						preset.
					</p>

					<div className="grid gap-4 sm:grid-cols-2">
						{/* Temperature */}
						<div className="space-y-2">
							<Label htmlFor="temperature" className="text-xs">
								Temperature
								<span className="text-muted-foreground ml-1">(0-2)</span>
							</Label>
							<Input
								id="temperature"
								type="number"
								min={0}
								max={2}
								step={0.1}
								value={config.temperature ?? ''}
								onChange={(e) => handleChange('temperature', parseNumber(e.target.value, 0, 2))}
								placeholder="0.7"
								disabled={disabled}
							/>
							<p className="text-xs text-muted-foreground">
								Lower = more focused, higher = more creative
							</p>
						</div>

						{/* Max Tokens */}
						<div className="space-y-2">
							<Label htmlFor="maxTokens" className="text-xs">
								Max Tokens
								<span className="text-muted-foreground ml-1">(1-100000)</span>
							</Label>
							<Input
								id="maxTokens"
								type="number"
								min={1}
								max={100000}
								step={256}
								value={config.maxTokens ?? ''}
								onChange={(e) => handleChange('maxTokens', parseNumber(e.target.value, 1, 100000))}
								placeholder="4096"
								disabled={disabled}
							/>
							<p className="text-xs text-muted-foreground">Maximum response length</p>
						</div>

						{/* Top P */}
						<div className="space-y-2">
							<Label htmlFor="topP" className="text-xs">
								Top P<span className="text-muted-foreground ml-1">(0-1)</span>
							</Label>
							<Input
								id="topP"
								type="number"
								min={0}
								max={1}
								step={0.05}
								value={config.topP ?? ''}
								onChange={(e) => handleChange('topP', parseNumber(e.target.value, 0, 1))}
								placeholder="0.95"
								disabled={disabled}
							/>
							<p className="text-xs text-muted-foreground">Nucleus sampling threshold</p>
						</div>

						{/* Top K */}
						<div className="space-y-2">
							<Label htmlFor="topK" className="text-xs">
								Top K<span className="text-muted-foreground ml-1">(optional)</span>
							</Label>
							<Input
								id="topK"
								type="number"
								min={1}
								max={100}
								step={1}
								value={config.topK ?? ''}
								onChange={(e) => handleChange('topK', parseNumber(e.target.value, 1, 100))}
								placeholder="40"
								disabled={disabled}
							/>
							<p className="text-xs text-muted-foreground">Limit token candidates</p>
						</div>
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	)
}
