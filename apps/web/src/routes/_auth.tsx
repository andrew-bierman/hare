import { SignInActionsProvider } from '@hare/app/features'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { Rabbit } from 'lucide-react'
import { APP_CONFIG, AUTH_CONTENT } from 'web-app/config'
import { signIn, signInWithGitHub, signInWithGoogle } from 'web-app/lib/auth-client'

const { layout } = AUTH_CONTENT

// Provide auth actions to child pages (SignInPage needs these)
const signInActions = {
	signIn: {
		email: signIn.email,
	},
	signInWithGoogle,
	signInWithGitHub,
}

export const Route = createFileRoute('/_auth')({
	component: AuthLayout,
})

function AuthLayout() {
	return (
		<SignInActionsProvider actions={signInActions}>
			<div className="min-h-screen flex bg-background">
			{/* Left side - branding */}
			<div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
				{/* Background gradient - rabbit/hare themed warm colors */}
				<div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500" />
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]" />

				{/* Decorative rabbit silhouettes */}
				<div className="absolute bottom-0 right-0 opacity-10">
					<Rabbit className="h-96 w-96 text-white" />
				</div>

				{/* Content */}
				<div className="relative flex flex-col justify-between w-full p-12">
					<Link to="/" className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
							<Rabbit className="h-6 w-6 text-white" />
						</div>
						<span className="font-bold text-2xl text-white">{APP_CONFIG.name}</span>
					</Link>

					<div className="space-y-6">
						<h1 className="text-4xl font-bold text-white leading-tight whitespace-pre-line">
							{layout.headline}
						</h1>
						<p className="text-lg text-white/80 max-w-md">{layout.description}</p>
					</div>

					<div className="text-sm text-white/60 flex items-center gap-2">
						<Rabbit className="h-4 w-4" />
						{layout.footer}
					</div>
				</div>
			</div>

			{/* Right side - form */}
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="w-full max-w-md">
					<Outlet />
				</div>
			</div>
			</div>
		</SignInActionsProvider>
	)
}
