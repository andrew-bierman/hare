'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@workspace/ui/components/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@workspace/ui/components/select'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Clock, Mail, MoreVertical, Shield, Trash2, UserMinus, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../features/auth'
import { useWorkspace } from '../../app/providers'
import {
	type MemberRole,
	useRemoveMember,
	useRevokeInvitation,
	useSendInvitation,
	useUpdateMemberRole,
	useWorkspaceInvitations,
	useWorkspaceMembers,
	type WorkspaceInvitation,
	type WorkspaceMember,
} from '../../entities/workspace'
import type { WorkspaceRole } from '../../shared/api'

function getInitials(name: string): string {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

function getRoleBadgeVariant(role: WorkspaceRole): 'default' | 'secondary' | 'outline' {
	switch (role) {
		case 'owner':
			return 'default'
		case 'admin':
			return 'secondary'
		default:
			return 'outline'
	}
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})
}

function MemberCard({
	member,
	currentUserId,
	currentUserRole,
	onRemove,
	onUpdateRole,
}: {
	member: WorkspaceMember
	currentUserId: string | undefined
	currentUserRole: WorkspaceRole | undefined
	onRemove: (userId: string) => void
	onUpdateRole: (userId: string, role: MemberRole) => void
}) {
	const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
	const [selectedRole, setSelectedRole] = useState<MemberRole>(
		member.role === 'owner' ? 'admin' : (member.role as MemberRole),
	)

	const isOwner = member.role === 'owner'
	const isCurrentUser = member.userId === currentUserId
	const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'
	const canChangeRole = canManage && !isOwner && !isCurrentUser

	const handleUpdateRole = () => {
		onUpdateRole(member.userId, selectedRole)
		setIsRoleDialogOpen(false)
	}

	return (
		<div className="flex items-center justify-between p-4 border rounded-lg">
			<div className="flex items-center gap-4">
				<Avatar className="h-10 w-10">
					<AvatarImage src={member.image || undefined} alt={member.name} />
					<AvatarFallback>{getInitials(member.name)}</AvatarFallback>
				</Avatar>
				<div>
					<div className="flex items-center gap-2">
						<p className="font-medium">{member.name}</p>
						{isCurrentUser && (
							<Badge variant="outline" className="text-xs">
								You
							</Badge>
						)}
					</div>
					<p className="text-sm text-muted-foreground">{member.email}</p>
					<p className="text-xs text-muted-foreground">Joined {formatDate(member.joinedAt)}</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Badge variant={getRoleBadgeVariant(member.role)}>{member.role}</Badge>
				{canChangeRole && (
					<Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
						<DialogTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<MoreVertical className="h-4 w-4" />
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Manage Member</DialogTitle>
								<DialogDescription>
									Update role or remove {member.name} from this workspace.
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="grid gap-2">
									<Label htmlFor="role">Role</Label>
									<Select
										value={selectedRole}
										onValueChange={(value) => setSelectedRole(value as MemberRole)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select a role" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="admin">Admin</SelectItem>
											<SelectItem value="member">Member</SelectItem>
											<SelectItem value="viewer">Viewer</SelectItem>
										</SelectContent>
									</Select>
									<p className="text-xs text-muted-foreground">
										{selectedRole === 'admin' && 'Can manage workspace settings and members'}
										{selectedRole === 'member' && 'Can create and edit agents and tools'}
										{selectedRole === 'viewer' && 'Can only view agents and conversations'}
									</p>
								</div>
							</div>
							<DialogFooter className="flex-col gap-2 sm:flex-row">
								<Button
									variant="destructive"
									onClick={() => {
										onRemove(member.userId)
										setIsRoleDialogOpen(false)
									}}
								>
									<UserMinus className="mr-2 h-4 w-4" />
									Remove Member
								</Button>
								<Button onClick={handleUpdateRole}>Update Role</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				)}
			</div>
		</div>
	)
}

function InvitationCard({
	invitation,
	onRevoke,
}: {
	invitation: WorkspaceInvitation
	onRevoke: (inviteId: string) => void
}) {
	const isExpired = new Date(invitation.expiresAt) < new Date()

	return (
		<div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
			<div className="flex items-center gap-4">
				<div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
					<Mail className="h-5 w-5 text-muted-foreground" />
				</div>
				<div>
					<p className="font-medium">{invitation.email}</p>
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<Clock className="h-3 w-3" />
						<span>{isExpired ? 'Expired' : `Expires ${formatDate(invitation.expiresAt)}`}</span>
						<span>-</span>
						<span>Invited by {invitation.invitedBy.name}</span>
					</div>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Badge variant="outline">{invitation.role}</Badge>
				<Badge variant={isExpired ? 'destructive' : 'secondary'}>
					{isExpired ? 'Expired' : 'Pending'}
				</Badge>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 text-destructive"
					onClick={() => onRevoke(invitation.id)}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)
}

function InviteForm({ workspaceId, onSuccess }: { workspaceId: string; onSuccess: () => void }) {
	const [email, setEmail] = useState('')
	const [role, setRole] = useState<MemberRole>('member')
	const [isOpen, setIsOpen] = useState(false)

	const sendInvitation = useSendInvitation()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!email) return

		try {
			await sendInvitation.mutateAsync({
				workspaceId,
				data: { email, role },
			})
			toast.success(`Invitation sent to ${email}`)
			setEmail('')
			setRole('member')
			setIsOpen(false)
			onSuccess()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to send invitation')
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button>
					<UserPlus className="mr-2 h-4 w-4" />
					Invite Member
				</Button>
			</DialogTrigger>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Invite Team Member</DialogTitle>
						<DialogDescription>
							Send an invitation to join this workspace. They will receive an email with a link to
							join.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="email">Email Address</Label>
							<Input
								id="email"
								type="email"
								placeholder="colleague@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="invite-role">Role</Label>
							<Select value={role} onValueChange={(value) => setRole(value as MemberRole)}>
								<SelectTrigger id="invite-role">
									<SelectValue placeholder="Select a role" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="admin">Admin</SelectItem>
									<SelectItem value="member">Member</SelectItem>
									<SelectItem value="viewer">Viewer</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								{role === 'admin' && 'Can manage workspace settings and members'}
								{role === 'member' && 'Can create and edit agents and tools'}
								{role === 'viewer' && 'Can only view agents and conversations'}
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={sendInvitation.isPending}>
							{sendInvitation.isPending ? 'Sending...' : 'Send Invitation'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

export function TeamPage() {
	const { data: session } = useAuth()
	const { activeWorkspace, workspaceRole } = useWorkspace()

	const {
		data: membersData,
		isLoading: membersLoading,
		refetch: refetchMembers,
	} = useWorkspaceMembers(activeWorkspace?.id)

	const {
		data: invitationsData,
		isLoading: invitationsLoading,
		refetch: refetchInvitations,
	} = useWorkspaceInvitations(activeWorkspace?.id)

	const removeMember = useRemoveMember()
	const updateMemberRole = useUpdateMemberRole()
	const revokeInvitation = useRevokeInvitation()

	const canManageTeam = workspaceRole === 'owner' || workspaceRole === 'admin'

	const handleRemoveMember = async (userId: string) => {
		if (!activeWorkspace) return

		try {
			await removeMember.mutateAsync({
				workspaceId: activeWorkspace.id,
				userId,
			})
			toast.success('Member removed')
			refetchMembers()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to remove member')
		}
	}

	const handleUpdateRole = async (userId: string, role: MemberRole) => {
		if (!activeWorkspace) return

		try {
			await updateMemberRole.mutateAsync({
				workspaceId: activeWorkspace.id,
				userId,
				role,
			})
			toast.success('Role updated')
			refetchMembers()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update role')
		}
	}

	const handleRevokeInvitation = async (inviteId: string) => {
		if (!activeWorkspace) return

		try {
			await revokeInvitation.mutateAsync({
				workspaceId: activeWorkspace.id,
				inviteId,
			})
			toast.success('Invitation revoked')
			refetchInvitations()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to revoke invitation')
		}
	}

	if (membersLoading) {
		return (
			<div className="flex-1 space-y-6 p-8 pt-6">
				<Skeleton className="h-9 w-48" />
				<div className="grid gap-6">
					<Skeleton className="h-64 w-full" />
					<Skeleton className="h-48 w-full" />
				</div>
			</div>
		)
	}

	const members = membersData?.members || []
	const invitations = invitationsData?.invitations || []
	const pendingInvitations = invitations.filter((inv) => inv.status === 'pending')

	return (
		<div className="flex-1 space-y-6 p-8 pt-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Team</h2>
					<p className="text-muted-foreground">
						Manage team members and permissions for {activeWorkspace?.name}
					</p>
				</div>
				{canManageTeam && activeWorkspace && (
					<InviteForm workspaceId={activeWorkspace.id} onSuccess={() => refetchInvitations()} />
				)}
			</div>

			<div className="grid gap-6">
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Users className="h-5 w-5 text-zinc-500" />
							<CardTitle>Members</CardTitle>
						</div>
						<CardDescription>
							{members.length} {members.length === 1 ? 'member' : 'members'} in this workspace
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{members.length === 0 ? (
							<p className="text-center text-muted-foreground py-8">No members found</p>
						) : (
							members.map((member) => (
								<MemberCard
									key={member.id}
									member={member}
									currentUserId={session?.user?.id}
									currentUserRole={workspaceRole}
									onRemove={handleRemoveMember}
									onUpdateRole={handleUpdateRole}
								/>
							))
						)}
					</CardContent>
				</Card>

				{canManageTeam && (
					<Card>
						<CardHeader>
							<div className="flex items-center gap-2">
								<Mail className="h-5 w-5 text-zinc-500" />
								<CardTitle>Pending Invitations</CardTitle>
							</div>
							<CardDescription>
								{invitationsLoading
									? 'Loading...'
									: `${pendingInvitations.length} pending ${
											pendingInvitations.length === 1 ? 'invitation' : 'invitations'
										}`}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{invitationsLoading ? (
								<div className="space-y-4">
									<Skeleton className="h-20 w-full" />
									<Skeleton className="h-20 w-full" />
								</div>
							) : pendingInvitations.length === 0 ? (
								<p className="text-center text-muted-foreground py-8">No pending invitations</p>
							) : (
								pendingInvitations.map((invitation) => (
									<InvitationCard
										key={invitation.id}
										invitation={invitation}
										onRevoke={handleRevokeInvitation}
									/>
								))
							)}
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Shield className="h-5 w-5 text-zinc-500" />
							<CardTitle>Roles & Permissions</CardTitle>
						</div>
						<CardDescription>Understanding workspace roles</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="flex items-start gap-3">
								<Badge variant="default" className="mt-0.5">
									Owner
								</Badge>
								<div>
									<p className="font-medium">Full Access</p>
									<p className="text-sm text-muted-foreground">
										Can manage all workspace settings, billing, members, and delete the workspace
									</p>
								</div>
							</div>
							<Separator />
							<div className="flex items-start gap-3">
								<Badge variant="secondary" className="mt-0.5">
									Admin
								</Badge>
								<div>
									<p className="font-medium">Manage Team</p>
									<p className="text-sm text-muted-foreground">
										Can invite and remove members, manage agents and tools, but cannot delete
										workspace or change owner
									</p>
								</div>
							</div>
							<Separator />
							<div className="flex items-start gap-3">
								<Badge variant="outline" className="mt-0.5">
									Member
								</Badge>
								<div>
									<p className="font-medium">Create & Edit</p>
									<p className="text-sm text-muted-foreground">
										Can create and edit agents, tools, and conversations, but cannot manage team
									</p>
								</div>
							</div>
							<Separator />
							<div className="flex items-start gap-3">
								<Badge variant="outline" className="mt-0.5">
									Viewer
								</Badge>
								<div>
									<p className="font-medium">Read Only</p>
									<p className="text-sm text-muted-foreground">
										Can view agents, tools, and conversations, but cannot create or edit anything
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
