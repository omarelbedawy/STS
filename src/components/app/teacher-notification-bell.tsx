
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { TeacherNotification } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { User } from 'firebase/auth';

export function TeacherNotificationBell({ currentUser }: { currentUser: User }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const notificationsQuery = useMemoFirebase(() => {
        if (!firestore || !currentUser) return null;
        return collection(firestore, 'users', currentUser.uid, 'notifications');
    }, [firestore, currentUser.uid]);

    const { data: notifications, loading } = useCollection<TeacherNotification>(notificationsQuery);
    
    const handleDismiss = async (notificationId: string) => {
        if (!firestore) return;
        const notifRef = doc(firestore, 'users', currentUser.uid, 'notifications', notificationId);
        try {
            await deleteDoc(notifRef);
            toast({
                title: 'Notification Dismissed',
            });
        } catch (error) {
            console.error('Error dismissing notification:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not dismiss notification.' });
        }
    };

    const unreadCount = notifications?.length || 0;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2">
                <div className="grid gap-2">
                    <h4 className="font-medium leading-none px-2 pt-1">Notifications</h4>
                    <ScrollArea className="h-auto max-h-80">
                        {loading && <p className="p-4 text-center text-sm text-muted-foreground">Loading...</p>}
                        {!loading && (!notifications || notifications.length === 0) && (
                            <p className="p-4 text-center text-sm text-muted-foreground">No new notifications.</p>
                        )}
                        {notifications && notifications.map((notif) => (
                            <div key={notif.id} className="p-2 hover:bg-accent rounded-md">
                                <p className="text-sm">
                                    <span className="font-semibold">{notif.studentName}</span>
                                    {' '} has committed to explain {' '}
                                    <span className="font-semibold">{notif.subject}</span>.
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })}
                                </p>
                                <div className="flex justify-end gap-2 mt-2">
                                     <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => handleDismiss(notif.id)}>
                                        <Check className="size-4" /> Dismiss
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </ScrollArea>
                </div>
            </PopoverContent>
        </Popover>
    );
}
