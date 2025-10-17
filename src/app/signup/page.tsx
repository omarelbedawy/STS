
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User, Briefcase, Shield } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle>Join STS</CardTitle>
          <CardDescription>Select your role to get started.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          <RoleCard
            icon={<User className="size-10 text-primary" />}
            title="Student"
            description="View your class schedule and collaborate on explanations."
            href="/signup/student"
          />
          <RoleCard
            icon={<Briefcase className="size-10 text-primary" />}
            title="Teacher"
            description="Manage your classes, subjects, and track student commitments."
            href="/signup/teacher"
          />
          <RoleCard
            icon={<Shield className="size-10 text-primary" />}
            title="Admin"
            description="Oversee the platform and manage school-wide settings."
            href="/signup/admin"
          />
        </CardContent>
         <div className="mt-4 text-center text-sm p-4 border-t">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Log in
            </Link>
          </div>
      </Card>
    </div>
  );
}

function RoleCard({ icon, title, description, href }: { icon: React.ReactNode, title: string, description: string, href: string }) {
  return (
    <Link href={href} className="block h-full">
      <div className="flex flex-col items-center justify-start text-center p-6 rounded-lg border h-full transition-all duration-300 ease-in-out hover:bg-accent/50 hover:shadow-lg hover:-translate-y-2">
        {icon}
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <Button variant="outline" className="mt-6">
            Sign up as {title}
        </Button>
      </div>
    </Link>
  );
}
