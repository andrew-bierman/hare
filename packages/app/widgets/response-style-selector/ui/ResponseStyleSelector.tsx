'use client'

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@hare/ui/components/select'
import { Label } from '@hare/ui/components/label'
import { Config, type ResponseStyle } from '@hare/config'

export interface ResponseStyleSelectorProps {
	value: ResponseStyle
	onValueChange: (value: ResponseStyle) => void
	disabled?: boolean
	showLabel?: boolean
}

export function ResponseStyleSelector({
	value,
	onValueChange,
	disabled = false,
	showLabel = true,
}: ResponseStyleSelectorProps) {
	const selectedPreset = Config.agents.responseStyles.find((p) => p.id === value)

	return (
		<div className="space-y-2">
			{showLabel && (
				<Label htmlFor="response-style">Response Style</Label>
			)}
			<Select value={value} onValueChange={onValueChange} disabled={disabled}>
				<SelectTrigger id="response-style" className="w-full">
					<SelectValue placeholder="Select a response style">
						{selectedPreset && (
							<span className="flex items-center gap-2">
								<span>{selectedPreset.name}</span>
								<span className="text-muted-foreground text-xs">
									- {selectedPreset.description.split('.')[0]}
								</span>
							</span>
						)}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{Config.agents.responseStyles.map((preset) => (
						<SelectItem key={preset.id} value={preset.id}>
							<div className="flex flex-col gap-0.5">
								<span className="font-medium">{preset.name}</span>
								<span className="text-muted-foreground text-xs">
									{preset.description}
								</span>
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}
