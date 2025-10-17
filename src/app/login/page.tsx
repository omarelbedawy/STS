import { LoginForm } from '@/components/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log In | Accountable',
  description: 'Log in to your Accountable account.',
};

export default function LoginPage() {
  return (
    <main className="flex grow items-center justify-center py-12 sm:py-24">
      <LoginForm />
    </main>
  );
}
