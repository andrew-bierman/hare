'use client'

export interface HeaderProps {
	Link: React.ComponentType<{ to: string; className?: string; children: React.ReactNode }>
	UserNav?: React.ComponentType
	onMobileMenuToggle?: () => void
}

/**
 * Header widget for dashboard.
 * Minimal header with user navigation only - sidebar provides branding.
 */
export function Header({ UserNav }: HeaderProps) {
	return (
		<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="flex h-14 items-center justify-end px-4 sm:px-6">
				{/* User nav only - sidebar provides logo/branding */}
				<div className="flex items-center">
					{UserNav && <UserNav />}
				</div>
			</div>
		</header>
	)
}
