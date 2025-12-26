'use client'

import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardFooter } from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
<<<<<<< HEAD
import { ArrowRight, Github, Loader2, Rabbit } from 'lucide-react'
=======
import { Separator } from '@workspace/ui/components/separator'
import { ArrowRight, Loader2, Rabbit } from 'lucide-react'
>>>>>>> origin/main
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { APP_CONFIG, AUTH_CONTENT } from 'web-app/config'
<<<<<<< HEAD
import { useOAuthProviders } from 'web-app/lib/api/hooks'
import { signInWithGitHub, signInWithGoogle, signUp } from 'web-app/lib/auth-client'

const { signUp: content, fields, validation } = AUTH_CONTENT

// Google icon component (not available in lucide-react)
=======
import { signIn, signUp } from 'web-app/lib/auth-client'

const { signUp: content, fields, validation } = AUTH_CONTENT

>>>>>>> origin/main
function GoogleIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			role="img"
			aria-label="Google"
		>
<<<<<<< HEAD
			<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
			<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
			<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
			<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
=======
			<path
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				fill="#4285F4"
			/>
			<path
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				fill="#34A853"
			/>
			<path
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
				fill="#FBBC05"
			/>
			<path
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				fill="#EA4335"
			/>
		</svg>
	)
}

function GitHubIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			role="img"
			aria-label="GitHub"
		>
			<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
>>>>>>> origin/main
		</svg>
	)
}

export default function SignUpPage() {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)
<<<<<<< HEAD
	const [isGoogleLoading, setIsGoogleLoading] = useState(false)
	const [isGitHubLoading, setIsGitHubLoading] = useState(false)
=======
	const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null)
>>>>>>> origin/main
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const { data: providers, isLoading: isProvidersLoading } = useOAuthProviders()

	const hasOAuthProviders = providers?.google || providers?.github

	async function handleGoogleSignIn() {
		setIsGoogleLoading(true)
		try {
			await signInWithGoogle()
		} catch (error) {
			toast.error('Failed to sign up with Google')
			console.error(error)
			setIsGoogleLoading(false)
		}
	}

	async function handleGitHubSignIn() {
		setIsGitHubLoading(true)
		try {
			await signInWithGitHub()
		} catch (error) {
			toast.error('Failed to sign up with GitHub')
			console.error(error)
			setIsGitHubLoading(false)
		}
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()

		if (password !== confirmPassword) {
			toast.error(validation.passwordsNoMatch)
			return
		}

		if (password.length < 8) {
			toast.error(validation.passwordMinLength)
			return
		}

		setIsLoading(true)

		try {
			const result = await signUp.email({
				email,
				password,
				name,
			})

			if (result.error) {
				toast.error(result.error.message || 'Failed to create account')
				return
			}

			toast.success(AUTH_CONTENT.success.signUp)
			router.push('/dashboard')
			router.refresh()
		} catch (error) {
			toast.error('An unexpected error occurred')
			console.error(error)
		} finally {
			setIsLoading(false)
		}
	}

	async function handleSocialSignIn(provider: 'google' | 'github') {
		setSocialLoading(provider)

		try {
			await signIn.social({
				provider,
				callbackURL: '/dashboard',
			})
		} catch (error) {
			toast.error(`Failed to sign up with ${provider}`)
			console.error(error)
			setSocialLoading(null)
		}
	}

	return (
		<div className="space-y-8">
			{/* Mobile logo */}
			<div className="lg:hidden flex flex-col items-center space-y-4">
				<Link href="/" className="flex items-center gap-3">
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
<<<<<<< HEAD
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
=======
				{/* Social Login Buttons */}
				<CardContent className="pt-6 space-y-3">
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="w-full gap-3"
						onClick={() => handleSocialSignIn('google')}
						disabled={!!socialLoading || isLoading}
					>
						{socialLoading === 'google' ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : (
							<GoogleIcon className="h-5 w-5" />
						)}
						Continue with Google
					</Button>
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="w-full gap-3"
						onClick={() => handleSocialSignIn('github')}
						disabled={!!socialLoading || isLoading}
					>
						{socialLoading === 'github' ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : (
							<GitHubIcon className="h-5 w-5" />
						)}
						Continue with GitHub
					</Button>

					<div className="relative my-4">
						<div className="absolute inset-0 flex items-center">
							<Separator className="w-full" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-card px-2 text-muted-foreground">or continue with email</span>
						</div>
					</div>
				</CardContent>

				<form onSubmit={handleSubmit}>
					<CardContent className="pt-0 space-y-5">
>>>>>>> origin/main
						<div className="space-y-2">
							<Label htmlFor="name" className="text-sm font-medium">
								{fields.name.label}
							</Label>
							<Input
								id="name"
								placeholder={fields.name.placeholder}
								value={name}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
								required
<<<<<<< HEAD
								disabled={isLoading || isGoogleLoading || isGitHubLoading}
=======
								disabled={isLoading || !!socialLoading}
>>>>>>> origin/main
								className="h-11"
							/>
						</div>
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
<<<<<<< HEAD
								disabled={isLoading || isGoogleLoading || isGitHubLoading}
=======
								disabled={isLoading || !!socialLoading}
>>>>>>> origin/main
								className="h-11"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password" className="text-sm font-medium">
								{fields.password.label}
							</Label>
							<Input
								id="password"
								type="password"
								placeholder="At least 8 characters"
								value={password}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
								required
<<<<<<< HEAD
								disabled={isLoading || isGoogleLoading || isGitHubLoading}
=======
								disabled={isLoading || !!socialLoading}
>>>>>>> origin/main
								minLength={8}
								className="h-11"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-password" className="text-sm font-medium">
								{fields.confirmPassword.label}
							</Label>
							<Input
								id="confirm-password"
								type="password"
								placeholder={fields.confirmPassword.placeholder}
								value={confirmPassword}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
								required
<<<<<<< HEAD
								disabled={isLoading || isGoogleLoading || isGitHubLoading}
=======
								disabled={isLoading || !!socialLoading}
>>>>>>> origin/main
								minLength={8}
								className="h-11"
							/>
						</div>
						<Button
							type="submit"
							size="lg"
							className="w-full gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25"
<<<<<<< HEAD
							disabled={isLoading || isGoogleLoading || isGitHubLoading}
=======
							disabled={isLoading || !!socialLoading}
>>>>>>> origin/main
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
						{content.hasAccount}{' '}
						<Link href="/sign-in" className="text-primary hover:underline font-medium">
							{content.signInLink}
						</Link>
					</div>
				</CardFooter>
			</Card>

			<p className="text-xs text-center text-muted-foreground px-4">
				{content.terms}{' '}
				<Link href="/terms" className="text-primary hover:underline">
					{content.termsLink}
				</Link>{' '}
				and{' '}
				<Link href="/privacy" className="text-primary hover:underline">
					{content.privacyLink}
				</Link>
			</p>
		</div>
	)
}
