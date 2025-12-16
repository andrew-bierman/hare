"use client";

import { UserNav } from "./user-nav";

export function Header() {
	return (
		<div className="border-b border-border">
			<div className="flex h-16 items-center px-4">
				<div className="ml-auto flex items-center space-x-4">
					<UserNav />
				</div>
			</div>
		</div>
	);
}
