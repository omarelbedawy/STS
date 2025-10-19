
'use client';

import type { AnalyzeScheduleFromImageOutput } from '@/ai/flows/analyze-schedule-from-image';
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  Upload,
  ArrowLeft,
  Users,
  Briefcase,
  ChevronDown,
  Globe,
  History,
  Home,
  Edit,
  Save
} from 'lucide-react';

import { analyzeScheduleAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ScheduleTable } from './schedule-table';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, writeBatch, updateDoc, addDoc, deleteDoc, getDocs } from 'firebase/firestore';
import type { UserProfile, Explanation, ClassroomSchedule } from '@/lib/types';
import { schoolList } from '@/lib/schools';
import { ClassmatesDashboard } from './classmates-dashboard';
import { ScheduleHistory } from './schedule-history';
import { differenceInDays, formatDistanceToNowStrict } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BellRing, UploadCloud, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';


type AnalysisState = 'idle' | 'previewing' | 'analyzing' | 'loading' | 'displaying' | 'uploading';
type ScheduleRow = AnalyzeScheduleFromImageOutput['schedule'][number];

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
  const timeParts = sessionRow.time.split('–');
  if (timeParts.length < 2) return null;

  const endTimeStr = timeParts[1].trim();
  const [hours, minutes] = endTimeStr.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) return null;

  return { hours, minutes };
};


