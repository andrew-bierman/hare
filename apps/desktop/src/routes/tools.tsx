import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@workspace/ui/components/card'
import { ArrowLeft, Database, Globe, Search, Wrench } from 'lucide-react'

export const Route = createFileRoute('/tools')({
	component: ToolsPage,
})

const toolCategories = [
	{
		name: 'Search',
		icon: Search,
		tools: ['Web Search', 'Vector Search', 'Document Search'],
	},
	{
		name: 'Database',
		icon: Database,
		tools: ['D1 Database', 'KV Store', 'R2 Storage'],
	},
	{
		name: 'HTTP',
		icon: Globe,
		tools: ['HTTP Request', 'Webhook', 'API Call'],
	},
]

function ToolsPage() {
	return (
		<div className="min-h-screen p-8">
			<div className="max-w-6xl mx-auto space-y-6">
				<div className="flex items-center gap-4">
					<Link to="/">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<h1 className="text-3xl font-bold">Tools</h1>
						<p className="text-muted-foreground">Available tools for your agents</p>
					</div>
				</div>

				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{toolCategories.map((category) => (
						<Card key={category.name}>
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
										<category.icon className="h-5 w-5" />
									</div>
									<CardTitle>{category.name}</CardTitle>
								</div>
								<CardDescription>{category.tools.length} tools available</CardDescription>
							</CardHeader>
							<CardContent>
								<ul className="space-y-2">
									{category.tools.map((tool) => (
										<li
											key={tool}
											className="flex items-center gap-2 text-sm text-muted-foreground"
										>
											<Wrench className="h-3 w-3" />
											{tool}
										</li>
									))}
								</ul>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</div>
	)
}
