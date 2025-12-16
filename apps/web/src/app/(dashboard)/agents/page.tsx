import { Bot, Plus, Search } from 'lucide-react'
import Link from 'next/link'
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

export default function AgentsPage() {
	const agents = [
		{
			id: '1',
			name: 'Customer Support Agent',
			description:
				'Handles customer inquiries and support tickets with natural language understanding',
			status: 'active',
			model: 'Claude Opus 4.5',
			messages: 1234,
		},
		{
			id: '2',
			name: 'Sales Assistant',
			description: 'Helps qualify leads and schedule demos with potential customers',
			status: 'active',
			model: 'Claude Sonnet 4.5',
			messages: 856,
		},
		{
			id: '3',
			name: 'Content Writer',
			description: 'Generates blog posts, marketing copy, and social media content',
			status: 'idle',
			model: 'Claude Opus 4.5',
			messages: 432,
		},
		{
			id: '4',
			name: 'Data Analyst',
			description: 'Analyzes data patterns and generates insights from various data sources',
			status: 'active',
			model: 'Claude Sonnet 4.5',
			messages: 678,
		},
		{
			id: '5',
			name: 'Code Reviewer',
			description:
				'Reviews code for best practices, security issues, and optimization opportunities',
			status: 'idle',
			model: 'Claude Opus 4.5',
			messages: 291,
		},
		{
			id: '6',
			name: 'Research Assistant',
			description: 'Conducts research and summarizes findings from multiple sources',
			status: 'active',
			model: 'Claude Sonnet 4.5',
			messages: 534,
		},
	]

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold tracking-tight">Agents</h2>
				<Link href="/dashboard/agents/new">
					<Button>
						<Plus className="mr-2 h-4 w-4" />
						New Agent
					</Button>
				</Link>
			</div>

			<div className="flex items-center space-x-2">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input placeholder="Search agents..." className="pl-8" />
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{agents.map((agent) => (
					<Card key={agent.id} className="flex flex-col">
						<CardHeader>
							<div className="flex items-start justify-between">
								<Bot className="h-8 w-8 text-violet-500" />
								<Badge
									variant={agent.status === 'active' ? 'default' : 'secondary'}
									className={
										agent.status === 'active'
											? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
											: ''
									}
								>
									{agent.status}
								</Badge>
							</div>
							<CardTitle className="mt-4">{agent.name}</CardTitle>
							<CardDescription>{agent.description}</CardDescription>
						</CardHeader>
						<CardContent className="flex-1">
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-muted-foreground">Model:</span>
									<span className="font-medium">{agent.model}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Messages:</span>
									<span className="font-medium">{agent.messages.toLocaleString()}</span>
								</div>
							</div>
						</CardContent>
						<CardFooter className="flex gap-2">
							<Link href={`/dashboard/agents/${agent.id}`} className="flex-1">
								<Button variant="outline" className="w-full">
									Edit
								</Button>
							</Link>
							<Link href={`/dashboard/agents/${agent.id}/playground`} className="flex-1">
								<Button className="w-full">Test</Button>
							</Link>
						</CardFooter>
					</Card>
				))}
			</div>
		</div>
	)
}
