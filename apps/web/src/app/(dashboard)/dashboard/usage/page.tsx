import { Activity, Calendar, CreditCard, TrendingUp } from 'lucide-react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from 'web-app/components/ui/card'

export default function UsagePage() {
	const stats = [
		{
			title: 'API Calls This Month',
			value: '24,521',
			description: '+12% from last month',
			icon: Activity,
			color: 'text-blue-500',
		},
		{
			title: 'Tokens Used',
			value: '1.2M',
			description: '800K remaining',
			icon: TrendingUp,
			color: 'text-emerald-500',
		},
		{
			title: 'Current Plan',
			value: 'Pro',
			description: '$49/month',
			icon: CreditCard,
			color: 'text-violet-500',
		},
		{
			title: 'Billing Cycle',
			value: 'Dec 20',
			description: 'Next renewal',
			icon: Calendar,
			color: 'text-orange-500',
		},
	]

	const usageHistory = [
		{ date: 'Dec 19', calls: 892, tokens: 45000 },
		{ date: 'Dec 18', calls: 1045, tokens: 52000 },
		{ date: 'Dec 17', calls: 756, tokens: 38000 },
		{ date: 'Dec 16', calls: 934, tokens: 47000 },
		{ date: 'Dec 15', calls: 1123, tokens: 56000 },
	]

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold tracking-tight">Usage</h2>
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

			<Card>
				<CardHeader>
					<CardTitle>Usage History</CardTitle>
					<CardDescription>Daily API usage for the past 5 days</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{usageHistory.map((day) => (
							<div
								key={day.date}
								className="flex items-center justify-between p-4 border rounded-lg"
							>
								<div className="font-medium">{day.date}</div>
								<div className="flex items-center gap-8">
									<div className="text-sm">
										<span className="text-muted-foreground">Calls: </span>
										<span className="font-medium">{day.calls.toLocaleString()}</span>
									</div>
									<div className="text-sm">
										<span className="text-muted-foreground">Tokens: </span>
										<span className="font-medium">{day.tokens.toLocaleString()}</span>
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
