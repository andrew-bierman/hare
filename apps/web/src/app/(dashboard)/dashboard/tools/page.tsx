import { Code, Globe, Plus, Search, Wrench } from 'lucide-react'
import { Badge } from 'web-app/components/ui/badge'
import { Button } from 'web-app/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from 'web-app/components/ui/card'
import { Input } from 'web-app/components/ui/input'

export default function ToolsPage() {
	const tools = [
		{
			id: '1',
			name: 'Web Search',
			description: 'Search the web for real-time information and data',
			type: 'system',
			icon: Globe,
			usageCount: 1523,
		},
		{
			id: '2',
			name: 'Code Interpreter',
			description: 'Execute Python code for data analysis and calculations',
			type: 'system',
			icon: Code,
			usageCount: 892,
		},
		{
			id: '3',
			name: 'Custom API',
			description: 'Connect to your internal APIs and services',
			type: 'custom',
			icon: Wrench,
			usageCount: 456,
		},
	]

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold tracking-tight">Tools</h2>
				<Button>
					<Plus className="mr-2 h-4 w-4" />
					Add Tool
				</Button>
			</div>

			<div className="flex items-center space-x-2">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input placeholder="Search tools..." className="pl-8" />
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{tools.map((tool) => (
					<Card key={tool.id} className="flex flex-col">
						<CardHeader>
							<div className="flex items-start justify-between">
								<tool.icon className="h-8 w-8 text-pink-700" />
								<Badge
									variant={tool.type === 'system' ? 'secondary' : 'default'}
								>
									{tool.type}
								</Badge>
							</div>
							<CardTitle className="mt-4">{tool.name}</CardTitle>
							<CardDescription>{tool.description}</CardDescription>
						</CardHeader>
						<CardContent className="flex-1">
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-muted-foreground">Usage:</span>
									<span className="font-medium">{tool.usageCount.toLocaleString()} calls</span>
								</div>
							</div>
						</CardContent>
						<CardFooter className="flex gap-2">
							<Button variant="outline" className="flex-1">
								Configure
							</Button>
							<Button variant="outline" className="flex-1">
								Test
							</Button>
						</CardFooter>
					</Card>
				))}
			</div>
		</div>
	)
}
