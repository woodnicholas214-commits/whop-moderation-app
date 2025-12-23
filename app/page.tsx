import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // For Whop iframe embedding, we need to handle auth and redirect properly
  try {
    await requireAuth();
    redirect('/dashboard');
  } catch (error) {
    // If auth fails, still redirect to dashboard (it will handle the error)
    redirect('/dashboard');
  }
}

