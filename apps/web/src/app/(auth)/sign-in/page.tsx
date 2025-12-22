'use client'

import { ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { signIn } from 'web-app/lib/auth-client'

export default function SignInPage() {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		setIsLoading(true)

		try {
			const result = await signIn.email({
				email,
				password,
			})

			if (result.error) {
				toast.error(result.error.message || 'Failed to sign in')
				return
			}

			toast.success('Signed in successfully')
			router.push('/')
		} catch (error) {
			toast.error('An unexpected error occurred')
			console.error(error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="space-y-8">
			{/* Mobile logo */}
			<div className="lg:hidden flex flex-col items-center space-y-4">
				<Link href="/" className="flex items-center gap-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
						<Sparkles className="h-6 w-6 text-primary-foreground" />
					</div>
					<span className="font-bold text-2xl">Hare</span>
				</Link>
			</div>

			<div className="flex flex-col space-y-2 text-center lg:text-left">
				<h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
				<p className="text-muted-foreground">Sign in to your account to continue</p>
			</div>

			<Card className="border-border/50 shadow-lg">
				<form onSubmit={handleSubmit}>
					<CardContent className="pt-6 space-y-5">
						<div className="space-y-2">
							<Label htmlFor="email" className="text-sm font-medium">
								Email
							</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
								required
								disabled={isLoading}
								className="h-11"
							/>
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="password" className="text-sm font-medium">
									Password
								</Label>
								<Link
									href="/forgot-password"
									className="text-xs text-primary hover:underline font-medium"
								>
									Forgot password?
								</Link>
							</div>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
								required
								disabled={isLoading}
								className="h-11"
							/>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col space-y-4 pt-2">
						<Button
							type="submit"
							size="lg"
							className="w-full gap-2 shadow-lg shadow-primary/25"
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Signing in...
								</>
							) : (
								<>
									Sign In
									<ArrowRight className="h-4 w-4" />
								</>
							)}
						</Button>
						<div className="text-sm text-center text-muted-foreground">
							Don't have an account?{' '}
							<Link href="/sign-up" className="text-primary hover:underline font-medium">
								Sign up
							</Link>
						</div>
					</CardFooter>
				</form>
			</Card>
		</div>
	)
}
