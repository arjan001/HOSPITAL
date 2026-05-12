"use client"

import React from "react"
import { useState } from "react"
import { toast } from "sonner"
import { Shield, ShieldCheck, Eye, Pencil, UserX, MoreHorizontal, UserCircle, UserPlus, Loader2, AlertCircle, Mail, Trash2 } from "lucide-react"
import { usePagination } from "@/hooks/use-pagination"
import { PaginationControls } from "@/components/pagination-controls"
import { AdminShell } from "./admin-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AdminUser {
  id: string
  display_name: string
  email: string
  role: string
  is_active: boolean
  last_login: string | null
  created_at: string
}

const ROLES = [
  { value: "super_admin", label: "Super Admin", description: "Full system access, user management", icon: ShieldCheck, color: "bg-foreground text-background" },
  { value: "admin", label: "Admin", description: "Manage products, orders, settings", icon: Shield, color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  { value: "editor", label: "Editor", description: "Add and edit products, banners", icon: Pencil, color: "bg-amber-500/10 text-amber-700 border-amber-200" },
  { value: "viewer", label: "Viewer", description: "View-only access to dashboard", icon: Eye, color: "bg-secondary text-muted-foreground" },
]

function getRoleBadge(role: string) {
  const r = ROLES.find((x) => x.value === role)
  if (!r) return <Badge variant="outline" className="text-[10px]">{role}</Badge>
  return <Badge className={`text-[10px] border ${r.color}`}>{r.label}</Badge>
}

export function UsersManagement() {
  const { data: users = [], mutate } = useSWR<AdminUser[]>("/api/admin/users", fetcher)
  const [currentUserRole, setCurrentUserRole] = React.useState<string | null>(null)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState({ display_name: "", role: "", is_active: true })
  const [saving, setSaving] = useState(false)

  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: "", displayName: "", password: "", role: "admin" })
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState("")
  const [inviteSuccess, setInviteSuccess] = useState(false)

  // Fetch current user's role
  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setCurrentUserRole(data.role || null))
      .catch(() => setCurrentUserRole(null))
  }, [])

  const openEdit = (u: AdminUser) => {
    setEditUser(u)
    setEditForm({ display_name: u.display_name, role: u.role, is_active: u.is_active })
  }

  const handleSave = async () => {
    if (!editUser) return
    setSaving(true)
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editUser.id, ...editForm }),
    })
    setSaving(false)
    setEditUser(null)
    mutate()
    if (res.ok) toast.success("User updated successfully")
    else toast.error("Failed to update user")
  }

  const handleToggleActive = async (u: AdminUser) => {
    // Note: Database has no is_active column for admin_users
    // This is a placeholder - all admin users are active
    toast.info("Admin users cannot be deactivated - use Delete instead")
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently remove this user?")) return
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" })
    mutate()
    if (res.ok) toast.success("User removed successfully")
    else toast.error("Failed to remove user")
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError("")
    if (inviteForm.password.length < 6) {
      setInviteError("Password must be at least 6 characters")
      return
    }
    setInviting(true)
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error || "Failed to create user")
        toast.error(data.error || "Failed to create user")
      } else {
        setInviteSuccess(true)
        mutate()
        toast.success(`${inviteForm.displayName} added successfully`)
        setTimeout(() => {
          setShowInvite(false)
          setInviteSuccess(false)
          setInviteForm({ email: "", displayName: "", password: "", role: "admin" })
        }, 2000)
      }
    } catch {
      setInviteError("Network error")
    } finally {
      setInviting(false)
    }
  }

  const activeUsers = users.filter((u) => u.is_active)
  const inactiveUsers = users.filter((u) => !u.is_active)

  const { paginatedItems: paginatedActive, currentPage: activePage, totalPages: activeTotalPages, totalItems: activeTotalItems, itemsPerPage: activePerPage, goToPage: goToActivePage, changePerPage: changeActivePerPage } = usePagination(activeUsers, { defaultPerPage: 10 })
  const { paginatedItems: paginatedInactive, currentPage: inactivePage, totalPages: inactiveTotalPages, totalItems: inactiveTotalItems, itemsPerPage: inactivePerPage, goToPage: goToInactivePage, changePerPage: changeInactivePerPage } = usePagination(inactiveUsers, { defaultPerPage: 10 })

  return (
    <AdminShell title="Users & Roles">
      <div className="space-y-8">

        {/* Header with Permissions Info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold">Users & Roles</h1>
            <p className="text-sm text-muted-foreground mt-1">{users.length} team member{users.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-3">
            {currentUserRole === "editor" && (
              <div className="text-xs text-muted-foreground bg-amber-500/10 px-3 py-2 rounded-sm border border-amber-200">
                Editors can only create Viewer accounts
              </div>
            )}
            <Button onClick={() => { setShowInvite(true); setInviteError(""); setInviteSuccess(false) }} className="bg-foreground text-background hover:bg-foreground/90">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </div>
        </div>

        {/* Role Legend Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ROLES.map((r) => (
            <div key={r.value} className="flex items-start gap-3 p-4 border border-border rounded-sm bg-secondary/20">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <r.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{r.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Active Users Table */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            Active Users
            <Badge variant="secondary" className="text-[10px]">{activeUsers.length}</Badge>
          </h3>
          <div className="border border-border rounded-sm overflow-hidden">
            {/* Table Header - Desktop */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[35%]">User</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[15%]">Role</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[12%]">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[20%]">Last Login</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5 w-[18%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedActive.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No active users found</td></tr>
                  ) : paginatedActive.map((u) => (
                    <tr key={u.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <UserCircle className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{u.display_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getRoleBadge(u.role)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 border-green-200">Active</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "Never"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(u)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(u.id)} className="text-destructive">
                              <Trash2 className="h-3.5 w-3.5 mr-2" />Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border">
              {paginatedActive.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No active users found</div>
              ) : paginatedActive.map((u) => (
                <div key={u.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(u)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(u.id)} className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-2" />Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 mt-3 ml-[52px]">
                    {getRoleBadge(u.role)}
                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 border-green-200">Active</Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "Never logged in"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <PaginationControls
            currentPage={activePage}
            totalPages={activeTotalPages}
            totalItems={activeTotalItems}
            itemsPerPage={activePerPage}
            onPageChange={goToActivePage}
            onItemsPerPageChange={changeActivePerPage}
            perPageOptions={[5, 10, 20]}
          />
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null) }}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details and permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Display Name</Label>
              <Input value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} className="h-10" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center gap-2">
                        <r.icon className="h-3.5 w-3.5" />
                        {r.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">{ROLES.find((r) => r.value === editForm.role)?.description}</p>
            </div>
            <div className="flex items-center justify-between p-3 border border-border rounded-sm bg-secondary/30">
              <div>
                <p className="text-sm font-medium">Active Status</p>
                <p className="text-xs text-muted-foreground">Inactive users cannot sign in</p>
              </div>
              <Switch checked={editForm.is_active} onCheckedChange={(v) => setEditForm({ ...editForm, is_active: v })} />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" className="bg-transparent" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-foreground text-background hover:bg-foreground/90">{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={showInvite} onOpenChange={(open) => { if (!open) { setShowInvite(false); setInviteError(""); setInviteSuccess(false) } }}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Add Team Member</DialogTitle>
            <DialogDescription>Create a new admin account with assigned role and permissions.</DialogDescription>
          </DialogHeader>

          {inviteSuccess ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-7 w-7 text-green-700" />
              </div>
              <p className="text-sm font-semibold">Account Created Successfully</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                {inviteForm.displayName} ({inviteForm.email}) can now sign in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="space-y-4 mt-2">
              {inviteError && (
                <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />{inviteError}
                </div>
              )}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Full Name</Label>
                <Input value={inviteForm.displayName} onChange={(e) => setInviteForm({ ...inviteForm, displayName: e.target.value })} placeholder="e.g. Jane Wanjiku" className="h-10" required />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Email Address</Label>
                <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="jane@herkingdom.co.ke" className="h-10" required />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Temporary Password</Label>
                <Input type="password" value={inviteForm.password} onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })} placeholder="Min 6 characters" className="h-10" required minLength={6} />
                <p className="text-xs text-muted-foreground mt-1">User should change this after first login.</p>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Assign Role</Label>
                <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => {
                      // Editors can only create viewers
                      if (currentUserRole === "editor" && r.value !== "viewer") return null
                      return (
                        <SelectItem key={r.value} value={r.value}>
                          <div className="flex items-center gap-2">
                            <r.icon className="h-3.5 w-3.5" />
                            <span>{r.label}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">- {r.description}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {currentUserRole === "editor" && (
                  <p className="text-xs text-amber-700 mt-1.5 bg-amber-500/10 px-2 py-1 rounded border border-amber-200">
                    Editors can only create Viewer accounts for read-only access.
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" className="bg-transparent" onClick={() => setShowInvite(false)}>Cancel</Button>
                <Button type="submit" disabled={inviting} className="bg-foreground text-background hover:bg-foreground/90">
                  {inviting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>) : "Create Account"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}
