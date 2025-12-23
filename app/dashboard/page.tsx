import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  try {
    const session = await requireAuth();
    
    // Get company ID - use from session or find default company
    let companyId = session.companyId;
    if (!companyId) {
      try {
        const company = await prisma.company.findFirst({
          where: { whopId: 'default_company' },
        });
        companyId = company?.id || '';
      } catch (dbError) {
        console.error('Database error:', dbError);
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Database Connection Error</h1>
            <p className="text-gray-600">Unable to connect to database. Please check your DATABASE_URL environment variable.</p>
          </div>
        );
      }
    }

    if (!companyId) {
      // Try to create default company
      try {
        const defaultCompany = await prisma.company.upsert({
          where: { whopId: 'default_company' },
          update: {},
          create: {
            whopId: 'default_company',
            name: 'Default Company',
          },
        });
        companyId = defaultCompany.id;
      } catch (seedError) {
        console.error('Failed to create default company:', seedError);
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">No Company Found</h1>
            <p className="text-gray-600 mb-4">The database needs to be initialized, but we couldn't create the default company automatically.</p>
            <p className="text-sm text-gray-500">Please check your database connection and try refreshing the page.</p>
          </div>
        );
      }
    }

  const [rulesCount, incidentsCount, pendingCount] = await Promise.all([
    prisma.moderationRule.count({
      where: { companyId, enabled: true },
    }),
    prisma.incident.count({
      where: { companyId },
    }),
    prisma.incident.count({
      where: { companyId, status: 'pending' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
        <p className="mt-2 text-gray-600">Content moderation dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Active Rules</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{rulesCount}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Incidents</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{incidentsCount}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Pending Review</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{pendingCount}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Incidents</h2>
        <p className="text-gray-500">No recent incidents</p>
      </div>
    </div>
  );
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Error</h1>
        <p className="text-gray-600">An error occurred: {error.message || 'Unknown error'}</p>
      </div>
    );
  }
}

