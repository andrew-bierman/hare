'use client'

import { Link } from '@tanstack/react-router'
import { Button } from '@hare/ui/components/button'
import { Card, CardContent } from '@hare/ui/components/card'
import { Input } from '@hare/ui/components/input'
import { Label } from '@hare/ui/components/label'
import { ArrowRight, CheckCircle, Loader2, Rabbit, XCircle } from 'lucide-react'
import { type ChangeEvent, type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { config } from '@hare/config'
import { resetPassword } from '@hare/auth/client'

const { resetPassword: content, validation } = config.content.auth

interface ResetPasswordPageProps {
	token: string | null
}

export function ResetPasswordPage({ token }: ResetPasswordPageProps) {
	const [isLoading, setIsLoading] = useState(false)
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [resetComplete, setResetComplete] = useState(false)

	// If no token, show error state
	if (!token) {
		return (
			<div className="space-y-8">
				{/* Mobile logo */}
				<div className="lg:hidden flex flex-col items-center space-y-4">
					<Link to="/" className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25">
							<Rabbit className="h-6 w-6 text-white" />
						</div>
						<span className="font-bold text-2xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
							{config.app.name}
						</span>
					</Link>
				</div>

				<Card className="border-border/50 shadow-lg">
					<CardContent className="pt-6 space-y-6 text-center">
						<div className="flex justify-center">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-500 shadow-lg">
								<XCircle className="h-8 w-8 text-white" />
							</div>
						</div>
						<div className="space-y-2">
							<h1 className="text-2xl font-bold tracking-tight">Invalid Link</h1>
							<p className="text-muted-foreground">{content.invalidToken}</p>
						</div>
						<Link to={'/forgot-password' as string}>
							<Button
								variant="outline"
								size="lg"
								className="w-full gap-2"
							>
								Request New Reset Link
								<ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Success state after password reset
	if (resetComplete) {
		return (
			<div className="space-y-8">
				{/* Mobile logo */}
				<div className="lg:hidden flex flex-col items-center space-y-4">
					<Link to="/" className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25">
							<Rabbit className="h-6 w-6 text-white" />
						</div>
						<span className="font-bold text-2xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
							{config.app.name}
						</span>
					</Link>
				</div>

				<Card className="border-border/50 shadow-lg">
					<CardContent className="pt-6 space-y-6 text-center">
						<div className="flex justify-center">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
								<CheckCircle className="h-8 w-8 text-white" />
							</div>
						</div>
						<div className="space-y-2">
							<h1 className="text-2xl font-bold tracking-tight">
								{content.success.title}
							</h1>
							<p className="text-muted-foreground">{content.success.subtitle}</p>
						</div>
						<Link to={'/sign-in' as string}>
							<Button
								size="lg"
								className="w-full gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25"
							>
								{content.success.signInLink}
								<ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
					</CardContent>
				</Card>
			</div>
		)
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
			const result = await resetPassword({
				newPassword: password,
				token: token!,
			})

			if (result.error) {
				// Check for invalid/expired token error
				if (result.error.message?.toLowerCase().includes('invalid') ||
					result.error.message?.toLowerCase().includes('expired')) {
					toast.error(content.invalidToken)
				} else {
					toast.error(result.error.message || 'Failed to reset password')
				}
				return
			}

			setResetComplete(true)
			toast.success(config.content.auth.success.passwordReset)
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
						{config.app.name}
					</span>
				</Link>
			</div>

			<div className="flex flex-col space-y-2 text-center lg:text-left">
				<h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
				<p className="text-muted-foreground">{content.subtitle}</p>
			</div>

			<Card className="border-border/50 shadow-lg">
				<CardContent className="pt-6 space-y-5">
					<form onSubmit={handleSubmit} className="space-y-5">
						<div className="space-y-2">
							<Label htmlFor="password" className="text-sm font-medium">
								{content.newPassword.label}
							</Label>
							<Input
								id="password"
								type="password"
								placeholder={content.newPassword.placeholder}
								value={password}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
								required
								disabled={isLoading}
								minLength={8}
								className="h-11"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-password" className="text-sm font-medium">
								{content.confirmNewPassword.label}
							</Label>
							<Input
								id="confirm-password"
								type="password"
								placeholder={content.confirmNewPassword.placeholder}
								value={confirmPassword}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
								required
								disabled={isLoading}
								minLength={8}
								className="h-11"
							/>
						</div>
						<Button
							type="submit"
							size="lg"
							className="w-full gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25"
							disabled={isLoading}
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
			</Card>
		</div>
	)
}
