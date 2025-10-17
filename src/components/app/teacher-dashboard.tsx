
"use client";

import { useMemo, useState } from "react";
import type { UserProfile, Explanation } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScheduleTable } from "./schedule-table";
import { useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import { ClassmatesDashboard } from "./classmates-dashboard";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { schoolList } from "@/lib/schools";

type TeacherClass = NonNullable<UserProfile['teacherProfile']>['classes'][number];

interface ClassroomSchedule {
  schedule: any[];
  lastUpdatedBy?: string;
  updatedAt?: any;
}


export function TeacherDashboard({ teacher }: { teacher: UserProfile }) {
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(
    teacher.teacherProfile?.classes?.[0] || null
  );
  const firestore = useFirestore();

  const handleClassSelect = (teacherClass: TeacherClass) => {
    setSelectedClass(teacherClass);
  };
  
  const classroomId = useMemo(() => {
    if (!selectedClass || !teacher.school) return null;
    return `${teacher.school}-${selectedClass.grade}-${selectedClass.class}`;
  }, [teacher.school, selectedClass]);

  const classroomDocRef = useMemo(() => {
    if (!firestore || !classroomId) return null;
    return doc(firestore, 'classrooms', classroomId);
  }, [firestore, classroomId]);
  const { data: classroomSchedule, loading: classroomLoading } = useDoc<ClassroomSchedule>(classroomDocRef);

  const classmatesQuery = useMemo(() => {
    if (!firestore || !selectedClass || !teacher.school) return null;
    return query(
      collection(firestore, "users"),
      where("school", "==", teacher.school),
      where("grade", "==", selectedClass.grade),
      where("class", "==", selectedClass.class)
    );
  }, [firestore, teacher.school, selectedClass]);
  const { data: classmates, loading: classmatesLoading } = useCollection<UserProfile>(classmatesQuery);

  const explanationsQuery = useMemo(() => {
    if (!firestore || !classroomId) return null;
    return query(
        collection(firestore, 'classrooms', classroomId, 'explanations'),
        where("subject", "==", selectedClass?.subject || '')
    );
  }, [firestore, classroomId, selectedClass]);
  const { data: explanations, loading: explanationsLoading } = useCollection<Explanation>(explanationsQuery);

  const isLoading = classroomLoading || classmatesLoading || explanationsLoading;

  const schoolName = schoolList.find(s => s.id === teacher.school)?.name || teacher.school;

  const filteredSchedule = useMemo(() => {
    if (!classroomSchedule?.schedule || !selectedClass?.subject) return [];
    
    // Create a deep copy to avoid mutating the original data
    const newSchedule = JSON.parse(JSON.stringify(classroomSchedule.schedule));

    return newSchedule.map(row => {
        Object.keys(row).forEach(key => {
            if (['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'].includes(key)) {
                const subjects = String(row[key]).split('/').map(s => s.trim());
                if (!subjects.includes(selectedClass.subject)) {
                    row[key] = '—'; // Replace with a placeholder if the teacher's subject isn't there
                } else {
                    row[key] = selectedClass.subject; // Only show the teacher's subject
                }
            }
        });
        return row;
    });
  }, [classroomSchedule, selectedClass]);


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Teacher Dashboard</CardTitle>
          <CardDescription>
            Welcome, {teacher.name}. Select a class to view its schedule and student commitments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {teacher.teacherProfile?.classes.map((c, i) => (
              <Button
                key={i}
                variant={selectedClass === c ? "default" : "outline"}
                onClick={() => handleClassSelect(c)}
              >
                Class {c.grade}{c.class.toUpperCase()} - {c.subject}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {selectedClass ? (
        <Card>
            <CardHeader>
                <CardTitle>Schedule for Class {selectedClass.grade}{selectedClass.class.toUpperCase()} at {schoolName}</CardTitle>
                <CardDescription>Showing only your subject: <span className="font-bold">{selectedClass.subject}</span></CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (filteredSchedule.length > 0) ? (
                     <ScheduleTable
                        scheduleData={filteredSchedule}
                        isEditing={false}
                        user={teacher}
                        classroomId={classroomId}
                        explanations={explanations || []}
                        classmates={classmates}
                     />
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        The schedule for this class has not been uploaded yet.
                    </div>
                )}
            </CardContent>
        </Card>
      ) : (
         <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
                <p>You are not assigned to any classes yet.</p>
            </CardContent>
        </Card>
      )}

      {selectedClass && !isLoading && (
         <ClassmatesDashboard 
            classmates={classmates} 
            explanations={explanations} 
            currentUser={teacher}
            classroomId={classroomId}
        />
      )}
    </div>
  );
}
