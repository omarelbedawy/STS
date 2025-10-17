"use client";

import { useUser } from "@/firebase/auth/use-user";
import { auth } from "@/firebase/auth/client";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function Header() {
  const { user } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <BookOpen className="size-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            STS
          </h1>
        </Link>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Welcome, {user.displayName || user.email}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
              <LogOut className="size-5" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
