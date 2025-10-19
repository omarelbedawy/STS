
'use client';

import { Header } from "@/components/app/header";
import { useUser } from "@/firebase/auth/use-user";
import { useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import type { UserProfile } from "@/lib/types";
import { doc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { TeacherDashboard } from '@/components/app/teacher-dashboard';
import { AdminDashboard } from '@/components/app/admin-dashboard';
import { ScheduleAnalyzer } from '@/components/app/schedule-analyzer';


function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function DashboardContent() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // This effect handles redirection for unauthenticated or unverified users.
  useEffect(() => {
    // If loading is finished...
    if (!userLoading) {
      // And there's no user, go to login.
      if (!user) {
        router.push('/login');
      } 
      // Or if there is a user, but their email isn't verified, go to verification page.
      else if (!user.emailVerified) {
        router.push('/verify-email');
      }
    }
  }, [user, userLoading, router]);
  
  const userProfileQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);

  const { data: userProfile, loading: userProfileLoading } = useDoc<UserProfile>(userProfileQuery);

  const isReady = !userLoading && !!user && user.emailVerified && !userProfileLoading && !!userProfile;
  
  // While loading user state or if user is not verified yet, show a full-page loader.
  // This prevents any dashboard content from flashing on the screen for unverified users.
  if (userLoading || !user?.emailVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="sr-only">Loading...</p>
      </div>
    );
  }

  const renderDashboard = () => {
    // This case handles when a user is authenticated but the profile document doesn't exist in Firestore yet.
    // This can happen for a brief moment after sign-up. We show a loading state.
    if (!userProfile) {
        return <DashboardSkeleton />;
    }

    const role = userProfile.role;

    switch (role) {
      case 'teacher':
        return <TeacherDashboard teacher={userProfile} />;
      case 'admin':
        return <AdminDashboard admin={userProfile} />;
      case 'student':
      default:
        return <ScheduleAnalyzer />;
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header userProfile={userProfile} />
      <main className="container mx-auto px-4 pb-12 pt-8">
        {isReady ? renderDashboard() : <DashboardSkeleton />}
      </main>
    </div>
  );
}


export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="sr-only">Loading...</p>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    )
}
