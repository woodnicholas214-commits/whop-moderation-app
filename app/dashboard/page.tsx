import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await requireAuth();
  
  // Get company ID - use from session or find default company
  let companyId = session.companyId;
  if (!companyId) {
    const company = await prisma.company.findFirst({
      where: { whopId: 'default_company' },
    });
    companyId = company?.id || '';
  }

  if (!companyId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">No Company Found</h1>
        <p className="text-gray-600">Please run the seed script: npm run db:seed</p>
      </div>
    );
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
}

