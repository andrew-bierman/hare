import { useTour, WorkspaceGate, WorkspaceProvider } from '@hare/app'
import {
	DashboardErrorComponent,
	DashboardNotFound,
	DashboardPendingComponent,
	DEFAULT_TOUR_STEPS,
	DevTools,
	Header,
	OnboardingTour,
	Sidebar,
	UserNav,
	WorkspaceSwitcher,
} from '@hare/app/widgets'
import { useSession } from '@hare/auth/client'
import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useLocation,
	useNavigate,
	useRouteContext,
} from '@tanstack/react-router'
import { useLayoutEffect } from 'react'

export const Route = createFileRoute('/_dashboard')({
	beforeLoad: ({ context }) => {
		// Use auth context from root route - no duplicate network calls
		// Auth is already fetched in __root.tsx beforeLoad
		// During SSR, skip redirect - client will handle auth check
		const isSSR = (context.auth as { _isSSR?: boolean })._isSSR
		if (!isSSR && !context.auth.isAuthenticated) {
			throw redirect({ to: '/sign-in' })
		}
	},
	component: DashboardLayout,
	errorComponent: DashboardErrorComponent,
	notFoundComponent: DashboardNotFound,
	pendingComponent: DashboardPendingComponent,
})

function DashboardLayout() {
	const { pathname } = useLocation()
	const navigate = useNavigate()
	const context = useRouteContext({ from: '/_dashboard' })
	const { data: session, isPending } = useSession()

	// Onboarding tour state management
	const tour = useTour({
		totalSteps: DEFAULT_TOUR_STEPS.length,
		autoStart: true,
	})

	// Client-side auth guard - handles SSR hydration case
	// Use useLayoutEffect for immediate redirect before paint
	useLayoutEffect(() => {
		// First check route context (from SSR), then session query
		const isSSR = (context.auth as { _isSSR?: boolean })?._isSSR
		if (isSSR) {
			// During hydration, wait for session query
			if (!isPending && !session?.user) {
				navigate({ to: '/sign-in' })
			}
		} else if (!context.auth?.isAuthenticated) {
			// On client navigation, context is reliable
			navigate({ to: '/sign-in' })
		}
	}, [context.auth, session, isPending, navigate])

	return (
		<WorkspaceProvider>
			<div className="h-screen flex bg-background overflow-x-hidden">
				{/* Sidebar */}
				<div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-50">
					<Sidebar pathname={pathname} Link={Link} WorkspaceSwitcher={WorkspaceSwitcher} />
				</div>

				{/* Main content */}
				<main className="md:pl-72 flex-1 flex flex-col min-h-screen">
					<Header
						Link={Link}
						UserNav={() => (
							<UserNav
								Link={Link}
								onStartTour={tour.startTour}
								onSignOut={() => navigate({ to: '/' })}
							/>
						)}
						onNavigate={(path) => navigate({ to: path })}
					/>
					<div className="flex-1 overflow-y-auto bg-muted/20">
						<WorkspaceGate>
							<Outlet />
						</WorkspaceGate>
					</div>
				</main>
			</div>
			<DevTools />

			{/* Onboarding Tour */}
			<OnboardingTour
				isActive={tour.isActive}
				currentStep={tour.currentStep}
				onNext={tour.nextStep}
				onPrev={tour.prevStep}
				onSkip={tour.skipTour}
				onComplete={tour.completeTour}
				steps={DEFAULT_TOUR_STEPS}
			/>
		</WorkspaceProvider>
	)
}
