

'use client';

import { Header } from "@/components/app/header";
import { useUser } from "@/firebase/auth/use-user";
import { useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import type { UserProfile } from "@/lib/types";
import { doc } from "firebase/firestore";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";

const TeacherDashboard = dynamic(() => import('@/components/app/teacher-dashboard').then(mod => mod.TeacherDashboard), { 
  loading: () => <DashboardSkeleton />,
  ssr: false 
});
const AdminDashboard = dynamic(() => import('@/components/app/admin-dashboard').then(mod => mod.AdminDashboard), {
  loading: () => <DashboardSkeleton />,
  ssr: false
});
const ScheduleAnalyzer = dynamic(() => import('@/components/app/schedule-analyzer').then(mod => mod.ScheduleAnalyzer), {
  loading: () => <DashboardSkeleton />,
  ssr: false
});


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

  useEffect(() => {
    if (user && !user.emailVerified) {
      router.push('/verify-email');
    }
  }, [user, router]);


  const userProfileQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: userProfile, loading: userProfileLoading } = useDoc<UserProfile>(userProfileQuery);

  const isReady = !userLoading && !!user?.emailVerified && !userProfileLoading && !!userProfile && !!firestore;

  if (!user || !user.emailVerified || !isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="sr-only">Loading...</p>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (userProfile?.role) {
      case 'teacher':
        return <TeacherDashboard teacher={userProfile} />;
      case 'admin':
        return <AdminDashboard admin={userProfile} />;
      case 'student':
      default:
        // For students, we now directly render the ScheduleAnalyzer
        return <ScheduleAnalyzer />;
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 pb-12 pt-8">
        <Suspense fallback={<DashboardSkeleton />}>
          {renderDashboard()}
        </Suspense>
      </main>
    </div>
  );
}

    