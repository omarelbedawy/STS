
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
  
  useEffect(() => {
    if (user?.emailVerified) {
      toast({
        title: 'Email Verified!',
        description: 'Your account is now active. Welcome to STS!',
      });
      router.push('/dashboard');
    }
  }, [user, router, toast]);

  // Handle periodic re-checking of user's email verification status
  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          router.push('/dashboard');
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(intervalId);
  }, [router]);


  const handleResendVerification = async () => {
    if (!user) return;
    setIsSending(true);
    try {
      const actionCodeSettings = {
        url: `https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}/dashboard`,
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

  if (userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
     router.push('/login');
     return null;
  }
  
  if (user.emailVerified) {
    router.push('/dashboard');
    return null;
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
            Please click the link in that email to continue. If you don't see it, be sure to check your spam folder.
          </p>
          <Button onClick={handleResendVerification} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resend in {countdown}s
              </>
            ) : (
              'Resend Verification Email'
            )}
          </Button>
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
