import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
	return (
		<div className="space-y-6">
			<div className="flex flex-col space-y-2 text-center">
				<h1 className="text-3xl font-bold tracking-tight">Hare</h1>
				<p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Sign In</CardTitle>
					<CardDescription>Enter your email and password to access your account</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" type="email" placeholder="you@example.com" />
					</div>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="password">Password</Label>
							<Link href="/forgot-password" className="text-xs text-muted-foreground hover:underline">
								Forgot password?
							</Link>
						</div>
						<Input id="password" type="password" />
					</div>
				</CardContent>
				<CardFooter className="flex flex-col space-y-4">
					<Button className="w-full">Sign In</Button>
					<div className="text-sm text-center text-muted-foreground">
						Don't have an account?{" "}
						<Link href="/sign-up" className="text-primary hover:underline">
							Sign up
						</Link>
					</div>
				</CardFooter>
			</Card>
		</div>
	);
}
