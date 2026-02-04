'use client'

import { useState } from 'react'
import { createUser, deleteUser, updateUser, resetUserPassword } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Plus, Trash2, Shield, Pencil, Key, Search, AlertTriangle } from 'lucide-react'
import { useToast, ToastProvider } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'

interface AdminClientProps {
    profiles: any[]
}

export default function AdminPanel({ profiles }: AdminClientProps) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<any>(null)
    const [resettingPasswordUser, setResettingPasswordUser] = useState<any>(null)
    const [deletingUser, setDeletingUser] = useState<any>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(false)
    const { addToast } = useToast()
    const router = useRouter()

    const filteredProfiles = profiles.filter(p =>
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.username?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    async function handleCreateUser(formData: FormData) {
        setLoading(true)
        const result = await createUser(formData)
        setLoading(false)

        if (result.error) {
            addToast(result.error, 'error')
        } else {
            addToast('User created successfully', 'success')
            setIsCreateDialogOpen(false)
            router.refresh()
        }
    }

    async function handleUpdateUser(formData: FormData) {
        if (!editingUser) return
        setLoading(true)
        const result = await updateUser(editingUser.id, formData)
        setLoading(false)

        if (result.error) {
            addToast(result.error, 'error')
        } else {
            addToast('User updated successfully', 'success')
            setEditingUser(null)
            router.refresh()
        }
    }

    async function handleResetPassword(formData: FormData) {
        if (!resettingPasswordUser) return
        setLoading(true)
        const result = await resetUserPassword(resettingPasswordUser.id, formData)
        setLoading(false)

        if (result.error) {
            addToast(result.error, 'error')
        } else {
            addToast('Password reset successfully', 'success')
            setResettingPasswordUser(null)
        }
    }

    async function handleDeleteUser() {
        if (!deletingUser) return
        setLoading(true)
        const result = await deleteUser(deletingUser.id)
        setLoading(false)

        if (result.error) {
            addToast(result.error, 'error')
        } else {
            addToast('User deleted successfully', 'success')
            setDeletingUser(null)
            router.refresh()
        }
    }

    return (
        <ToastProvider>
            <div className="min-h-screen bg-gray-900 p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-6 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <Shield className="h-8 w-8 text-primary" />
                                Admin Dashboard
                            </h1>
                            <p className="text-gray-400 mt-2">Manage users and permissions</p>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-grow sm:flex-grow-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full sm:w-64 rounded-md bg-white/5 border-white/10 pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add User
                            </Button>
                            <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white" onClick={() => router.push('/dashboard')}>
                                Back to Dashboard
                            </Button>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-white/5 text-white uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Username</th>
                                    <th className="px-6 py-4">Department</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredProfiles.map((p) => (
                                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{p.full_name}</td>
                                        <td className="px-6 py-4">{p.username || '-'}</td>
                                        <td className="px-6 py-4">{p.department || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${p.role === 'SUPER_USER'
                                                ? 'bg-purple-400/10 text-purple-400 ring-purple-400/20'
                                                : 'bg-blue-400/10 text-blue-400 ring-blue-400/20'
                                                }`}>
                                                {p.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingUser(p)}
                                                    className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setResettingPasswordUser(p)}
                                                    className="p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                                                    title="Reset Password"
                                                >
                                                    <Key className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeletingUser(p)}
                                                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredProfiles.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            {searchTerm ? 'No users found matching your search.' : 'No users found. Create one to get started.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Create Dialog */}
                    <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)}>
                        <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Create New User</DialogTitle>
                            </DialogHeader>
                            <form action={handleCreateUser} className="space-y-4 mt-4">
                                <div>
                                    <label className="text-sm font-medium">Full Name</label>
                                    <input name="fullName" required className="block w-full rounded-md bg-white/5 border-white/10 px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Username</label>
                                    <input name="username" required pattern="[a-zA-Z0-9_-]+" title="Letters, numbers, underscores and dashes only" className="block w-full rounded-md bg-white/5 border-white/10 px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                    <p className="text-xs text-gray-500 mt-1">Used for signing in.</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Department</label>
                                    <input name="department" className="block w-full rounded-md bg-white/5 border-white/10 px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Password</label>
                                    <input name="password" type="password" required minLength={6} className="block w-full rounded-md bg-white/5 border-white/10 px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Role</label>
                                    <select name="role" className="block w-full rounded-md bg-white/5 border-white/10 px-3 py-2 mt-1 [&>option]:text-black focus:outline-none focus:ring-2 focus:ring-primary/50">
                                        <option value="USER">Standard User</option>
                                        <option value="SUPER_USER">Super User (Admin)</option>
                                    </select>
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? 'Creating...' : 'Create User'}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Dialog */}
                    <Dialog open={!!editingUser} onClose={() => setEditingUser(null)}>
                        <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Edit User</DialogTitle>
                            </DialogHeader>
                            {editingUser && (
                                <form action={handleUpdateUser} className="space-y-4 mt-4">
                                    <div>
                                        <label className="text-sm font-medium">Full Name</label>
                                        <input name="fullName" defaultValue={editingUser.full_name} required className="block w-full rounded-md bg-white/5 border-white/10 px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Department</label>
                                        <input name="department" defaultValue={editingUser.department} className="block w-full rounded-md bg-white/5 border-white/10 px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Role</label>
                                        <select name="role" defaultValue={editingUser.role} className="block w-full rounded-md bg-white/5 border-white/10 px-3 py-2 mt-1 [&>option]:text-black focus:outline-none focus:ring-2 focus:ring-primary/50">
                                            <option value="USER">Standard User</option>
                                            <option value="SUPER_USER">Super User (Admin)</option>
                                        </select>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={loading}>
                                        {loading ? 'Updating...' : 'Update User'}
                                    </Button>
                                </form>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* Reset Password Dialog */}
                    <Dialog open={!!resettingPasswordUser} onClose={() => setResettingPasswordUser(null)}>
                        <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Reset Password</DialogTitle>
                            </DialogHeader>
                            <div className="mt-2">
                                <p className="text-sm text-gray-400 mb-4">
                                    Set a new password for <span className="text-white font-medium">{resettingPasswordUser?.full_name}</span>.
                                </p>
                            </div>
                            <form action={handleResetPassword} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">New Password</label>
                                    <input name="password" type="password" required minLength={6} className="block w-full rounded-md bg-white/5 border-white/10 px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                </div>
                                <Button type="submit" className="w-full bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20" disabled={loading}>
                                    {loading ? 'Resetting...' : 'Reset Password'}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={!!deletingUser} onClose={() => setDeletingUser(null)}>
                        <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-[425px]">
                            <DialogHeader>
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mb-4">
                                    <AlertTriangle className="h-6 w-6 text-red-500" aria-hidden="true" />
                                </div>
                                <DialogTitle className="text-center">Delete User</DialogTitle>
                                <DialogDescription className="text-center text-gray-400">
                                    Are you sure you want to delete <span className="text-white font-medium">{deletingUser?.full_name}</span>?
                                    <br />
                                    This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex gap-3 mt-6">
                                <Button
                                    variant="outline"
                                    className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white"
                                    onClick={() => setDeletingUser(null)}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={handleDeleteUser}
                                    disabled={loading}
                                >
                                    {loading ? 'Deleting...' : 'Delete User'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                </div>
            </div>
        </ToastProvider>
    )
}
