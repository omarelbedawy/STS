
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ClassroomSchedule } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { History, CheckCircle, Upload, RotateCw, Trash2 } from "lucide-react";
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

export function ScheduleHistory({
    history,
    activeScheduleId,
    onSetActive,
    onDelete,
    classroomId,
}: {
    history: ClassroomSchedule[];
    activeScheduleId?: string;
    onSetActive: (scheduleId: string) => void;
    onDelete: (scheduleId: string) => void;
    classroomId: string;
}) {

    const sortedHistory = [...history].sort((a, b) => {
        const dateA = a.uploadedAt?.toDate()?.getTime() || 0;
        const dateB = b.uploadedAt?.toDate()?.getTime() || 0;
        return dateB - dateA;
    });

    return (
        <Card className="w-full max-w-sm sticky top-24">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <History className="size-6 text-primary" />
                    <div>
                        <CardTitle>Schedule History</CardTitle>
                        <CardDescription>Previous versions of the schedule.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96 pr-4">
                    <div className="space-y-4">
                        {sortedHistory.map((item) => {
                            const is_active = item.id === activeScheduleId;
                            const uploadedAtDate = item.uploadedAt?.toDate();
                            const timeAgo = uploadedAtDate ? formatDistanceToNow(uploadedAtDate, { addSuffix: true }) : "a while ago";

                            return (
                                <div key={item.id} className={cn("rounded-lg border p-3 transition-all", is_active ? "bg-primary/10 border-primary" : "bg-card")}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium flex items-center gap-2">
                                                <Upload className="size-4" />
                                                Uploaded by {item.uploadedBy}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {is_active ? (
                                                <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
                                                    <CheckCircle className="size-4" /> Active
                                                </div>
                                            ) : (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-7">
                                                            <RotateCw className="mr-2 size-3"/> Set Active
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Set this version as active?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will make the schedule uploaded by {item.uploadedBy} on {uploadedAtDate?.toLocaleDateString()} the active schedule for the class.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => onSetActive(item.id)}>
                                                                Yes, Set Active
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete this version?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action is permanent and cannot be undone. Are you sure you want to delete this schedule version?
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => onDelete(item.id)} className="bg-destructive hover:bg-destructive/90">
                                                            Yes, Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                         {sortedHistory.length === 0 && (
                            <div className="text-center text-muted-foreground py-10">
                                No version history found.
                            </div>
                         )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
