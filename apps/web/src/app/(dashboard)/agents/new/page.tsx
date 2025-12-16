import { Button } from '../../../../components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../../../../components/ui/card'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../../../../components/ui/select'
import { Textarea } from '../../../../components/ui/textarea'

export default function NewAgentPage() {
	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Create New Agent</h2>
					<p className="text-muted-foreground mt-2">Set up a new AI agent for your workspace</p>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<div className="md:col-span-2 space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Basic Information</CardTitle>
							<CardDescription>Configure your agent's identity and purpose</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="name">Agent Name</Label>
								<Input id="name" placeholder="e.g., Customer Support Agent" />
							</div>
							<div className="space-y-2">
								<Label htmlFor="description">Description</Label>
								<Textarea
									id="description"
									placeholder="Describe what this agent does..."
									className="h-24"
								/>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Configuration</CardTitle>
							<CardDescription>Set up your agent's behavior and capabilities</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="model">Model</Label>
								<Select>
									<SelectTrigger id="model">
										<SelectValue placeholder="Select a model" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="opus-4.5">Claude Opus 4.5</SelectItem>
										<SelectItem value="sonnet-4.5">Claude Sonnet 4.5</SelectItem>
										<SelectItem value="haiku-4">Claude Haiku 4</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="system-prompt">System Prompt</Label>
								<Textarea
									id="system-prompt"
									placeholder="You are a helpful assistant that..."
									className="h-32 font-mono text-sm"
								/>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Tools & Capabilities</CardTitle>
							<CardDescription>Enable additional tools for your agent</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								No tools configured yet. Add tools to extend your agent's capabilities.
							</p>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Actions</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<Button className="w-full">Create Agent</Button>
							<Button variant="outline" className="w-full">
								Cancel
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Tips</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm text-muted-foreground">
							<p>Give your agent a clear, descriptive name that reflects its purpose.</p>
							<p>Write a detailed system prompt to guide the agent's behavior and responses.</p>
							<p>Start with a simpler model and upgrade if needed.</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
