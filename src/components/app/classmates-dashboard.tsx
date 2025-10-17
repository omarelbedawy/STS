
"use client";

import type { UserProfile, Explanation, ExplanationContributor } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookUser, CalendarDays, Clock, Trash2, Check, X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFirestore } from "@/firebase";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";
import Link from "next/link";


function getInitials(name: string) {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
}


function ContributorList({ contributors }: { contributors: ExplanationContributor[] }) {
    const acceptedContributors = (contributors || []).filter(c => c.status === 'accepted');

    if (acceptedContributors.length === 0) return null;

    return (
        <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Explaining:</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                 {acceptedContributors.map(c => (
                    <div key={c.userId} className="flex items-center gap-1.5">
                        <Link href={`/profile/${c.userId}`} className="flex items-center gap-1.5 hover:underline">
                            <Avatar className="h-5 w-5 border-2 border-background">
                                <AvatarFallback className="text-[10px]">{getInitials(c.userName)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">{c.userName}</span>
                        </Link>
                    </div>
                 ))}
            </div>
        </div>
    )
}

function ExplanationCard({ 
    explanation, 
    currentUser, 
    classroomId 
}: { 
    explanation: Explanation; 
    currentUser: UserProfile | null;
    classroomId: string | null;
}) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const createdAtDate = explanation.createdAt?.toDate();
    const timeAgo = createdAtDate
      ? formatDistanceToNow(createdAtDate, { addSuffix: true })
      : "a while ago";

    const explanationDate = explanation.explanationDate?.toDate();
    const fullDate = explanationDate ? format(explanationDate, 'EEEE, MMMM d') : (explanation.day.charAt(0).toUpperCase() + explanation.day.slice(1));
    
    const isOwner = currentUser?.uid === explanation.ownerId;
    const isTeacher = currentUser?.role === 'teacher';
    const isAdmin = currentUser?.role === 'admin';
    const isReviewed = explanation.completionStatus === 'explained' || explanation.completionStatus === 'not-explained';
    
    const canDelete = (isAdmin || isOwner);

    const loText = explanation.learningOutcome ? ` - LO ${explanation.learningOutcome}` : '';

    const handleCompletionStatus = async (status: 'explained' | 'not-explained') => {
        if (!firestore || !classroomId || !isTeacher) return;
        const explanationRef = doc(firestore, 'classrooms', classroomId, 'explanations', explanation.id);
        try {
            await updateDoc(explanationRef, { completionStatus: status });
            toast({
                title: 'Status Updated',
                description: `Marked as ${status === 'explained' ? 'Explained' : 'Not Explained'}.`
            });
        } catch (error) {
            console.error('Error updating completion status:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update status.'});
        }
    };


    const handleDelete = async () => {
        if (!firestore || !classroomId || !explanation.id) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not connect to the database to cancel commitment."
            });
            return;
        }

        const explanationRef = doc(firestore, "classrooms", classroomId, "explanations", explanation.id);
        try {
            await deleteDoc(explanationRef);
            toast({
                title: "Commitment Deleted",
                description: "The commitment to explain this topic has been removed.",
            });
        } catch (error) {
            console.error("Error deleting explanation: ", error);
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: "There was a problem deleting this commitment. Please try again.",
            });
        }
    }


    return (
        <Card className={cn("bg-card/50 relative group", {
            "border-destructive shadow-lg": explanation.completionStatus === 'not-explained'
        })}>
             <div className="absolute top-2 right-2 flex items-center gap-2">
                {explanation.status === 'Upcoming' 
                    ? <Badge variant="outline">Upcoming</Badge>
                    : <Badge variant="secondary">Finished</Badge>
                }
                
                {canDelete && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="size-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete this commitment to explain this topic. This cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Keep Commitment</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                Yes, Cancel It
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>

            <CardHeader className="p-4 pr-16">
                <CardTitle className="text-base flex items-center gap-2">
                    <BookUser className="size-5 text-primary" />
                    {explanation.subject}{loText}
                </CardTitle>
                <div className="space-y-1">
                    <CardDescription className="flex items-center gap-2 text-xs">
                        <CalendarDays className="size-4" />
                        Session {explanation.session} on {fullDate || <Skeleton className="h-3 w-24 inline-block" />}
                    </CardDescription>
                     <CardDescription className="flex items-center gap-2 text-xs">
                        <Clock className="size-4" />
                        Committed {timeAgo}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex flex-wrap gap-2">
                    {explanation.concepts.map(concept => (
                        <Badge key={concept} variant="secondary">{concept}</Badge>
                    ))}
                </div>
                <ContributorList contributors={explanation.contributors} />
                {isTeacher && explanation.status === 'Finished' && !isReviewed && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t mt-3">
                        <span className="text-xs text-muted-foreground">Mark as explained?</span>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleCompletionStatus('explained')}>
                            <Check className="size-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleCompletionStatus('not-explained')}>
                            <X className="size-4 text-red-600" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export function ClassmatesDashboard({ classmates, explanations, currentUser, classroomId, onDeleteAllExplanations }: { 
    classmates: UserProfile[] | null;
    explanations: Explanation[] | null;
    currentUser: UserProfile | null;
    classroomId: string | null;
    onDeleteAllExplanations?: () => Promise<void>;
}) {
    const isAdmin = currentUser?.role === 'admin';

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Users className="size-6 text-primary"/>
                        <div>
                            <CardTitle>Classmates & Commitments</CardTitle>
                            <CardDescription>
                                Students in your class and their commitments to explain topics.
                            </CardDescription>
                        </div>
                    </div>
                     {isAdmin && onDeleteAllExplanations && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="destructive" size="sm"><Trash2 className="mr-2"/>Delete All Commitments</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete All Commitments?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete all {explanations?.length || 0} student commitments for this classroom.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={onDeleteAllExplanations} className="bg-destructive hover:bg-destructive/90">
                                        Yes, Delete Everything
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {!classmates ? (
                     Array.from({ length: 3 }).map((_, i) => (
                        <div key={`skeleton-classmate-${i}`} className="flex items-start gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="w-full space-y-2">
                                <Skeleton className="h-4 w-1/4" />
                                <Skeleton className="h-3 w-1/3" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        </div>
                    ))
                ) : classmates.length === 0 ? (
                     <div className="h-24 text-center flex items-center justify-center">
                        This class has no students yet.
                    </div>
                ) : (
                    classmates.map(student => {
                        const studentExplanations = (explanations || [])
                            .filter(exp => (exp.contributors || []).some(c => c.userId === student.uid && c.status === 'accepted'))
                            .sort((a, b) => {
                                const dateA = a.createdAt?.toDate()?.getTime() || 0;
                                const dateB = b.createdAt?.toDate()?.getTime() || 0;
                                return dateB - dateA;
                            });

                        return (
                            <div key={student.uid} className="flex items-start gap-4">
                                <Link href={`/profile/${student.uid}`} className="block">
                                    <Avatar>
                                        <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                                    </Avatar>
                                </Link>
                                <div className="w-full space-y-3">
                                    <div>
                                        <Link href={`/profile/${student.uid}`} className="hover:underline">
                                            <p className="font-medium">{student.name} {student.uid === currentUser?.uid && "(You)"}</p>
                                        </Link>
                                        <p className="text-sm text-muted-foreground">{student.email}</p>
                                    </div>
                                    {studentExplanations.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {studentExplanations.map(exp => (
                                                <ExplanationCard 
                                                    key={exp.id} 
                                                    explanation={exp} 
                                                    currentUser={currentUser} 
                                                    classroomId={classroomId}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </CardContent>
        </Card>
    );
}
