'use client'

import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardFooter } from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { ArrowRight, Github, Loader2, Rabbit } from 'lucide-react'
import { type ChangeEvent, type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { APP_CONFIG, AUTH_CONTENT } from '../../shared/config'
import { useOAuthProviders, useSignInActions } from '../../features/auth'

const { signIn: content, fields } = AUTH_CONTENT

// Google icon component (not available in lucide-react)
function GoogleIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			role="img"
			aria-label="Google"
		>
			<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
			<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
			<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
			<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
		</svg>
	)
}

export function SignInPage() {
	const navigate = useNavigate()
	const { signIn, signInWithGoogle, signInWithGitHub } = useSignInActions()
	const [isLoading, setIsLoading] = useState(false)
	const [isGoogleLoading, setIsGoogleLoading] = useState(false)
	const [isGitHubLoading, setIsGitHubLoading] = useState(false)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const { data: providers, isLoading: isProvidersLoading } = useOAuthProviders()

	const hasOAuthProviders = providers?.google || providers?.github

	async function handleGoogleSignIn() {
		setIsGoogleLoading(true)
		try {
			await signInWithGoogle()
		} catch (error) {
			toast.error('Failed to sign in with Google')
			console.error(error)
			setIsGoogleLoading(false)
		}
	}

	async function handleGitHubSignIn() {
		setIsGitHubLoading(true)
		try {
			await signInWithGitHub()
		} catch (error) {
			toast.error('Failed to sign in with GitHub')
			console.error(error)
			setIsGitHubLoading(false)
		}
	}

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

			toast.success(AUTH_CONTENT.success.signIn)
			navigate({ to: '/dashboard' })
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
				<Link to="/" className="flex items-center gap-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25">
						<Rabbit className="h-6 w-6 text-white" />
					</div>
					<span className="font-bold text-2xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
						{APP_CONFIG.name}
					</span>
				</Link>
			</div>

			<div className="flex flex-col space-y-2 text-center lg:text-left">
				<h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
				<p className="text-muted-foreground">{content.subtitle}</p>
			</div>

			<Card className="border-border/50 shadow-lg">
				<CardContent className="pt-6 space-y-5">
					{/* OAuth Buttons */}
					{!isProvidersLoading && hasOAuthProviders && (
						<>
							<div className="space-y-3">
								{providers?.google && (
									<Button
										type="button"
										variant="outline"
										size="lg"
										className="w-full gap-2"
										onClick={handleGoogleSignIn}
										disabled={isGoogleLoading || isGitHubLoading || isLoading}
									>
										{isGoogleLoading ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<GoogleIcon className="h-4 w-4" />
										)}
										Continue with Google
									</Button>
								)}
								{providers?.github && (
									<Button
										type="button"
										variant="outline"
										size="lg"
										className="w-full gap-2"
										onClick={handleGitHubSignIn}
										disabled={isGoogleLoading || isGitHubLoading || isLoading}
									>
										{isGitHubLoading ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Github className="h-4 w-4" />
										)}
										Continue with GitHub
									</Button>
								)}
							</div>

							{/* Divider */}
							<div className="relative">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-card px-2 text-muted-foreground">or</span>
								</div>
							</div>
						</>
					)}

					{/* Email/Password Form */}
					<form onSubmit={handleSubmit} className="space-y-5">
						<div className="space-y-2">
							<Label htmlFor="email" className="text-sm font-medium">
								{fields.email.label}
							</Label>
							<Input
								id="email"
								type="email"
								placeholder={fields.email.placeholder}
								value={email}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
								required
								disabled={isLoading || isGoogleLoading || isGitHubLoading}
								className="h-11"
							/>
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="password" className="text-sm font-medium">
									{fields.password.label}
								</Label>
{/* TODO: Implement forgot password route */}
								<span className="text-xs text-muted-foreground font-medium">
									{content.forgotPassword}
								</span>
							</div>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
								required
								disabled={isLoading || isGoogleLoading || isGitHubLoading}
								className="h-11"
							/>
						</div>
						<Button
							type="submit"
							size="lg"
							className="w-full gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25"
							disabled={isLoading || isGoogleLoading || isGitHubLoading}
						>
							{isLoading ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									{content.loadingButton}
								</>
							) : (
								<>
									{content.submitButton}
									<ArrowRight className="h-4 w-4" />
								</>
							)}
						</Button>
					</form>
				</CardContent>
				<CardFooter className="flex flex-col space-y-4 pt-2">
					<div className="text-sm text-center text-muted-foreground">
						{content.noAccount}{' '}
						<Link to="/sign-up" className="text-primary hover:underline font-medium">
							{content.signUpLink}
						</Link>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
