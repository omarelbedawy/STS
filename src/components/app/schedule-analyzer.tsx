
"use client";

import type { AnalyzeScheduleFromImageOutput } from "@/ai/flows/analyze-schedule-from-image";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  Pencil,
  Save,
  UploadCloud,
  X,
  History,
} from "lucide-react";

import { analyzeScheduleAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ScheduleTable } from "./schedule-table";
import { useUser } from "@/firebase/auth/use-user";
import { useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, setDoc, serverTimestamp, collection, query, where, writeBatch, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import type { UserProfile, Explanation, ClassroomSchedule } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors";
import { schoolList } from "@/lib/schools";
import { ClassmatesDashboard } from "./classmates-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { ScheduleHistory } from "./schedule-history";

type AnalysisState = "idle" | "previewing" | "loading" | "displaying" | "initializing";
type ScheduleRow = AnalyzeScheduleFromImageOutput["schedule"][number];

interface Classroom {
    activeScheduleId?: string;
}

// Helper to get the end time of a session
const getSessionEndTime = (
  session: string,
  schedule: ScheduleRow[]
): { hours: number; minutes: number } | null => {
  const sessionRow = schedule.find((r) => r.session === session);
  if (!sessionRow || !sessionRow.time) return null;
  // Handles time formats like "7:45–9:05" or "13:45–15:00"
  const timeParts = sessionRow.time.split("–");
  if (timeParts.length < 2) return null;

  const endTimeStr = timeParts[1].trim();
  const [hours, minutes] = endTimeStr.split(":").map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) return null;

  return { hours, minutes };
};


