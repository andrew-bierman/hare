"use client";

import { ChevronsUpDown } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function WorkspaceSwitcher() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className="w-full justify-between">
					<span className="truncate">My Workspace</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-64" align="start">
				<DropdownMenuLabel>Workspaces</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<div className="flex flex-col gap-1">
						<div className="font-medium">My Workspace</div>
						<div className="text-xs text-muted-foreground">Personal workspace</div>
					</div>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem>Create workspace...</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
