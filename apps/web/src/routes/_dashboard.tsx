import { Header, Sidebar } from '@hare/app/widgets'
import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { WorkspaceProvider } from 'web-app/app'
import { UserNav } from 'web-app/components/layout/user-nav'
import { WorkspaceSwitcher } from 'web-app/components/layout/workspace-switcher'
import {
	DashboardErrorComponent,
	DashboardNotFound,
	DashboardPendingComponent,
} from 'web-app/components/router'

export const Route = createFileRoute('/_dashboard')({
	component: DashboardLayout,
	errorComponent: DashboardErrorComponent,
	notFoundComponent: DashboardNotFound,
	pendingComponent: DashboardPendingComponent,
})

function DashboardLayout() {
	const { pathname } = useLocation()

	return (
		<WorkspaceProvider>
			<div className="h-screen flex bg-background overflow-x-hidden">
				{/* Sidebar */}
				<div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-50">
					<Sidebar
						pathname={pathname}
						Link={Link}
						WorkspaceSwitcher={WorkspaceSwitcher}
					/>
				</div>

				{/* Main content */}
				<main className="md:pl-72 flex-1 flex flex-col min-h-screen">
					<Header Link={Link} UserNav={UserNav} />
					<div className="flex-1 overflow-y-auto bg-muted/20">
						<Outlet />
					</div>
				</main>
			</div>
		</WorkspaceProvider>
	)
}
