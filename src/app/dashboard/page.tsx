
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

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);


  const userProfileQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);

  const { data: userProfile, loading: userProfileLoading } = useDoc<UserProfile>(userProfileQuery);

  const isReady = !userLoading && !!user && !userProfileLoading && !!userProfile;

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="sr-only">Loading...</p>
      </div>
    );
  }
  
  if (user && !user.emailVerified) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4">Please verify your email before logging in...</p>
        </div>
    );
  }

  const renderDashboard = () => {
    const role = userProfile?.role;

    switch (role) {
      case 'teacher':
        return <TeacherDashboard teacher={userProfile!} />;
      case 'admin':
        return <AdminDashboard admin={userProfile!} />;
      case 'student':
      default:
        return <ScheduleAnalyzer />;
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header userProfile={userProfile} />
      <main className="container mx-auto px-4 pb-12 pt-8">
        <Suspense fallback={<DashboardSkeleton />}>
          {isReady ? renderDashboard() : <DashboardSkeleton />}
        </Suspense>
      </main>
    </div>
  );
}