export function ScheduleAnalyzer() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const [state, setState] = useState<AnalysisState>("initializing");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editableSchedule, setEditableSchedule] = useState<ScheduleRow[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  const userProfileQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: userProfile, loading: userProfileLoading } = useDoc<UserProfile>(userProfileQuery);

  const classroomId = useMemo(() => {
    if (!userProfile) return null;
    return `${userProfile.school}-${userProfile.grade}-${userProfile.class}`;
  }, [userProfile?.school, userProfile?.grade, userProfile?.class]);
  
  const classroomDocRef = useMemoFirebase(() => {
    if (!firestore || !classroomId) return null;
    return doc(firestore, 'classrooms', classroomId);
  }, [firestore, classroomId]);
  const { data: classroom, loading: classroomLoading } = useDoc<Classroom>(classroomDocRef);

  const activeScheduleDocRef = useMemoFirebase(() => {
    if (!firestore || !classroomId || !classroom?.activeScheduleId) return null;
    return doc(firestore, 'classrooms', classroomId, 'schedules', classroom.activeScheduleId);
  }, [firestore, classroomId, classroom?.activeScheduleId]);
  const { data: activeSchedule, loading: activeScheduleLoading } = useDoc<ClassroomSchedule>(activeScheduleDocRef);

  const scheduleHistoryQuery = useMemoFirebase(() => {
    if (!firestore || !classroomId) return null;
    return collection(firestore, 'classrooms', classroomId, 'schedules');
  }, [firestore, classroomId]);
  const { data: scheduleHistory, loading: scheduleHistoryLoading } = useCollection<ClassroomSchedule>(scheduleHistoryQuery);


  const classmatesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(
      collection(firestore, "users"),
      where("school", "==", userProfile.school),
      where("grade", "==", userProfile.grade),
      where("class", "==", userProfile.class)
    );
  }, [firestore, userProfile?.school, userProfile?.grade, userProfile?.class]);
  const { data: classmates, loading: classmatesLoading } = useCollection<UserProfile>(classmatesQuery);

  const explanationsQuery = useMemoFirebase(() => {
    if (!firestore || !classroomId) return null;
    return collection(firestore, 'classrooms', classroomId, 'explanations');
  }, [firestore, classroomId]);
  const { data: explanations, loading: explanationsLoading } = useCollection<Explanation>(explanationsQuery);

  const isLoading = userLoading || userProfileLoading || classroomLoading || activeScheduleLoading || classmatesLoading || explanationsLoading || scheduleHistoryLoading;

  useEffect(() => {
    if (isLoading) {
      setState("initializing");
      return;
    }
    
    // This effect should not interfere if the user is in the process of uploading.
    if (state === 'initializing' || state === 'displaying') {
        if (activeSchedule?.schedule && activeSchedule.schedule.length > 0) {
            setEditableSchedule(JSON.parse(JSON.stringify(activeSchedule.schedule)));
            setState("displaying");
        } else {
            setState("idle");
        }
    }
  }, [isLoading, activeSchedule, user?.uid, state]);
  
  // Effect to automatically update explanation status
  useEffect(() => {
    if (!firestore || !explanations || !activeSchedule?.schedule || !classroomId) return;

    const checkAndUpdateStatuses = async () => {
      const now = new Date();
      const upcomingExplanations = explanations.filter(e => e.status === 'Upcoming');

      if (upcomingExplanations.length === 0) return;

      const batch = writeBatch(firestore);
      let updatesMade = 0;

      for (const exp of upcomingExplanations) {
        const sessionEndTime = getSessionEndTime(exp.session, activeSchedule.schedule);
        if (!sessionEndTime || !exp.explanationDate) continue;

        const explanationEndDateTime = new Date(exp.explanationDate.toDate());
        explanationEndDateTime.setHours(sessionEndTime.hours, sessionEndTime.minutes, 0, 0);

        if (now > explanationEndDateTime) {
          const expRef = doc(firestore, 'classrooms', classroomId, 'explanations', exp.id);
          batch.update(expRef, { status: 'Finished' });
          updatesMade++;
        }
      }

      if (updatesMade > 0) {
        try {
          await batch.commit();
        } catch (error) {
          console.error("Error auto-updating explanation statuses:", error);
        }
      }
    };
    
    // Run once on load and then every minute
    checkAndUpdateStatuses();
    const intervalId = setInterval(checkAndUpdateStatuses, 60000); 

    return () => clearInterval(intervalId);

  }, [explanations, activeSchedule, firestore, classroomId]);


  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      setState("previewing");
    } else {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (e.g., PNG, JPG, GIF).",
        variant: "destructive",
      });
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] ?? null);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files?.[0] ?? null);
  };

  const onReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    // After reset, if a schedule exists, go to 'displaying', else 'idle'.
    if (activeSchedule?.schedule && activeSchedule.schedule.length > 0) {
      setEditableSchedule(JSON.parse(JSON.stringify(activeSchedule.schedule)));
      setState("displaying");
    } else {
      setState("idle");
    }
    setIsEditing(false);
  };
  

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  const onSubmit = async () => {
    if (!file || !classroomId || !userProfile?.name || !firestore) return;
    setState("loading");
    try {
      const base64Image = await toBase64(file);
      const analysisResult = await analyzeScheduleAction({ scheduleImage: base64Image });

      if (analysisResult.schedule && analysisResult.schedule.length > 0) {
        
        const newScheduleData: Omit<ClassroomSchedule, 'id'> = {
          schedule: analysisResult.schedule,
          uploadedBy: userProfile.name,
          uploadedAt: serverTimestamp(),
        };

        const scheduleHistoryCollection = collection(firestore, 'classrooms', classroomId, 'schedules');
        const newScheduleDocRef = await addDoc(scheduleHistoryCollection, newScheduleData);

        const classroomDoc = doc(firestore, 'classrooms', classroomId);
        await setDoc(classroomDoc, { activeScheduleId: newScheduleDocRef.id }, { merge: true });

        // Optimistically update UI
        setEditableSchedule(JSON.parse(JSON.stringify(analysisResult.schedule)));
        setState("displaying");
        toast({
          title: "Schedule Updated",
          description: `A new schedule version was uploaded by ${userProfile.name}.`,
        });
      } else {
         throw new Error(analysisResult.errors || "The AI failed to return a valid response.");
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      toast({
        title: "Analysis Error",
        description: errorMessage,
        variant: "destructive",
      });
      // Go back to previewing state on error, instead of idle.
      setState("previewing");
    }
  };
  
  const handleScheduleChange = (rowIndex: number, day: string, newSubject: string) => {
    setEditableSchedule(currentSchedule => {
      const newSchedule = JSON.parse(JSON.stringify(currentSchedule));
      const row = newSchedule[rowIndex];
      (row as any)[day] = newSubject;
      newSchedule[rowIndex] = row;
      return newSchedule;
    });
  };

  const onSaveEdits = async () => {
    if (!firestore || !classroomId || !userProfile?.name || !activeSchedule?.id) return;
    
    const updatedScheduleData = {
      schedule: editableSchedule,
      uploadedBy: userProfile.name,
      uploadedAt: serverTimestamp(),
    };

    const scheduleDocRef = doc(firestore, 'classrooms', classroomId, 'schedules', activeSchedule.id);
    
    updateDoc(scheduleDocRef, updatedScheduleData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: scheduleDocRef.path,
          operation: 'update',
          requestResourceData: updatedScheduleData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });

    setIsEditing(false);
    toast({
      title: "Schedule Saved",
      description: "Your changes have been saved for this schedule version.",
    });
  };

  const onCopy = () => {
    if (!editableSchedule) return;
    // A simple text representation for copying
    const textToCopy = editableSchedule
      .map(row => `${row.session.padEnd(10)} | ${row.time.padEnd(12)} | ${row.sunday} | ${row.monday} | ${row.tuesday} | ${row.wednesday} | ${row.thursday}`)
      .join('\n');
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getSchoolName = () => {
    if (!userProfile) return "your class";
    const school = schoolList.find(s => s.id === userProfile.school);
    return `class ${userProfile.grade}${userProfile.class.toUpperCase()} at ${school?.name || 'your school'}`;
  }

  const handleNewUpload = () => {
    setState("idle");
    setFile(null);
    setPreviewUrl(null);
    setEditableSchedule([]);
    setIsEditing(false);
    setShowHistory(false);
  };
  
  const handleRestoreVersion = async (scheduleId: string) => {
      if (!firestore || !classroomId) return;

      const classroomDoc = doc(firestore, 'classrooms', classroomId);
      await updateDoc(classroomDoc, { activeScheduleId: scheduleId });
      toast({
          title: "Schedule Restored",
          description: "An older version of the schedule is now active."
      })
      setShowHistory(false);
  }

  const handleDeleteVersion = async (scheduleId: string) => {
    if (!firestore || !classroomId || !scheduleHistory) return;

    try {
      // Prevent deleting the last remaining schedule
      if (scheduleHistory.length <= 1) {
        toast({
          variant: "destructive",
          title: "Cannot Delete",
          description: "You cannot delete the only remaining schedule version.",
        });
        return;
      }
      
      const scheduleToDeleteRef = doc(firestore, 'classrooms', classroomId, 'schedules', scheduleId);
      await deleteDoc(scheduleToDeleteRef);

      toast({
        title: "Version Deleted",
        description: "The schedule version has been permanently removed.",
      });

      // If the deleted version was the active one, set the most recent one as active
      if (classroom?.activeScheduleId === scheduleId) {
        const remainingSchedules = scheduleHistory.filter(s => s.id !== scheduleId);
        const sortedRemaining = [...remainingSchedules].sort((a, b) => {
            const dateA = a.uploadedAt?.toDate()?.getTime() || 0;
            const dateB = b.uploadedAt?.toDate()?.getTime() || 0;
            return dateB - dateA;
        });

        if (sortedRemaining.length > 0) {
            const newActiveId = sortedRemaining[0].id;
            const classroomDocRef = doc(firestore, 'classrooms', classroomId);
            await updateDoc(classroomDocRef, { activeScheduleId: newActiveId });
        }
      }

    } catch (error) {
      console.error("Error deleting schedule version:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the schedule version. Please try again.",
      });
    }
  };


  if (state === 'initializing' || isLoading) {
    return <LoadingState isAnalyzing={false} />;
  }

  if (state === "loading") {
    return <LoadingState isAnalyzing={true} />;
  }
  
  if (state === "idle" || state === "previewing") {
    return (
      <div className="flex gap-8 items-start">
        <div className="flex-1">
          <UploadCard
            isDragging={isDragging}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            fileInputRef={fileInputRef}
            onFileChange={onFileChange}
            state={state}
            previewUrl={previewUrl}
            onReset={onReset}
            onSubmit={onSubmit}
            schoolName={getSchoolName()}
            hasExistingSchedule={!!activeSchedule}
            onToggleHistory={() => setShowHistory(p => !p)}
            isHistoryVisible={showHistory}
          />
        </div>
         {showHistory && scheduleHistory && classroomId && (
          <ScheduleHistory 
            history={scheduleHistory}
            activeScheduleId={classroom?.activeScheduleId}
            onRestore={handleRestoreVersion}
            onDelete={handleDeleteVersion}
            classroomId={classroomId}
          />
        )}
      </div>
    );
  }


  if (state === "displaying") {
    const currentSchedule = editableSchedule.length > 0 ? editableSchedule : activeSchedule?.schedule || [];
    return (
      <div className="flex gap-8 items-start">
        <div className="flex-1 space-y-8">
            <ResultState
                user={userProfile}
                classroomId={classroomId}
                activeSchedule={activeSchedule}
                editableSchedule={currentSchedule}
                classmates={classmates}
                explanations={explanations}
                onCopy={onCopy}
                isCopied={isCopied}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                onScheduleChange={handleScheduleChange}
                onSaveEdits={onSaveEdits}
                schoolName={getSchoolName()}
                onNewUpload={handleNewUpload}
                onToggleHistory={() => setShowHistory(p => !p)}
                isHistoryVisible={showHistory}
            />
        </div>
        {showHistory && scheduleHistory && classroomId && (
          <ScheduleHistory 
            history={scheduleHistory}
            activeScheduleId={classroom?.activeScheduleId}
            onRestore={handleRestoreVersion}
            onDelete={handleDeleteVersion}
            classroomId={classroomId}
          />
        )}
      </div>
    );
  }

  return null;
}

