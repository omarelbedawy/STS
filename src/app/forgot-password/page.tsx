import { ForgotPasswordForm } from '@/components/forgot-password-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password | Accountable',
  description: 'Reset your Accountable password.',
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex grow items-center justify-center py-12 sm:py-24">
      <ForgotPasswordForm />
    </main>
  );
}