export function ScheduleAnalyzer() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userProfileQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: userProfile, loading: userProfileLoading } = useDoc<UserProfile>(userProfileQuery);
  
  // State for browsing other schedules
  const [viewedSchool, setViewedSchool] = useState<string | undefined>(undefined);
  const [viewedGrade, setViewedGrade] = useState<string | undefined>(undefined);
  const [viewedClass, setViewedClass] = useState<string | undefined>(undefined);
  
  // Component state
  const [state, setState] = useState<AnalysisState>('loading');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Set initial view to user's own class once profile loads
  useEffect(() => {
    if (userProfile && !viewedSchool) {
      setViewedSchool(userProfile.school);
      setViewedGrade(userProfile.grade);
      setViewedClass(userProfile.class);
    }
  }, [userProfile, viewedSchool]);

  const isViewingOwnClass = useMemo(() => {
      if (!userProfile) return false;
      return userProfile.school === viewedSchool &&
             userProfile.grade === viewedGrade &&
             userProfile.class === viewedClass;
  }, [userProfile, viewedSchool, viewedGrade, viewedClass]);
  
  const classroomId = useMemo(() => {
    if (!viewedSchool || !viewedGrade || !viewedClass) return null;
    return `${viewedSchool}-${viewedGrade}-${viewedClass}`;
  }, [viewedSchool, viewedGrade, viewedClass]);
  
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
    if (!firestore || !viewedSchool || !viewedGrade || !viewedClass) return null;
    return query(
      collection(firestore, 'users'),
      where('school', '==', viewedSchool),
      where('grade', '==', viewedGrade),
      where('class', '==', viewedClass),
      where('role', '==', 'student')
    );
  }, [firestore, viewedSchool, viewedGrade, viewedClass]);
  const { data: classmates, loading: classmatesLoading } = useCollection<UserProfile>(classmatesQuery);
  
  // Firestore limitation: We can't query for an object in an array without knowing the full object.
  // The query above is a placeholder. We'll fetch all teachers for the school and filter client-side.
  const allTeachersInSchoolQuery = useMemoFirebase(() => {
     if (!firestore || !viewedSchool) return null;
     return query(
        collection(firestore, 'users'),
        where('school', '==', viewedSchool),
        where('role', '==', 'teacher')
     );
  }, [firestore, viewedSchool]);
  const { data: allTeachers, loading: teachersLoading } = useCollection<UserProfile>(allTeachersInSchoolQuery);
  const teachersForClass = useMemo(() => {
      if (!allTeachers || !viewedGrade || !viewedClass) return [];
      return allTeachers.filter(teacher => 
        teacher.teacherProfile?.classes.some(c => c.grade === viewedGrade && c.class === viewedClass)
      );
  }, [allTeachers, viewedGrade, viewedClass]);


  const explanationsQuery = useMemoFirebase(() => {
    if (!firestore || !classroomId) return null;
    return collection(firestore, 'classrooms', classroomId, 'explanations');
  }, [firestore, classroomId]);
  const { data: explanations, loading: explanationsLoading } = useCollection<Explanation>(explanationsQuery);

  const isLoading = userLoading || userProfileLoading || classroomLoading || activeScheduleLoading || classmatesLoading || teachersLoading || explanationsLoading || scheduleHistoryLoading;

  useEffect(() => {
    if (isLoading && state !== 'analyzing') {
      setState('loading');
      return;
    }
  
    if (state === 'loading') {
      if (activeSchedule?.schedule && activeSchedule.schedule.length > 0) {
        setState('displaying');
      } else {
        setState('idle');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isLoading, activeSchedule]);

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
          console.error('Error auto-updating explanation statuses:', error);
        }
      }
    };
    
    checkAndUpdateStatuses();
    const intervalId = setInterval(checkAndUpdateStatuses, 60000); 

    return () => clearInterval(intervalId);

  }, [explanations, activeSchedule, firestore, classroomId]);


  const handleFileSelect = (selectedFile: File | null) => {
    if (!isViewingOwnClass) return; // <-- Add this check
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      setState('previewing');
    } else {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an image file (e.g., PNG, JPG, GIF).',
        variant: 'destructive',
      });
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => { handleFileSelect(e.target.files?.[0] ?? null) };
  const onDragOver = (e: DragEvent<HTMLDivElement>) => { if (isViewingOwnClass) { e.preventDefault(); setIsDragging(true)} };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false) };
  const onDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files?.[0] ?? null) };

  const onEnterUploadMode = () => {
    setState('uploading');
    setFile(null);
    setPreviewUrl(null);
  };

  const onCancelUpload = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (activeSchedule) setState('displaying');
    else setState('idle');
  };
  
  const onSubmit = async () => {
    if (!file || !classroomId || !userProfile?.name || !firestore) return;
    setState('analyzing');
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
        
        toast({
          title: 'Schedule Uploaded & Set Active',
          description: `The new schedule is now active for ${getSchoolName(viewedSchool, viewedGrade, viewedClass)}.`,
        });
        setState('loading'); // Go to loading state to reload with the new schedule
      } else {
         throw new Error(analysisResult.errors || 'The AI failed to return a valid response.');
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      toast({
        title: 'Analysis Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setState('previewing');
    }
  };

  const handleSetActiveVersion = async (scheduleId: string) => {
      if (!firestore || !classroomId) return;
      const classroomDocRef = doc(firestore, 'classrooms', classroomId);
      try {
        await updateDoc(classroomDocRef, { activeScheduleId: scheduleId });
        toast({ title: 'Schedule Set Active', description: 'This schedule is now visible to the class.' });
        setState('loading'); // Re-initialize to load the new active schedule
      } catch (error) {
        if ((error as any).code === 'not-found') {
            await setDoc(classroomDocRef, { activeScheduleId: scheduleId });
            toast({ title: 'Schedule Set Active', description: 'This schedule is now visible to the class.' });
            setState('loading');
        } else {
          console.error('Error setting active schedule:', error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not set active schedule.'});
        }
      }
  }

  const handleDeleteVersion = async (scheduleId: string) => {
    if (!firestore || !classroomId || !scheduleHistory) return;

    try {
      const scheduleToDeleteRef = doc(firestore, 'classrooms', classroomId, 'schedules', scheduleId);
      
      const isDeletingActive = classroom?.activeScheduleId === scheduleId;
      
      // If the deleted version was the active one, find a new one to set active
      if (isDeletingActive) {
        const remainingSchedules = scheduleHistory.filter(s => s.id !== scheduleId);
        const sortedRemaining = [...remainingSchedules].sort((a, b) => (b.uploadedAt?.toDate()?.getTime() || 0) - (a.uploadedAt?.toDate()?.getTime() || 0));
        const newActiveId = sortedRemaining.length > 0 ? sortedRemaining[0].id : '';
        const classroomDocRef = doc(firestore, 'classrooms', classroomId);
        
        const batch = writeBatch(firestore);
        batch.delete(scheduleToDeleteRef);
        batch.update(classroomDocRef, { activeScheduleId: newActiveId });
        await batch.commit();

      } else {
        await deleteDoc(scheduleToDeleteRef);
      }

      toast({ title: 'Version Deleted', description: 'The schedule version has been permanently removed.' });
      setState('loading'); // reload
    } catch (error) {
      console.error('Error deleting schedule version:', error);
      toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete the schedule version.' });
    }
  };

  const backToMyClass = () => {
    if (userProfile) {
      setViewedSchool(userProfile.school);
      setViewedGrade(userProfile.grade);
      setViewedClass(userProfile.class);
    }
  }

  const getSchoolName = (schoolId?: string, grade?: string, classLetter?: string) => {
    if (!schoolId || !grade || !classLetter) return 'a class';
    const school = schoolList.find(s => s.id === schoolId);
    return `class ${grade}${classLetter.toUpperCase()} at ${school?.name || 'a school'}`;
  }

  if (state === 'loading' || state === 'analyzing') {
    return <LoadingState isAnalyzing={state === 'analyzing'} />;
  }

  const renderMainContent = () => {
    if (state === 'displaying' && activeSchedule) {
       return (
        <div className="flex-1 space-y-8">
            <ResultState
                user={userProfile}
                isViewingOwnClass={isViewingOwnClass}
                classroomId={classroomId}
                activeSchedule={activeSchedule}
                classmates={classmates}
                teachers={teachersForClass}
                explanations={explanations}
                schoolName={getSchoolName(viewedSchool, viewedGrade, viewedClass)}
                onNewUpload={onEnterUploadMode}
                scheduleHistory={scheduleHistory || []}
                activeScheduleId={classroom?.activeScheduleId}
                onSetActiveVersion={handleSetActiveVersion}
                onDeleteVersion={handleDeleteVersion}
                viewedSchool={viewedSchool}
                viewedGrade={viewedGrade}
                viewedClass={viewedClass}
                setViewedSchool={setViewedSchool}
                setViewedGrade={setViewedGrade}
                setViewedClass={setViewedClass}
                onBackToMyClass={backToMyClass}
            />
        </div>
       )
    }
    
     return (
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
          onCancelUpload={onCancelUpload}
          onSubmit={onSubmit}
          schoolName={getSchoolName(viewedSchool, viewedGrade, viewedClass)}
          hasActiveSchedule={!!activeSchedule}
          isViewingOwnClass={isViewingOwnClass}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
        <ReminderAlert explanations={explanations || []} currentUser={userProfile} />
        {renderMainContent()}
    </div>
  );
}

function ReminderAlert({ explanations, currentUser }: { explanations: Explanation[], currentUser: UserProfile | null }) {
  const upcomingUserExplanations = useMemo(() => {
    if (!currentUser) return [];
    const now = new Date();
    return explanations.filter(exp => {
      const isContributor = (exp.contributors || []).some(c => c.userId === currentUser.uid && c.status === 'accepted');
      if (exp.status !== 'Upcoming' || !isContributor) return false;

      const diff = differenceInDays(exp.explanationDate.toDate(), now);
      return diff >= 0 && diff <= 2; // Is today, tomorrow, or the day after
    }).sort((a,b) => a.explanationDate.toDate().getTime() - b.explanationDate.toDate().getTime());
  }, [explanations, currentUser]);

  if (upcomingUserExplanations.length === 0) return null;

  return (
    <Alert>
        <BellRing className="h-4 w-4" />
        <AlertTitle>Upcoming Explanations!</AlertTitle>
        <AlertDescription>
            You have {upcomingUserExplanations.length} commitment(s) coming up soon.
            <ul className="mt-2 list-disc list-inside">
                {upcomingUserExplanations.map(exp => (
                    <li key={exp.id}>
                        <strong>{exp.subject}</strong>: {formatDistanceToNowStrict(exp.explanationDate.toDate(), { addSuffix: true })}
                    </li>
                ))}
            </ul>
        </AlertDescription>
    </Alert>
  )
}

function LoadingState({ isAnalyzing }: { isAnalyzing: boolean }) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(
    isAnalyzing ? 'Analyzing your schedule...' : 'Loading workspace...'
  );

  useEffect(() => {
    if (!isAnalyzing) {
      setMessage('Loading workspace...');
      setProgress(0);
      return;
    };

    const messages = [
      'Extracting text from image...',
      'Identifying subjects and times...',
      'Checking for ambiguities...',
      'Formatting the schedule...',
      'Almost there...',
    ];

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        const next = prev + 5;
        const messageIndex = Math.floor(next / (100 / messages.length));
        setMessage(messages[messageIndex] || 'Finalizing...');
        return next;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>{isAnalyzing ? 'Analyzing Schedule' : 'Loading Workspace'}</CardTitle>
        <CardDescription>
          {isAnalyzing
            ? 'Please wait while the AI processes your schedule image.'
            : 'Please wait while we fetch the latest data for your class.'}
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

function ResultState({ 
  user, isViewingOwnClass, classroomId, activeSchedule, classmates, teachers, explanations, schoolName, onNewUpload,
  scheduleHistory, activeScheduleId, onSetActiveVersion, onDeleteVersion,
  viewedSchool, viewedGrade, viewedClass, setViewedSchool, setViewedGrade, setViewedClass, onBackToMyClass
}: {
  user: UserProfile | null;
  isViewingOwnClass: boolean;
  classroomId: string | null;
  activeSchedule: ClassroomSchedule | null | undefined;
  classmates: UserProfile[] | null;
  teachers: UserProfile[] | null;
  explanations: Explanation[] | null;
  schoolName: string;
  onNewUpload: () => void;
  scheduleHistory: ClassroomSchedule[];
  activeScheduleId?: string;
  onSetActiveVersion: (id: string) => void;
  onDeleteVersion: (id: string) => void;
  viewedSchool?: string;
  viewedGrade?: string;
  viewedClass?: string;
  setViewedSchool: (value: string) => void;
  setViewedGrade: (value: string) => void;
  setViewedClass: (value: string) => void;
  onBackToMyClass: () => void;
}) {
  const lastUpdated = activeSchedule?.uploadedAt ? activeSchedule.uploadedAt.toDate().toLocaleString() : null;
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSchedule, setEditedSchedule] = useState<ScheduleRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeSchedule?.schedule) {
      setEditedSchedule(JSON.parse(JSON.stringify(activeSchedule.schedule)));
    }
  }, [activeSchedule]);

  const handleScheduleChange = (rowIndex: number, day: string, newSubject: string) => {
    setEditedSchedule(currentSchedule => {
      const newSchedule = [...currentSchedule];
      const newRow = { ...newSchedule[rowIndex], [day]: newSubject };
      newSchedule[rowIndex] = newRow;
      return newSchedule;
    });
  };

  const handleSaveChanges = async () => {
    if (!firestore || !classroomId || !user?.name) return;
    setIsSaving(true);
    try {
      const newScheduleData: Omit<ClassroomSchedule, 'id'> = {
        schedule: editedSchedule,
        uploadedBy: `${user.name} (manual edit)`,
        uploadedAt: serverTimestamp(),
      };
      const scheduleHistoryCollection = collection(firestore, 'classrooms', classroomId, 'schedules');
      const newScheduleDocRef = await addDoc(scheduleHistoryCollection, newScheduleData);

      const classroomDoc = doc(firestore, 'classrooms', classroomId);
      await updateDoc(classroomDoc, { activeScheduleId: newScheduleDocRef.id });

      toast({
        title: 'Schedule Updated',
        description: 'Your changes have been saved and the schedule is now active.',
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save your changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (activeSchedule?.schedule) {
      setEditedSchedule(JSON.parse(JSON.stringify(activeSchedule.schedule)));
    }
    setIsEditing(false);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Schedule for {schoolName}</CardTitle>
              <CardDescription>
                {`Last updated by ${activeSchedule?.uploadedBy || 'N/A'}${lastUpdated ? ` on ${lastUpdated}`: ''}`}
                {!isViewingOwnClass && <span className="font-bold text-accent"> (Read-only)</span>}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isViewingOwnClass && (
                <Button onClick={onBackToMyClass} variant="outline">
                  <Home className="mr-2" />
                  Back to My Class
                </Button>
              )}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" title="Browse Schedules">
                    <Globe className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Browse Schedules</SheetTitle>
                    <SheetDescription>You can view schedules for other classes and schools in read-only mode.</SheetDescription>
                  </SheetHeader>
                  <div className="grid gap-4 py-4">
                      <Select value={viewedSchool} onValueChange={setViewedSchool}>
                          <SelectTrigger><SelectValue placeholder="Select School" /></SelectTrigger>
                          <SelectContent>{schoolList.map(s => <SelectItem key={s.id} value={s.id}>{s.name} {user?.school === s.id && <span className="text-muted-foreground ml-2">(You)</span>}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={viewedGrade} onValueChange={setViewedGrade}>
                          <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="10">Grade 10 {user?.grade === "10" && <span className="text-muted-foreground ml-2">(You)</span>}</SelectItem>
                              <SelectItem value="11">Grade 11 {user?.grade === "11" && <span className="text-muted-foreground ml-2">(You)</span>}</SelectItem>
                              <SelectItem value="12">Grade 12 {user?.grade === "12" && <span className="text-muted-foreground ml-2">(You)</span>}</SelectItem>
                          </SelectContent>
                      </Select>
                      <Select value={viewedClass} onValueChange={setViewedClass}>
                          <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                          <SelectContent>{['a','b','c','d','e','f'].map(c => <SelectItem key={c} value={c}>Class {c.toUpperCase()} {user?.class === c && <span className="text-muted-foreground ml-2">(You)</span>}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                </SheetContent>
              </Sheet>

              {isViewingOwnClass && (
                 <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" title="Schedule History">
                      <History className="size-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="sm:max-w-md">
                     <SheetHeader>
                      <SheetTitle>Schedule History</SheetTitle>
                      <SheetDescription>Previous versions of the schedule. You can set an older version as active.</SheetDescription>
                    </SheetHeader>
                    <ScheduleHistory 
                        history={scheduleHistory}
                        activeScheduleId={activeScheduleId}
                        onSetActive={onSetActiveVersion}
                        onDelete={onDeleteVersion}
                    />
                  </SheetContent>
                </Sheet>
              )}
              {isViewingOwnClass && !isEditing && (
                 <Button onClick={() => setIsEditing(true)} variant="outline">
                  <Edit className="mr-2" />
                  Edit Schedule
                </Button>
              )}
              {isViewingOwnClass && isEditing && (
                 <div className="flex gap-2">
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                      {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                      Save Changes
                    </Button>
                    <Button onClick={handleCancelEdit} variant="ghost" disabled={isSaving}>Cancel</Button>
                 </div>
              )}
              {isViewingOwnClass && (
                <Button onClick={onNewUpload} variant="outline">
                  <Upload className="mr-2" />
                  Upload New Version
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(activeSchedule?.schedule && activeSchedule.schedule.length > 0) ? (
            <ScheduleTable
              scheduleData={isEditing ? editedSchedule : activeSchedule.schedule}
              isEditing={isEditing}
              onScheduleChange={handleScheduleChange}
              user={user}
              isViewingOwnClass={isViewingOwnClass}
              classroomId={classroomId}
              explanations={explanations || []}
              classmates={classmates}
            />
          ) : (
            <div className="text-center text-muted-foreground py-10">The schedule for this class has not been uploaded yet.</div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="classmates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="classmates"><Users className="mr-2"/>Classmates</TabsTrigger>
          <TabsTrigger value="teachers"><Briefcase className="mr-2"/>Teachers</TabsTrigger>
        </TabsList>
        <TabsContent value="classmates">
          <ClassmatesDashboard 
              classmates={classmates} 
              explanations={explanations} 
              currentUser={user}
              classroomId={classroomId}
          />
        </TabsContent>
        <TabsContent value="teachers">
          <TeachersList teachers={teachers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UploadCard({ isDragging, onDragOver, onDragLeave, onDrop, fileInputRef, onFileChange, state, previewUrl, onCancelUpload, onSubmit, schoolName, hasActiveSchedule, isViewingOwnClass }: {
  isDragging: boolean;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  state: AnalysisState;
  previewUrl: string | null;
  onCancelUpload: () => void;
  onSubmit: () => void;
  schoolName: string;
  hasActiveSchedule: boolean;
  isViewingOwnClass: boolean;
}) {
  const effectiveState = state === 'uploading' || state === 'idle' || state === 'previewing' ? state : 'idle';
  const isDisabled = !isViewingOwnClass;

  return (
    <Card
      className={cn(
        'border-2 border-dashed transition-colors w-full',
        isDragging && !isDisabled && 'border-primary bg-primary/10',
        isDisabled && 'border-muted bg-muted/20 cursor-not-allowed'
      )}
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
    >
      <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Upload New Schedule</CardTitle>
              <CardDescription>Upload an image to create a new active schedule for {schoolName}.</CardDescription>
            </div>
            {hasActiveSchedule && (
                 <Button onClick={onCancelUpload} variant="outline">
                    <ArrowLeft className="mr-2" />
                    Back to Schedule
                </Button>
            )}
          </div>
      </CardHeader>
      <CardContent className="p-6">
        <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/*" disabled={isDisabled} />
        {effectiveState !== 'previewing' && (
          <div className={cn("flex flex-col items-center justify-center space-y-4 py-16 text-center", !isDisabled && "cursor-pointer")} onClick={() => !isDisabled && fileInputRef.current?.click()} role={!isDisabled ? "button" : undefined}>
            <div className={cn("rounded-full border border-dashed p-4", isDisabled ? 'bg-muted' : 'bg-secondary')}>
              <UploadCloud className={cn("size-10", isDisabled ? 'text-muted-foreground/50' : 'text-muted-foreground')} />
            </div>
            <p className={cn("text-muted-foreground", isDisabled && 'text-muted-foreground/50')}>
              {isDisabled ? "You can only upload schedules for your own class." : "Drag & drop your schedule image here, or click to browse"}
            </p>
          </div>
        )}
        {effectiveState === 'previewing' && previewUrl && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-full max-w-md rounded-lg border p-2 shadow-sm">
              <Image src={previewUrl} alt="Schedule preview" width={600} height={400} className="max-h-80 w-full rounded-md object-contain" />
              <Button variant="ghost" size="icon" className="absolute right-3 top-3 h-8 w-8 rounded-full bg-background/70 hover:bg-background" onClick={onCancelUpload}>
                <X className="size-4" />
              </Button>
            </div>
            <Button onClick={onSubmit} className="w-full max-w-md bg-accent text-accent-foreground hover:bg-accent/90">
              Analyze and Set Active
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TeachersList({ teachers }: { teachers: UserProfile[] | null }) {
    if (!teachers) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                    <p>Loading teachers...</p>
                </CardContent>
            </Card>
        )
    }

    if (teachers.length === 0) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                    <p>No teachers found for this class.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Teachers for this Class</CardTitle>
                <CardDescription>A list of teachers associated with this class and the subjects they teach.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {teachers.map(teacher => (
                    <div key={teacher.uid} className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <p className="font-semibold">{teacher.name}</p>
                            <p className="text-sm text-muted-foreground">{teacher.email}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {teacher.teacherProfile?.classes.map((c, i) => (
                                <Badge key={i} variant="secondary">{c.subject}</Badge>
                            ))}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

// Helper to convert file to base64
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

    

    

    