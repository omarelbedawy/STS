
"use client";

import { useMemo, useState, useEffect } from "react";
import type { UserProfile, Explanation, ClassroomSchedule } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { ScheduleTable } from "./schedule-table";
import { useFirestore, useCollection, useDoc } from "@/firebase";
import { doc, collection, query, where, deleteDoc, getDocs, writeBatch } from "firebase/firestore";
import { ClassmatesDashboard } from "./classmates-dashboard";
import { Loader2, Trash2 } from "lucide-react";
import { schoolList } from "@/lib/schools";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { deleteUserAction } from "@/app/admin/actions";
import { Skeleton } from "@/components/ui/skeleton";

interface Classroom {
    activeScheduleId?: string;
}


function UserManagement({ adminUser }: { adminUser: UserProfile }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // Query all users except the current admin
  const usersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: allUsers, loading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filter, setFilter] = useState("");
  
  useEffect(() => {
      if (allUsers) {
          // Filter out the current admin user from the list displayed
          setUsers(allUsers.filter(u => u.uid !== adminUser.uid));
      }
  }, [allUsers, adminUser.uid]);


  const handleDeleteUser = async (userId: string) => {
    if (!firestore) return;
    
    const originalUsers = users;
    // Optimistically update UI
    setUsers(currentUsers => currentUsers.filter(u => u.uid !== userId));
    
    toast({ title: "Deleting User...", description: "Removing user profile and authentication entry."});

    const result = await deleteUserAction({ userId });

    if (result.success) {
      toast({ title: "User Deleted", description: "The user has been successfully removed from the system."});
    } else {
      // Revert UI on failure
      setUsers(originalUsers);
      console.error("Error deleting user: ", result.message);
      toast({ variant: "destructive", title: "Deletion Failed", description: result.message || "Could not delete user."});
    }
  }

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => (
        u.name.toLowerCase().includes(filter.toLowerCase()) ||
        u.email.toLowerCase().includes(filter.toLowerCase()) ||
        u.role.toLowerCase().includes(filter.toLowerCase())
    ));
  }, [users, filter]);

  const renderUserContent = () => {
    if (usersLoading) {
        return (
             <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-16" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-12" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-12" /></TableHead>
                                <TableHead className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        )
    }

    return (
         <>
            <Input 
                placeholder="Filter by name, email, or role..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />
            <div className="border rounded-md">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredUsers.map(user => (
                        <TableRow key={user.uid}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell><Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>{user.role}</Badge></TableCell>
                            <TableCell>{schoolList.find(s => s.id === user.school)?.name || user.school}</TableCell>
                            <TableCell>{user.grade || 'N/A'}</TableCell>
                            <TableCell>{user.class?.toUpperCase() || 'N/A'}</TableCell>
                            <TableCell className="text-right">
                               <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="size-4"/></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Delete {user.name}?</AlertDialogTitle><AlertDialogDescription>This action is irreversible and will permanently delete the user's profile and their authentication account.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteUser(user.uid)} className="bg-destructive hover:bg-destructive/90">Delete User</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
        </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>View, edit, and delete users from the system.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderUserContent()}
      </CardContent>
    </Card>
  );
}

export function AdminDashboard({ admin }: { admin: UserProfile }) {
  const [selectedSchool, setSelectedSchool] = useState<string>(schoolList[0].id);
  const [selectedGrade, setSelectedGrade] = useState<string>("11");
  const [selectedClass, setSelectedClass] = useState<string>("c");
  const [view, setView] = useState<'users' | 'classrooms'>('classrooms');

  const firestore = useFirestore();
  const { toast } = useToast();

  const classroomId = useMemo(() => {
    if (!selectedSchool || !selectedGrade || !selectedClass) return null;
    return `${selectedSchool}-${selectedGrade}-${selectedClass}`;
  }, [selectedSchool, selectedGrade, selectedClass]);

  const classroomDocRef = useMemo(() => {
    if (!firestore || !classroomId) return null;
    return doc(firestore, 'classrooms', classroomId);
  }, [firestore, classroomId]);
  const { data: classroom, loading: classroomLoading } = useDoc<Classroom>(classroomDocRef);

  const activeScheduleDocRef = useMemo(() => {
    if (!firestore || !classroomId || !classroom?.activeScheduleId) return null;
    return doc(firestore, 'classrooms', classroomId, 'schedules', classroom.activeScheduleId);
  }, [firestore, classroomId, classroom?.activeScheduleId]);
  const { data: activeSchedule, loading: activeScheduleLoading } = useDoc<ClassroomSchedule>(activeScheduleDocRef);


  const classmatesQuery = useMemo(() => {
    if (!firestore || !selectedSchool || !selectedGrade || !selectedClass) return null;
    return query(
      collection(firestore, "users"),
      where("school", "==", selectedSchool),
      where("grade", "==", selectedGrade),
      where("class", "==", selectedClass)
    );
  }, [firestore, selectedSchool, selectedGrade, selectedClass]);
  const { data: classmates, loading: classmatesLoading } = useCollection<UserProfile>(classmatesQuery);

  const explanationsQuery = useMemo(() => {
    if (!firestore || !classroomId) return null;
    return collection(firestore, 'classrooms', classroomId, 'explanations');
  }, [firestore, classroomId]);
  const { data: explanations, loading: explanationsLoading } = useCollection<Explanation>(explanationsQuery);

  const isLoading = classroomLoading || activeScheduleLoading || classmatesLoading || explanationsLoading;
  const schoolName = schoolList.find(s => s.id === selectedSchool)?.name || selectedSchool;
  
  const handleDeleteSchedule = async () => {
    if (!firestore || !classroomId || !classroom?.activeScheduleId) return;
    try {
      // This might need more complex logic depending on how you want to handle history.
      // For now, let's assume we delete the specific schedule document. A safer approach
      // might be to just deactivate it.
      await deleteDoc(doc(firestore, 'classrooms', classroomId, 'schedules', classroom.activeScheduleId));

      // Then, we need to clear the activeScheduleId from the classroom document.
      await deleteDoc(doc(firestore, 'classrooms', classroomId));

      toast({ title: "Schedule Deleted", description: "The active schedule for this class has been removed."});
    } catch (error) {
      console.error("Error deleting schedule: ", error);
      toast({ variant: "destructive", title: "Deletion Failed", description: "Could not delete schedule."});
    }
  };

  const handleDeleteAllExplanations = async () => {
    if (!firestore || !classroomId) return;
     try {
        const explanationsRef = collection(firestore, "classrooms", classroomId, "explanations");
        const q = query(explanationsRef);
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            toast({ title: "Nothing to Delete", description: "This classroom has no commitments." });
            return;
        }

        const batch = writeBatch(firestore);
        querySnapshot.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        toast({ title: "All Commitments Deleted", description: "All student commitments for this classroom have been cleared." });
    } catch (error) {
        console.error("Error deleting all explanations: ", error);
        toast({ variant: "destructive", title: "Deletion Failed", description: "Could not clear commitments."});
    }
  }

  const renderClassroomContent = () => {
    if (isLoading) {
        return (
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Skeleton className="h-40 w-full" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
         <>
            <Card>
                <CardHeader>
                  <div className="flex flex-wrap justify-between items-center gap-4">
                      <div>
                        <CardTitle>Schedule for Class {selectedGrade}{selectedClass.toUpperCase()} at {schoolName}</CardTitle>
                        <CardDescription>Viewing as an administrator.</CardDescription>
                      </div>
                      {activeSchedule?.schedule && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm"><Trash2 className="mr-2"/>Delete Active Schedule</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete Schedule?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the schedule for this classroom.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSchedule} className="bg-destructive hover:bg-destructive/90">Delete Schedule</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                      )}
                  </div>
                </CardHeader>
                <CardContent>
                    {(activeSchedule?.schedule && activeSchedule.schedule.length > 0) ? (
                        <ScheduleTable
                            scheduleData={activeSchedule.schedule}
                            isEditing={false} // Admins probably shouldn't edit schedules directly
                            user={admin}
                            classroomId={classroomId}
                            explanations={explanations || []}
                            classmates={classmates}
                        />
                    ) : (
                        <div className="text-center text-muted-foreground py-10">The schedule for this class has not been uploaded yet.</div>
                    )}
                </CardContent>
            </Card>

            {classroomId && (
                <ClassmatesDashboard 
                    classmates={classmates} 
                    explanations={explanations} 
                    currentUser={admin}
                    classroomId={classroomId}
                    onDeleteAllExplanations={handleDeleteAllExplanations}
                />
            )}
        </>
    )
  }

  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Admin Dashboard</CardTitle>
                        <CardDescription>Oversee all schools, classes, and users.</CardDescription>
                    </div>
                     <div className="flex gap-2">
                        <Button variant={view === 'classrooms' ? 'default' : 'outline'} onClick={() => setView('classrooms')}>Classrooms</Button>
                        <Button variant={view === 'users' ? 'default' : 'outline'} onClick={() => setView('users')}>Users</Button>
                    </div>
                </div>
            </CardHeader>
            {view === 'classrooms' && (
                 <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                        <SelectTrigger><SelectValue placeholder="Select School" /></SelectTrigger>
                        <SelectContent>{schoolList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                        <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">Grade 10</SelectItem>
                            <SelectItem value="11">Grade 11</SelectItem>
                            <SelectItem value="12">Grade 12</SelectItem>
                        </SelectContent>
                        </Select>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                        <SelectContent>{['a','b','c','d','e','f'].map(c => <SelectItem key={c} value={c}>Class {c.toUpperCase()}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </CardContent>
            )}
        </Card>

      {view === 'classrooms' && renderClassroomContent()}
      {view === 'users' && <UserManagement adminUser={admin} />}
    </div>
  );
}

    