function LoadingState({ isAnalyzing }: { isAnalyzing: boolean }) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(
    isAnalyzing ? "Analyzing your schedule..." : "Loading schedule..."
  );

  useEffect(() => {
    if (!isAnalyzing) {
      setMessage("Loading workspace...");
      setProgress(0); // Show a generic loader, maybe?
      return;
    };

    const messages = [
      "Extracting text from image...",
      "Identifying subjects and times...",
      "Checking for ambiguities...",
      "Formatting the schedule...",
      "Almost there...",
    ];

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        const next = prev + 5;
        const messageIndex = Math.floor(next / (100 / messages.length));
        setMessage(messages[messageIndex] || "Finalizing...");
        return next;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isAnalyzing ? "Analyzing..." : "Loading Workspace..."}</CardTitle>
        <CardDescription>
          {isAnalyzing
            ? "Please wait while the AI processes your schedule image."
            : "Please wait while we fetch the latest data for your class."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
        <Loader2 className="size-12 animate-spin text-primary" />
        <p className="text-muted-foreground">{message}</p>
        {isAnalyzing && <Progress value={progress} className="w-full max-w-sm" />}
      </CardContent>
    </Card>
  );
}

function ResultState({ user, classroomId, activeSchedule, editableSchedule, classmates, explanations, onCopy, isCopied, isEditing, setIsEditing, onScheduleChange, onSaveEdits, schoolName, onNewUpload, onToggleHistory, isHistoryVisible }: {
  user: UserProfile | null;
  classroomId: string | null;
  activeSchedule: ClassroomSchedule | null | undefined;
  editableSchedule: AnalyzeScheduleFromImageOutput['schedule'];
  classmates: UserProfile[] | null;
  explanations: Explanation[] | null;
  onCopy: () => void;
  isCopied: boolean;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  onScheduleChange: (rowIndex: number, day: string, newSubject: string) => void;
  onSaveEdits: () => void;
  schoolName: string;
  onNewUpload: () => void;
  onToggleHistory: () => void;
  isHistoryVisible: boolean;
}) {
  const lastUpdated = activeSchedule?.uploadedAt
    ? activeSchedule.uploadedAt.toDate().toLocaleString()
    : null;

  return (
    <div className="space-y-8">
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Schedule for {schoolName}</CardTitle>
            <CardDescription>
              {isEditing ? 'Click on a cell to edit the subject.' : `Last updated by ${activeSchedule?.uploadedBy || 'N/A'}${lastUpdated ? ` on ${lastUpdated}`: ''}`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onNewUpload} variant="outline">
              Upload New Schedule
            </Button>
            <Button onClick={isEditing ? onSaveEdits : () => setIsEditing(true)} variant="outline" className="w-28">
              {isEditing ? <Save /> : <Pencil />}
              {isEditing ? "Save" : "Edit"}
            </Button>
            <Button onClick={onCopy} variant="secondary" className="w-28" disabled={isEditing}>
              {isCopied ? (
                <Check className="text-green-500" />
              ) : (
                <Copy />
              )}
              {isCopied ? "Copied!" : "Copy Text"}
            </Button>
            <Button onClick={onToggleHistory} variant={isHistoryVisible ? "default" : "outline"} size="icon" title="Toggle History">
                <History />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {(editableSchedule && editableSchedule.length > 0) ? (
          <ScheduleTable
            scheduleData={editableSchedule}
            isEditing={isEditing}
            onScheduleChange={onScheduleChange}
            user={user}
            classroomId={classroomId}
            explanations={explanations || []}
            classmates={classmates}
          />
        ) : (
          <div className="rounded-md border bg-muted p-4">
            <p className="text-center text-muted-foreground">The AI could not extract a schedule from the image.</p>
          </div>
        )}
      </CardContent>
      
    </Card>
    <ClassmatesDashboard 
        classmates={classmates} 
        explanations={explanations} 
        currentUser={user}
        classroomId={classroomId}
    />
    </div>
  );
}

