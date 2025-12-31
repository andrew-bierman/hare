'use client'

import {
	Config,
	getModelsByProvider,
	getProviderLabel,
	type AIModel,
	type ModelProvider,
} from '@hare/config'
import { Label } from '@hare/ui/components/label'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@hare/ui/components/select'
import { cn } from '@hare/ui/lib/utils'
import { useMemo } from 'react'

export interface ModelSelectorProps {
	value: string
	onValueChange: (value: string) => void
	disabled?: boolean
	/** Show provider grouping */
	grouped?: boolean
	/** Show cost/speed badges */
	showBadges?: boolean
	/** Filter to specific providers */
	providers?: ModelProvider[]
	/** Custom label */
	label?: string
	/** Hide label */
	hideLabel?: boolean
	className?: string
}

function ModelBadge({ tier, type }: { tier: string; type: 'speed' | 'cost' }) {
	const config = type === 'speed' ? Config.models.labels.speed : Config.models.labels.cost
	const { label, color } = config[tier as keyof typeof config] ?? { label: tier, color: '' }

	return (
		<span className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded', color)}>
			{label}
		</span>
	)
}

function ModelOption({ model, showBadges }: { model: AIModel; showBadges: boolean }) {
	return (
		<div className="flex flex-col gap-0.5 py-0.5">
			<div className="flex items-center gap-2">
				<span className="font-medium">{model.name}</span>
				{showBadges && (
					<div className="flex gap-1">
						<ModelBadge tier={model.speedTier} type="speed" />
						<ModelBadge tier={model.costTier} type="cost" />
					</div>
				)}
			</div>
			<span className="text-xs text-muted-foreground">{model.description}</span>
		</div>
	)
}

/**
 * Enhanced model selector with provider grouping and cost/speed badges.
 *
 * @example
 * // Basic usage
 * <ModelSelector
 *   value={model}
 *   onValueChange={setModel}
 * />
 *
 * @example
 * // With grouping and badges
 * <ModelSelector
 *   value={model}
 *   onValueChange={setModel}
 *   grouped
 *   showBadges
 * />
 */
export function ModelSelector({
	value,
	onValueChange,
	disabled,
	grouped = true,
	showBadges = true,
	providers,
	label = 'Model',
	hideLabel = false,
	className,
}: ModelSelectorProps) {
	const modelsByProvider = useMemo(() => {
		const allGrouped = getModelsByProvider()

		// Filter by providers if specified
		if (providers?.length) {
			const filtered = new Map<ModelProvider, AIModel[]>()
			for (const provider of providers) {
				const models = allGrouped.get(provider)
				if (models) filtered.set(provider, models)
			}
			return filtered
		}

		return allGrouped
	}, [providers])

	const flatModels = useMemo(() => {
		if (providers?.length) {
			return Config.models.list.filter((m) => providers.includes(m.provider))
		}
		return Config.models.list
	}, [providers])

	const selectedModel = Config.models.list.find((m) => m.id === value)

	return (
		<div className={cn('space-y-2', className)}>
			{!hideLabel && <Label htmlFor="model-selector">{label}</Label>}
			<Select value={value} onValueChange={onValueChange} disabled={disabled}>
				<SelectTrigger id="model-selector" className="w-full">
					<SelectValue placeholder="Select a model">
						{selectedModel && (
							<div className="flex items-center gap-2">
								<span>{selectedModel.name}</span>
								{showBadges && (
									<div className="flex gap-1">
										<ModelBadge tier={selectedModel.costTier} type="cost" />
									</div>
								)}
							</div>
						)}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{grouped ? (
						Array.from(modelsByProvider.entries()).map(([provider, models]) => (
							<SelectGroup key={provider}>
								<SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1.5">
									{getProviderLabel(provider)}
								</SelectLabel>
								{models.map((model) => (
									<SelectItem key={model.id} value={model.id} className="py-2">
										<ModelOption model={model} showBadges={showBadges} />
									</SelectItem>
								))}
							</SelectGroup>
						))
					) : (
						flatModels.map((model) => (
							<SelectItem key={model.id} value={model.id} className="py-2">
								<ModelOption model={model} showBadges={showBadges} />
							</SelectItem>
						))
					)}
				</SelectContent>
			</Select>
		</div>
	)
}
