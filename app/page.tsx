import DashboardPage from './dashboard/page';

export const dynamic = 'force-dynamic';

// Render dashboard directly on root to avoid redirect issues in iframes
export default function Home() {
  return <DashboardPage />;
}