function UploadCard({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  fileInputRef,
  onFileChange,
  state,
  previewUrl,
  onReset,
  onSubmit,
  schoolName,
  hasExistingSchedule,
  onToggleHistory,
  isHistoryVisible
}: {
  isDragging: boolean;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  state: AnalysisState;
  previewUrl: string | null;
  onReset: () => void;
  onSubmit: () => void;
  schoolName: string;
  hasExistingSchedule: boolean;
  onToggleHistory: () => void;
  isHistoryVisible: boolean;
}) {
  return (
    <Card
      className={cn(
        "border-2 border-dashed transition-colors w-full",
        isDragging && "border-primary bg-primary/10"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{hasExistingSchedule ? "Upload a New Schedule" : "No Schedule Found"}</CardTitle>
              <CardDescription>{hasExistingSchedule ? `Upload a new image to replace the current schedule for ${schoolName}.` : `The schedule for ${schoolName} has not been uploaded yet. Be the first!`}</CardDescription>
            </div>
            {hasExistingSchedule && (
                <Button onClick={onToggleHistory} variant={isHistoryVisible ? "default" : "outline"} size="sm">
                    <History className="mr-2"/> View History
                </Button>
            )}
          </div>
      </CardHeader>
      <CardContent className="p-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          className="hidden"
          accept="image/*"
        />
        {state === "idle" && (
          <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
            <div className="rounded-full border border-dashed bg-secondary p-4">
              <UploadCloud className="size-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Drag & drop your schedule image here, or
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Browse Files
            </Button>
          </div>
        )}
        {state === "previewing" && previewUrl && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-full max-w-md rounded-lg border p-2 shadow-sm">
              <Image
                src={previewUrl}
                alt="Schedule preview"
                width={600}
                height={400}
                className="max-h-80 w-full rounded-md object-contain"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 h-8 w-8 rounded-full bg-background/70 hover:bg-background"
                onClick={onReset}
              >
                <X className="size-4" />
              </Button>
            </div>
            <Button
              onClick={onSubmit}
              className="w-full max-w-md bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Analyze Schedule
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
