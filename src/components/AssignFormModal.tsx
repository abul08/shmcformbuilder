'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { assignForm } from '@/actions/superAdmin'
import { createClient } from '@/lib/supabase/client'

interface AssignFormModalProps {
    isOpen: boolean
    onClose: () => void
    formId: string
    formTitle: string
}

interface Profile {
    id: string
    username: string
    full_name: string
}

export default function AssignFormModal({ isOpen, onClose, formId, formTitle }: AssignFormModalProps) {
    const [users, setUsers] = useState<Profile[]>([])
    const [selectedUserId, setSelectedUserId] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingUsers, setIsFetchingUsers] = useState(false)
    const { addToast } = useToast()
    const supabase = createClient()

    useEffect(() => {
        if (isOpen) {
            fetchUsers()
        }
    }, [isOpen])

    const fetchUsers = async () => {
        setIsFetchingUsers(true)
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, full_name')
            .order('username')

        if (!error && data) {
            setUsers(data)
        }
        setIsFetchingUsers(false)
    }

    const handleAssign = async () => {
        if (!selectedUserId) return

        setIsLoading(true)
        try {
            const result = await assignForm(formId, selectedUserId)
            if (result.error) {
                addToast(result.error, 'error')
            } else {
                addToast('Form assigned successfully', 'success')
                onClose()
            }
        } catch (error) {
            addToast('Failed to assign form', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-gray-900 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Assign Form</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Transfer ownership of "{formTitle}" to another user.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="user">Select User</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-white/10 text-white">
                                {isFetchingUsers ? (
                                    <div className="p-2 text-center text-sm text-gray-400">Loading users...</div>
                                ) : (
                                    users.map((user) => (
                                        <SelectItem key={user.id} value={user.id} className="focus:bg-white/10 focus:text-white">
                                            {user.full_name || user.username} ({user.username})
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="border-white/10 hover:bg-white/10 hover:text-white bg-transparent text-white">
                        Cancel
                    </Button>
                    <Button onClick={handleAssign} disabled={!selectedUserId || isLoading} className="bg-primary hover:bg-primary/90 text-white">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Assign Form
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
