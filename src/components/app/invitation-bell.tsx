
'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
import type { Invitation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { User } from 'firebase/auth';
import Link from 'next/link';

export function InvitationBell({ currentUser }: { currentUser: User }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const invitationsQuery = useMemoFirebase(() => {
        if (!firestore || !currentUser) return null;
        return collection(firestore, 'users', currentUser.uid, 'invitations');
    }, [firestore, currentUser.uid]);

    const { data: invitations, loading } = useCollection<Invitation>(invitationsQuery);
    
    const handleInvitation = async (invitation: Invitation, accepted: boolean) => {
        if (!firestore) return;

        const batch = writeBatch(firestore);

        // 1. Update the explanation document
        const explanationRef = doc(firestore, 'classrooms', invitation.classroomId, 'explanations', invitation.explanationId);
        // To update an array item, we'd ideally use arrayUnion/arrayRemove, but since we need to change status,
        // it's more complex. For this MVP, we'll fetch, update, and set. This has race condition potential
        // but is acceptable for this use case. A Cloud Function would be more robust.
        // For now, let's assume we can update it directly if we know the full contributor object.
        // A better way is to store contributors as a map, but we'll work with the current structure.
        // The most direct (but not ideal) way is to update a specific field if the structure was different.
        // Given the current array structure, we cannot atomically update an element.
        // We will do this in the `subject-cell.tsx` when we can read the explanation.
        // Here, we can only optimistically update. Let's just focus on the invitation itself for now.
        // For a more robust solution, we will do a transaction in a cloud function.
        // For client-side, a simple update is what we can do.

        // Let's find the contributor in the explanation and update their status
         const { getDoc, runTransaction } = await import('firebase/firestore');
         try {
            await runTransaction(firestore, async (transaction) => {
                const explanationDoc = await transaction.get(explanationRef);
                if (!explanationDoc.exists()) {
                    throw "Explanation does not exist!";
                }
                const explanationData = explanationDoc.data();
                const contributorIndex = explanationData.contributors.findIndex((c: any) => c.userId === currentUser.uid);

                if (contributorIndex > -1) {
                    explanationData.contributors[contributorIndex].status = accepted ? 'accepted' : 'declined';
                    transaction.update(explanationRef, { contributors: explanationData.contributors });
                }
            });
         } catch(e) {
            console.error("Transaction failed: ", e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update the explanation.' });
            return;
         }


        // 2. Delete the invitation
        const invitationRef = doc(firestore, 'users', currentUser.uid, 'invitations', invitation.id);
        batch.delete(invitationRef);

        try {
            await batch.commit();
            toast({
                title: `Invitation ${accepted ? 'Accepted' : 'Declined'}`,
                description: `You have ${accepted ? 'joined' : 'declined'} the explanation for ${invitation.subject}.`,
            });
        } catch (error) {
            console.error('Error handling invitation:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not process your response.' });
        }
    };


    const unreadCount = invitations?.length || 0;

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
                    <h4 className="font-medium leading-none px-2 pt-1">Invitations</h4>
                    <ScrollArea className="h-auto max-h-80">
                        {loading && <p className="p-4 text-center text-sm text-muted-foreground">Loading...</p>}
                        {!loading && (!invitations || invitations.length === 0) && (
                            <p className="p-4 text-center text-sm text-muted-foreground">No new invitations.</p>
                        )}
                        {invitations && invitations.map((invite) => (
                            <div key={invite.id} className="p-2 hover:bg-accent rounded-md">
                                <p className="text-sm">
                                    <Link href={`/profile/${invite.fromUser.uid}`} className="font-semibold hover:underline">{invite.fromUser.name}</Link>
                                    {' '} has invited you to co-explain{' '}
                                    <span className="font-semibold">{invite.subject}</span>.
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(invite.createdAt.toDate(), { addSuffix: true })}
                                </p>
                                <div className="flex justify-end gap-2 mt-2">
                                    <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => handleInvitation(invite, true)}>
                                        <Check className="size-4 text-green-600" /> Accept
                                    </Button>
                                     <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => handleInvitation(invite, false)}>
                                        <X className="size-4 text-red-600" /> Decline
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
