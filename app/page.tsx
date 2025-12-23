import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Get any query parameters that Whop might pass
  const headersList = await headers();
  const referer = headersList.get('referer') || '';
  
  // Direct redirect to dashboard - let dashboard handle auth
  // This works better in iframe contexts
  // Preserve any query parameters that might be passed
  redirect('/dashboard');
}

