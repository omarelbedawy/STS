import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Accountable Home">
      <ShieldCheck className="h-6 w-6 text-primary" />
      <span className="hidden text-xl font-bold tracking-tight sm:inline-block">
        Accountable
      </span>
    </Link>
  );
}
