'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Rule {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  priority: number;
  severity: string;
  mode: string;
  stopOnMatch: boolean;
  scope: any;
  conditions: any[];
  actions: any[];
}

export default function RuleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [rule, setRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/rules/${params.id}`)
        .then((res) => res.json())
        .then((data) => {
          setRule(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [params.id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!rule) {
    return <div>Rule not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link
            href="/dashboard/rules"
            className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block"
          >
            ← Back to Rules
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{rule.name}</h1>
          {rule.description && (
            <p className="mt-2 text-gray-600">{rule.description}</p>
          )}
        </div>
        <button
          onClick={() => router.push(`/dashboard/rules/${rule.id}/edit`)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Edit
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <p className="text-sm text-gray-900">
                {rule.enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Priority</label>
              <p className="text-sm text-gray-900">{rule.priority}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Severity</label>
              <p className="text-sm text-gray-900 capitalize">{rule.severity}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Mode</label>
              <p className="text-sm text-gray-900 capitalize">{rule.mode}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conditions</h2>
          <div className="space-y-2">
            {rule.conditions.map((condition) => (
              <div
                key={condition.id}
                className="p-3 bg-gray-50 rounded border border-gray-200"
              >
                <p className="text-sm font-medium text-gray-900">
                  {condition.type.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {JSON.stringify(condition.config)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
          <div className="space-y-2">
            {rule.actions.map((action) => (
              <div
                key={action.id}
                className="p-3 bg-gray-50 rounded border border-gray-200"
              >
                <p className="text-sm font-medium text-gray-900">
                  {action.type.replace(/_/g, ' ')}
                </p>
                {Object.keys(action.config).length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {JSON.stringify(action.config)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

