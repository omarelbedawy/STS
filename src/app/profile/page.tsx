import { ProfileForm } from '@/components/profile-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile | Accountable',
  description: 'Manage your Accountable profile.',
};

export default async function ProfilePage() {
  // In a real app, you would fetch user data here and pass it to the form.
  const userData = {
    email: 'user@example.com',
    name: 'Example User',
  };

  return (
    <main className="flex grow justify-center py-12 sm:py-24">
      <div className="container max-w-3xl">
        <h1 className="text-2xl font-bold mb-8 font-headline">My Profile</h1>
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal details here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm userData={userData} />
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Manage your account security settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Password change functionality would be implemented here.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
