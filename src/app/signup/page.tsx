import { SignUpForm } from '@/components/signup-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | Accountable',
  description: 'Create your Accountable account.',
};

export default function SignUpPage() {
  return (
    <main className="flex grow items-center justify-center py-12 sm:py-24">
      <SignUpForm />
    </main>
  );
}
