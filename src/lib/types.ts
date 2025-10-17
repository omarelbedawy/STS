
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  school: string; // School ID
  // Student-specific
  grade?: '10' | '11' | '12';
  class?: 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
  // Teacher-specific
  teacherProfile?: {
    classes: {
      grade: string;
      class: string;
      subject: string;
    }[];
  };
}

export interface ClassroomSchedule {
    id: string;
    schedule: any[];
    uploadedBy: string;
    uploadedAt: any; // Firestore Timestamp
}

export interface ExplanationContributor {
  userId: string;
  userName: string;
  status: 'pending' | 'accepted' | 'declined';
}


export interface Explanation {
  id: string;
  ownerId: string;
  contributors: ExplanationContributor[];
  subject: string;
  day: string;
  session: string;
  learningOutcome?: number;
  concepts: string[];
  explanationDate: any; // Firestore Timestamp
  status: 'Upcoming' | 'Finished';
  completionStatus?: 'pending' | 'explained' | 'not-explained';
  createdAt: any; // Firestore timestamp
}
