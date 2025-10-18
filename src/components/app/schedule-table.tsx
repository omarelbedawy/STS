
"use client";

import type { AnalyzeScheduleFromImageOutput } from "@/ai/flows/analyze-schedule-from-image";
import React from 'react';
import { SubjectCell } from "./subject-cell";
import type { UserProfile, Explanation } from "@/lib/types";


type ScheduleData = AnalyzeScheduleFromImageOutput["schedule"];

const days = ["sunday", "monday", "tuesday", "wednesday", "thursday"];
const dayHeaders = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

export function ScheduleTable({ 
  scheduleData, 
  isEditing = false,
  onScheduleChange,
  user,
  isViewingOwnClass,
  classroomId,
  explanations,
  classmates,
}: {
  scheduleData: ScheduleData;
  isEditing?: boolean;
  onScheduleChange?: (rowIndex: number, day: string, newSubject: string) => void;
  user: UserProfile | null;
  isViewingOwnClass?: boolean;
  classroomId: string | null;
  explanations: Explanation[];
  classmates: UserProfile[] | null;
}) {
  if (!scheduleData) return null;

  return (
    <div className="grid grid-cols-[auto_auto_1fr_1fr_1fr_1fr_1fr] gap-px overflow-hidden rounded-lg border bg-border text-center text-sm shadow-md">
      {/* Header */}
      <div className="bg-muted p-3 font-semibold text-muted-foreground">Session</div>
      <div className="bg-muted p-3 font-semibold text-muted-foreground">Time</div>
      {dayHeaders.map((day) => (
        <div key={day} className="bg-muted p-3 font-semibold text-muted-foreground">
          {day}
        </div>
      ))}

      {/* Body */}
      {scheduleData.map((row, rowIndex) => {
        if (row.session.toLowerCase().includes("break")) {
          return (
            <div
              key={rowIndex}
              className="col-span-7 flex items-center justify-center bg-card p-2 font-bold text-primary"
            >
              {row.session}
            </div>
          );
        }
        return (
          <React.Fragment key={rowIndex}>
            <div className="flex items-center justify-center bg-card p-2 font-medium">
              {row.session}
            </div>
            <div className="flex items-center justify-center whitespace-nowrap bg-card p-2 font-mono text-xs text-muted-foreground">
              {row.time}
            </div>
            {days.map((day) => {
              const subject = row[day as keyof typeof row] as string;
              const cellExplanations = explanations.filter(exp => 
                exp.day === day && exp.session === row.session
              );

              return (
                <SubjectCell
                  key={`${rowIndex}-${day}`}
                  subject={subject}
                  isEditing={isEditing}
                  onChange={(newSubject) => onScheduleChange?.(rowIndex, day, newSubject)}
                  user={user}
                  isViewingOwnClass={isViewingOwnClass}
                  classroomId={classroomId}
                  day={day}
                  session={row.session}
                  explanations={cellExplanations}
                  classmates={classmates}
                />
              )
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}
