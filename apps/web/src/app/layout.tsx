import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from 'web-app/components/providers/providers'
import { DevTools } from 'web-app/components/dev/dev-tools'
import { APP_CONFIG } from 'web-app/config'
import '@workspace/ui/globals.css'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

export const metadata: Metadata = {
	title: `${APP_CONFIG.name} - ${APP_CONFIG.tagline}`,
	description: APP_CONFIG.description,
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en">
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
			</head>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<Providers>
					{children}
					<DevTools />
				</Providers>
			</body>
		</html>
	)
}
