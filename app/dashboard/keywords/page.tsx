'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';

interface KeywordRule {
  id: string;
  name: string;
  enabled: boolean;
  keywords: string[];
  matchType: string;
  action: 'delete' | 'restrict';
  priority: number;
}

export default function KeywordsPage() {
  const [rules, setRules] = useState<KeywordRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeywords, setNewKeywords] = useState('');
  const [newAction, setNewAction] = useState<'delete' | 'restrict'>('restrict');
  const [newMatchType, setNewMatchType] = useState<'keyword_contains' | 'keyword_exact'>('keyword_contains');
  const [submitting, setSubmitting] = useState(false);

  // Get company ID
  useEffect(() => {
    fetch('/api/company/default_company')
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          setCompanyId(data.id);
        }
      })
      .catch(() => {});
  }, []);

  // Load keyword rules
  useEffect(() => {
    if (!companyId) return;

    fetch(`/api/keywords?companyId=${companyId}`)
      .then((res) => res.json())
      .then((data) => {
        setRules(data.rules || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [companyId]);

  const handleAddKeywords = async () => {
    if (!newKeywords.trim() || !companyId) return;

    const keywords = newKeywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keywords.length === 0) {
      alert('Please enter at least one keyword');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          keywords,
          action: newAction,
          matchType: newMatchType,
        }),
      });

      if (response.ok) {
        // Reload rules
        const data = await fetch(`/api/keywords?companyId=${companyId}`).then(r => r.json());
        setRules(data.rules || []);
        setNewKeywords('');
        setShowAddForm(false);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to add keywords');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEnabled = async (ruleId: string, currentEnabled: boolean) => {
    try {
      const response = await fetch(`/api/keywords/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });

      if (response.ok) {
        setRules(rules.map(r => r.id === ruleId ? { ...r, enabled: !currentEnabled } : r));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this keyword filter?')) return;

    try {
      const response = await fetch(`/api/keywords/${ruleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRules(rules.filter(r => r.id !== ruleId));
      }
    } catch (error) {
      console.error(error);
      alert('Failed to delete rule');
    }
  };

  const handleUpdateAction = async (ruleId: string, newAction: 'delete' | 'restrict') => {
    try {
      const response = await fetch(`/api/keywords/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newAction }),
      });

      if (response.ok) {
        setRules(rules.map(r => r.id === ruleId ? { ...r, action: newAction } : r));
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Keyword Filters</h1>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Keyword Filters</h1>
          <p className="mt-2 text-gray-600">
            Manage keywords that will automatically restrict or delete posts
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? 'Cancel' : 'Add Keywords'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add New Keyword Filter</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Keywords (one per line)
              </label>
              <textarea
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                rows={6}
                placeholder="spam&#10;inappropriate&#10;badword"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter keywords, one per line. Messages containing these will be filtered.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Match Type
                </label>
                <select
                  value={newMatchType}
                  onChange={(e) => setNewMatchType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="keyword_contains">Contains keyword</option>
                  <option value="keyword_exact">Exact match</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Action
                </label>
                <select
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="restrict">Restrict (send to review)</option>
                  <option value="delete">Delete immediately</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewKeywords('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddKeywords}
                disabled={submitting || !newKeywords.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Keywords'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-lg shadow text-center">
          <p className="text-gray-500 mb-4">No keyword filters yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first keyword filter
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{rule.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        rule.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        rule.action === 'delete'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {rule.action === 'delete' ? 'Deletes' : 'Restricts'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    Match type: {rule.matchType === 'keyword_contains' ? 'Contains' : 'Exact match'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rule.keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 text-gray-700 dark:text-gray-300 text-sm rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleToggleEnabled(rule.id, rule.enabled)}
                  className={`px-3 py-1 text-sm rounded ${
                    rule.enabled
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {rule.enabled ? 'Disable' : 'Enable'}
                </button>

                <select
                  value={rule.action}
                  onChange={(e) => handleUpdateAction(rule.id, e.target.value as any)}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="restrict">Restrict (review)</option>
                  <option value="delete">Delete immediately</option>
                </select>

                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
