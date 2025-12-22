import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-screen flex bg-background">
			{/* Left side - branding */}
			<div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
				{/* Background gradient */}
				<div className="absolute inset-0 bg-gradient-to-br from-primary via-violet-600 to-purple-700" />
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]" />

				{/* Content */}
				<div className="relative flex flex-col justify-between w-full p-12">
					<Link href="/" className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
							<Sparkles className="h-6 w-6 text-white" />
						</div>
						<span className="font-bold text-2xl text-white">Hare</span>
					</Link>

					<div className="space-y-6">
						<h1 className="text-4xl font-bold text-white leading-tight">
							Build & Deploy
							<br />
							AI Agents at the Edge
						</h1>
						<p className="text-lg text-white/80 max-w-md">
							The fastest way to create, deploy, and scale AI agents. Built on Cloudflare Workers
							for instant global deployment.
						</p>
					</div>

					<div className="text-sm text-white/60">
						Built with Cloudflare Workers
					</div>
				</div>
			</div>

			{/* Right side - form */}
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="w-full max-w-md">{children}</div>
			</div>
		</div>
	)
}
