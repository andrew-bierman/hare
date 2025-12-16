import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AgentBuilderPage({ params }: { params: { id: string } }) {
	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			<div className="flex items-center justify-between">
				<div>
					<div className="flex items-center gap-3">
						<h2 className="text-3xl font-bold tracking-tight">Customer Support Agent</h2>
						<Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
							Active
						</Badge>
					</div>
					<p className="text-muted-foreground mt-2">Configure your agent's settings and behavior</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline">Delete</Button>
					<Button>Save Changes</Button>
				</div>
			</div>

			<Tabs defaultValue="general" className="space-y-4">
				<TabsList>
					<TabsTrigger value="general">General</TabsTrigger>
					<TabsTrigger value="prompt">Prompt</TabsTrigger>
					<TabsTrigger value="tools">Tools</TabsTrigger>
					<TabsTrigger value="analytics">Analytics</TabsTrigger>
				</TabsList>

				<TabsContent value="general" className="space-y-4">
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
										<Input id="name" defaultValue="Customer Support Agent" />
									</div>
									<div className="space-y-2">
										<Label htmlFor="description">Description</Label>
										<Textarea
											id="description"
											defaultValue="Handles customer inquiries and support tickets with natural language understanding"
											className="h-24"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="model">Model</Label>
										<Select defaultValue="opus-4.5">
											<SelectTrigger id="model">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="opus-4.5">Claude Opus 4.5</SelectItem>
												<SelectItem value="sonnet-4.5">Claude Sonnet 4.5</SelectItem>
												<SelectItem value="haiku-4">Claude Haiku 4</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</CardContent>
							</Card>
						</div>

						<div className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>Statistics</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<div className="text-2xl font-bold">1,234</div>
										<p className="text-xs text-muted-foreground">Total messages</p>
									</div>
									<div>
										<div className="text-2xl font-bold">98.5%</div>
										<p className="text-xs text-muted-foreground">Success rate</p>
									</div>
									<div>
										<div className="text-2xl font-bold">2.3s</div>
										<p className="text-xs text-muted-foreground">Avg response time</p>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</TabsContent>

				<TabsContent value="prompt" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>System Prompt</CardTitle>
							<CardDescription>Define how your agent behaves and responds</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="system-prompt">System Prompt</Label>
								<Textarea
									id="system-prompt"
									defaultValue="You are a helpful customer support agent. Your goal is to assist customers with their questions and issues in a friendly, professional manner. Always be empathetic and try to resolve issues on the first contact."
									className="h-64 font-mono text-sm"
								/>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="tools" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Available Tools</CardTitle>
							<CardDescription>Enable tools to extend your agent's capabilities</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">No tools configured yet.</p>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="analytics" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Usage Analytics</CardTitle>
							<CardDescription>Monitor your agent's performance over time</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">Analytics coming soon...</p>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
