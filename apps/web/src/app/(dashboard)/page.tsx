import { Bot, MessageSquare, TrendingUp, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'

export default function DashboardPage() {
	const stats = [
		{
			title: 'Total Agents',
			value: '12',
			description: '+2 from last month',
			icon: Bot,
			color: 'text-violet-500',
		},
		{
			title: 'Messages Today',
			value: '573',
			description: '+201 since yesterday',
			icon: MessageSquare,
			color: 'text-blue-500',
		},
		{
			title: 'Active Sessions',
			value: '8',
			description: 'Currently running',
			icon: Zap,
			color: 'text-yellow-500',
		},
		{
			title: 'Success Rate',
			value: '98.5%',
			description: '+2.5% from last week',
			icon: TrendingUp,
			color: 'text-emerald-500',
		},
	]

	const recentAgents = [
		{
			id: '1',
			name: 'Customer Support Agent',
			description: 'Handles customer inquiries and support tickets',
			status: 'active',
			lastUsed: '2 hours ago',
		},
		{
			id: '2',
			name: 'Sales Assistant',
			description: 'Helps qualify leads and schedule demos',
			status: 'active',
			lastUsed: '5 hours ago',
		},
		{
			id: '3',
			name: 'Content Writer',
			description: 'Generates blog posts and marketing copy',
			status: 'idle',
			lastUsed: '1 day ago',
		},
	]

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between space-y-2">
				<h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
			</div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{stats.map((stat) => (
					<Card key={stat.title}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
							<stat.icon className={`h-4 w-4 ${stat.color}`} />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stat.value}</div>
							<p className="text-xs text-muted-foreground">{stat.description}</p>
						</CardContent>
					</Card>
				))}
			</div>
			<Card className="col-span-4">
				<CardHeader>
					<CardTitle>Recent Agents</CardTitle>
					<CardDescription>Your most recently used agents</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{recentAgents.map((agent) => (
							<div
								key={agent.id}
								className="flex items-center justify-between p-4 border rounded-lg"
							>
								<div className="space-y-1">
									<p className="text-sm font-medium leading-none">{agent.name}</p>
									<p className="text-sm text-muted-foreground">{agent.description}</p>
								</div>
								<div className="flex items-center gap-4">
									<div className="text-sm text-muted-foreground">{agent.lastUsed}</div>
									<div
										className={`px-2 py-1 rounded-full text-xs font-medium ${
											agent.status === 'active'
												? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
												: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
										}`}
									>
										{agent.status}
									</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
