
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, Split, Loader2, X, CalendarIcon, Check } from "lucide-react";
import React, { useState, KeyboardEvent, useMemo } from 'react';
import type { UserProfile, Explanation, ExplanationContributor } from "@/lib/types";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { useFirestore } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, writeBatch, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";


const subjectList = [
  "Arabic", "EN", "Bio", "CH", "PH", "MATH", "MEC", "CITZ", "ACTV", "ADV", "CAP", "REL", "F", "G", "PE", "CS", "Geo", "SOCIAL", "—", "Leave School"
];

const explainableSubjects = ["MATH", "PH", "MEC", "Geo", "CH", "Bio", "Arabic", "EN", "F", "G", "CS"];
const languageSubjects = ["Arabic", "EN", "F", "G", "CS"];


const SubjectDropdown = ({
  children,
  subject,
  onSubjectSelect,
  onSplit,
  onUnsplit,
}: {
  children: React.ReactNode;
  subject: string;
  onSubjectSelect: (subject: string, part?: 'first' | 'second') => void;
  onSplit: () => void;
  onUnsplit: () => void;
}) => {
  const isSplit = subject.includes("/");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        {isSplit ? (
          <>
            <DropdownMenuItem onSelect={onUnsplit}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Unsplit Session
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <ScrollArea className="h-48">
              <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">First Half</p>
              {subjectList.map((s) => (
                <DropdownMenuItem key={`part1-${s}`} onSelect={() => onSubjectSelect(s, 'first')}>
                  {s}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Second Half</p>
              {subjectList.map((s) => (
                <DropdownMenuItem key={`part2-${s}`} onSelect={() => onSubjectSelect(s, 'second')}>
                  {s}
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          </>
        ) : (
          <>
            <DropdownMenuItem onSelect={onSplit}>
              <Split className="mr-2 h-4 w-4" />
              Split Session
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <ScrollArea className="h-64">
              {subjectList.map((s) => (
                <DropdownMenuItem key={s} onSelect={() => onSubjectSelect(s)}>
                  {s}
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ExplainDialog = ({ user, classroomId, day, session, subject, children, onOpenChange, classmates }: {
  user: UserProfile;
  classroomId: string;
  day: string;
  session: string;
  subject: string;
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  classmates: UserProfile[] | null;
}) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [learningOutcome, setLearningOutcome] = useState('');
  const [concepts, setConcepts] = useState<string[]>([]);
  const [currentConcept, setCurrentConcept] = useState('');
  const [invited, setInvited] = useState<UserProfile[]>([]);
  const [inviteSearch, setInviteSearch] = useState("");
  const [explanationDate, setExplanationDate] = useState<Date | undefined>();
  const [openInvitePopover, setOpenInvitePopover] = useState(false);

  const isLanguage = languageSubjects.includes(subject);

  const availableClassmates = useMemo(() => {
    if (!classmates) return [];
    return classmates.filter(
      cm => cm.uid !== user.uid && !invited.some(i => i.uid === cm.uid) &&
      (cm.name.toLowerCase().includes(inviteSearch.toLowerCase()) || 
       cm.email.toLowerCase().includes(inviteSearch.toLowerCase()))
    );
  }, [classmates, user.uid, invited, inviteSearch]);

  const handleConceptKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentConcept.trim()) {
      e.preventDefault();
      if (!concepts.includes(currentConcept.trim())) {
        setConcepts(prev => [...prev, currentConcept.trim()]);
      }
      setCurrentConcept('');
    }
  };

  const removeConcept = (conceptToRemove: string) => {
    setConcepts(prev => prev.filter(c => c !== conceptToRemove));
  };
  
  const inviteClassmate = (classmate: UserProfile) => {
    setInvited(prev => [...prev, classmate]);
    setInviteSearch("");
    setOpenInvitePopover(false);
  };

  const removeInvitation = (classmateToRemove: UserProfile) => {
    setInvited(prev => prev.filter(c => c.uid !== classmateToRemove.uid));
  };
  
  const dayNameToIndex = (day: string) => {
    const map: { [key: string]: number } = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    return map[day.toLowerCase()];
  }

  const handleSubmit = async () => {
    // Automatically add the last typed concept if it exists
    const finalConcepts = [...concepts];
    if (currentConcept.trim() && !finalConcepts.includes(currentConcept.trim())) {
      finalConcepts.push(currentConcept.trim());
      setConcepts(finalConcepts); // update state for UI consistency
      setCurrentConcept('');
    }

    if (!explanationDate) {
      toast({
        variant: "destructive",
        title: "Missing Date",
        description: "Please select a date for your explanation.",
      });
      return;
    }

    if ((!isLanguage && !learningOutcome) || finalConcepts.length === 0) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: isLanguage
          ? "Please add at least one concept."
          : "Please select a learning outcome and add at least one concept.",
      });
      return;
    }

    if (!firestore || !classroomId || !user.school || !user.grade || !user.class) {
       toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Could not connect to the database. Please try again later.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const batch = writeBatch(firestore);

      const contributors: ExplanationContributor[] = [
        { userId: user.uid, userName: user.name, status: 'accepted' },
        ...invited.map(i => ({ userId: i.uid, userName: i.name, status: 'pending' as const }))
      ];
      
      const explanationData: Omit<Explanation, 'id'> = {
        ownerId: user.uid,
        contributors,
        subject,
        day,
        session,
        concepts: finalConcepts,
        explanationDate,
        status: 'Upcoming' as const,
        completionStatus: 'pending' as const,
        createdAt: serverTimestamp(),
        ...( !isLanguage && { learningOutcome: parseInt(learningOutcome, 10) })
      };
      
      const explanationsColRef = collection(firestore, 'classrooms', classroomId, 'explanations');
      const newExplanationRef = doc(explanationsColRef);
      batch.set(newExplanationRef, explanationData);
      
      // Find teachers for this subject and class
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, 
          where('role', '==', 'teacher'),
          where('school', '==', user.school),
          where('teacherProfile.classes', 'array-contains', {
              grade: user.grade,
              class: user.class,
              subject: subject
          })
      );
      
      const teacherDocs = await getDocs(q);
      
      // Create notifications for each relevant teacher
      teacherDocs.forEach(teacherDoc => {
          const notificationRef = doc(collection(firestore, 'users', teacherDoc.id, 'notifications'));
          const notificationData = {
              explanationId: newExplanationRef.id,
              classroomId: classroomId,
              studentName: user.name,
              subject: subject,
              createdAt: serverTimestamp(),
          };
          batch.set(notificationRef, notificationData);
      });


      // Create invitations for invited classmates
      for (const invitedUser of invited) {
        const invitationRef = doc(collection(firestore, 'users', invitedUser.uid, 'invitations'));
        const invitationData = {
          explanationId: newExplanationRef.id,
          classroomId: classroomId,
          fromUser: {
            uid: user.uid,
            name: user.name,
          },
          subject: subject,
          explanationDate: explanationDate,
          createdAt: serverTimestamp(),
        };
        batch.set(invitationRef, invitationData);
      }
      
      await batch.commit();

      toast({
        title: "Success!",
        description: `You've signed up to explain concepts for ${subject}. Your teacher has been notified.`,
      });

      // Reset state and close dialog
      setLearningOutcome('');
      setConcepts([]);
      setCurrentConcept('');
      setInvited([]);
      setExplanationDate(undefined);
      onOpenChange(false);

    } catch (error) {
      console.error("Error submitting explanation:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Could not save your commitment. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>I Will Explain: {subject}</DialogTitle>
          <DialogDescription>
            Volunteer to explain a topic for this session. You can also invite classmates to join you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !explanationDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {explanationDate ? format(explanationDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={explanationDate}
                  onSelect={setExplanationDate}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today || date.getDay() !== dayNameToIndex(day);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          {!isLanguage && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lo-select" className="text-right">
                LO
              </Label>
              <Select onValueChange={setLearningOutcome} value={learningOutcome}>
                <SelectTrigger id="lo-select" className="col-span-3">
                  <SelectValue placeholder="Select an LO" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(lo => (
                    <SelectItem key={lo} value={String(lo)}>
                      Learning Outcome {lo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="concepts-input" className="text-right pt-2">
              Concepts
            </Label>
            <div className="col-span-3">
              <div className="flex flex-wrap gap-2 rounded-md border border-input p-2">
                {concepts.map(concept => (
                  <Badge
                    key={concept}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {concept}
                    <button
                      onClick={() => removeConcept(concept)}
                      className="rounded-full hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  id="concepts-input"
                  placeholder="Type a concept and press Enter"
                  className="h-auto flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  value={currentConcept}
                  onChange={(e) => setCurrentConcept(e.target.value)}
                  onKeyDown={handleConceptKeyDown}
                />
              </div>
            </div>
          </div>

           <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="invite-input" className="text-right pt-2">
              Invite
            </Label>
             <div className="col-span-3">
              <Popover open={openInvitePopover} onOpenChange={setOpenInvitePopover}>
                <PopoverTrigger asChild>
                  <Input
                    id="invite-input"
                    placeholder="Search for a classmate by name..."
                    className="flex-1"
                    value={inviteSearch}
                    onChange={(e) => {
                        setInviteSearch(e.target.value);
                        if (!openInvitePopover) setOpenInvitePopover(true);
                    }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search classmate..." value={inviteSearch} onValueChange={setInviteSearch} />
                    <CommandList>
                        <CommandEmpty>No one found.</CommandEmpty>
                        <CommandGroup>
                            {availableClassmates.map(c => (
                            <CommandItem
                                key={c.uid}
                                onSelect={() => inviteClassmate(c)}
                                className="cursor-pointer"
                            >
                                <Check
                                className={cn(
                                    "mr-2 h-4 w-4",
                                    invited.some(i => i.uid === c.uid) ? "opacity-100" : "opacity-0"
                                )}
                                />
                                {c.name}
                            </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="mt-2 flex flex-wrap gap-2">
                {invited.map(c => (
                  <Badge
                    key={c.uid}
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    {c.name}
                    <button
                      onClick={() => removeInvitation(c)}
                      className="rounded-full hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}




export function SubjectCell({ subject, isEditing, onChange, user, isViewingOwnClass, classroomId, day, session, explanations, classmates }: {
  subject: string;
  isEditing: boolean;
  onChange: (newSubject: string) => void;
  user: UserProfile | null;
  isViewingOwnClass?: boolean;
  classroomId: string | null;
  day: string;
  session: string;
  explanations: Explanation[];
  classmates: UserProfile[] | null;
}) {
  const isSplit = subject.includes("/");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSubjectSelect = (newSubject: string, part?: 'first' | 'second') => {
    if (!part) {
      onChange(newSubject);
      return;
    }
    
    const parts = subject.split('/');
    let firstPart = parts[0].trim();
    let secondPart = parts.length > 1 ? parts[1].trim() : '—';

    if (part === 'first') {
      firstPart = newSubject;
    } else {
      secondPart = newSubject;
    }
    
    if (firstPart === secondPart) {
      onChange(firstPart);
    } else {
      onChange(`${firstPart} / ${secondPart}`);
    }
  };

  const handleSplit = () => {
    onChange(`${subject} / —`);
  };

  const handleUnsplit = () => {
    onChange(subject.split('/')[0].trim());
  };

  const renderCellContent = (sub: string, part: 'first' | 'second') => {
    const isSubjectSplit = sub.includes("/");
    const subjectPart = isSubjectSplit
      ? part === 'first'
        ? sub.split('/')[0].trim()
        : sub.split('/')[1].trim()
      : sub;
      
    const canExplain = explainableSubjects.includes(subjectPart) && isViewingOwnClass;

    // Find upcoming explanations for this specific subject part to show the badge
    const upcomingExplanations = (explanations || []).filter(e => e.subject === subjectPart && e.status === 'Upcoming');
    const acceptedCount = upcomingExplanations.reduce((acc, exp) => acc + (exp.contributors || []).filter(c => c.status === 'accepted').length, 0);


    const cellWrapper = (
      <div
        className={cn(
          "flex-1 flex flex-col items-center justify-center p-1 transition-transform duration-200 ease-in-out group-hover:scale-105",
          "relative", // For positioning the badge
          {
            "hover:!scale-110 hover:shadow-lg hover:z-10": isSubjectSplit && canExplain,
            "p-2": !isSubjectSplit,
            "cursor-pointer": isEditing || (canExplain && user?.role === 'student'),
          }
        )}
      >
        <span
          className={cn(
            !explainableSubjects.includes(subjectPart) && subjectPart !== "—" && subjectPart !== "Leave School"
              ? "text-muted-foreground/50"
              : "font-semibold text-foreground"
          )}
        >
          {subjectPart}
        </span>
        {acceptedCount > 0 && !isEditing && (
           <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute top-1 right-1 flex items-center justify-center h-4 w-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                  {acceptedCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                 <p>{acceptedCount} student(s) will explain this.</p>
              </TooltipContent>
            </Tooltip>
           </TooltipProvider>
        )}
      </div>
    );
    
    if (isEditing) {
      return cellWrapper; // Dropdown is handled by the parent
    }

    if (canExplain && user?.role === 'student' && classroomId) {
      return (
        <ExplainDialog
          user={user}
          classroomId={classroomId}
          day={day}
          session={session}
          subject={subjectPart}
          onOpenChange={setDialogOpen}
          classmates={classmates}
        >
          {cellWrapper}
        </ExplainDialog>
      );
    }
    
    return cellWrapper;
  }
  
  const cellStructure = (
    <div className="flex flex-col min-h-[4rem] bg-card p-0 group">
      {isSplit ? (
        <>
          {renderCellContent(subject, 'first')}
          <div className="h-px bg-border/50 w-full" />
          {renderCellContent(subject, 'second')}
        </>
      ) : (
        renderCellContent(subject, 'first')
      )}
    </div>
  );

  if (isEditing) {
    return (
      <SubjectDropdown
        subject={subject}
        onSubjectSelect={handleSubjectSelect}
        onSplit={handleSplit}
        onUnsplit={handleUnsplit}
      >
        {cellStructure}
      </SubjectDropdown>
    );
  }

  return <div>{cellStructure}</div>;
}
