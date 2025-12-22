import { ReactNode } from 'react';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth';

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/rules', label: 'Rules' },
  { href: '/dashboard/keywords', label: 'Keyword Filters' },
  { href: '/dashboard/links', label: 'Link/Domain Rules' },
  { href: '/dashboard/spam', label: 'Spam/Ratelimits' },
  { href: '/dashboard/exemptions', label: 'Exemptions' },
  { href: '/dashboard/review', label: 'Review Queue' },
  { href: '/dashboard/audit', label: 'Audit Log' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAuth();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Whop AutoMod</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

