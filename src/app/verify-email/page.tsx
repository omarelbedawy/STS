'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { auth } from '@/firebase/auth/client';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MailCheck, MailWarning } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Redirect if user status changes (e.g., they get verified)
  useEffect(() => {
    if (!userLoading && user?.emailVerified) {
        toast({
            title: 'Email Verified!',
            description: 'Your account is now active. Welcome to STS!',
        });
        router.push('/dashboard');
        return; // Early exit
    }

    const interval = setInterval(async () => {
        if (user) {
            await user.reload();
            if (user.emailVerified) {
                // The toast and redirect will happen on the next render via the check above
                // We just need to force a re-render if state changes, which `user.reload()` does indirectly
            }
        }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [user, userLoading, router, toast]);

  // Timer for resend button
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSending) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsSending(false);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSending]);

  const handleResendVerification = async () => {
    if (!user) return;
    setIsSending(true);
    try {
      const origin = window.location.origin;
      const actionCodeSettings = {
        url: `${origin}/dashboard`,
        handleCodeInApp: true,
      };
      await sendEmailVerification(user, actionCodeSettings);
      toast({
        title: 'Verification Email Sent',
        description: 'A new verification link has been sent to your inbox.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Sending Email',
        description: error.message || 'Could not send verification email. Please try again later.',
      });
      setIsSending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  }

  // Show a loading screen until user status is determined or if they are already verified
  if (userLoading || user?.emailVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading your dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
       <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-lg text-center">
             <CardHeader>
                <MailWarning className="mx-auto h-12 w-12 text-destructive" />
                <CardTitle className="mt-4">You are not logged in</CardTitle>
                 <CardDescription>
                    Please log in to continue the verification process.
                 </CardDescription>
             </CardHeader>
             <CardContent>
                 <Button asChild>
                    <Link href="/login">Go to Login</Link>
                </Button>
             </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <MailCheck className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="mt-4">Verify Your Email</CardTitle>
          <CardDescription>
            A verification link has been sent to your email address:
            <br />
            <strong className="text-foreground">{user.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please click the link in that email to continue. If you don't see it, be sure to check your spam folder. This page will automatically redirect you once your email is verified.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={handleResendVerification} disabled={isSending} variant="secondary">
                {isSending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resend in {countdown}s
                </>
                ) : (
                'Resend Verification Email'
                )}
            </Button>
          </div>
          <div className="mt-6 text-center text-sm">
             <Button variant="link" onClick={handleSignOut}>
                Sign in with a different account
             </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
