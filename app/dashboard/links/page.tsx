'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';

interface LinkRule {
  id: string;
  name: string;
  enabled: boolean;
  type: string;
  domains: string[];
  links: string[];
  action: 'delete' | 'restrict';
  priority: number;
}

export default function LinksPage() {
  const [rules, setRules] = useState<LinkRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomains, setNewDomains] = useState('');
  const [newLinks, setNewLinks] = useState('');
  const [newAction, setNewAction] = useState<'delete' | 'restrict'>('delete');
  const [ruleType, setRuleType] = useState<'whop_only' | 'block_list' | 'allow_list'>('whop_only');
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

  // Load link/domain rules
  useEffect(() => {
    if (!companyId) return;

    fetch(`/api/links?companyId=${companyId}`)
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

  const handleAddRule = async () => {
    if (!companyId) return;

    let domains: string[] = [];
    let links: string[] = [];
    let conditionType = 'domain_block';
    let ruleName = '';

    if (ruleType === 'whop_only') {
      // Only allow whop.com - block everything else
      // We use domain_allow with whop.com, then invert the logic
      domains = ['whop.com'];
      conditionType = 'domain_allow'; // Allow whop.com, block others
      ruleName = 'Whop.com Only - Delete All Other Links';
    } else if (ruleType === 'block_list') {
      // Block specific domains/links
      if (newDomains.trim()) {
        domains = newDomains
          .split('\n')
          .map(d => d.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0])
          .filter(d => d.length > 0);
      }
      if (newLinks.trim()) {
        links = newLinks
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0);
      }
      conditionType = domains.length > 0 ? 'domain_block' : 'link_block';
      ruleName = `Block ${domains.length > 0 ? 'Domains' : 'Links'}: ${(domains.length > 0 ? domains : links).slice(0, 3).join(', ')}${(domains.length > 0 ? domains : links).length > 3 ? '...' : ''}`;
    } else if (ruleType === 'allow_list') {
      // Allow only specific domains/links
      if (newDomains.trim()) {
        domains = newDomains
          .split('\n')
          .map(d => d.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0])
          .filter(d => d.length > 0);
      }
      if (newLinks.trim()) {
        links = newLinks
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0);
      }
      conditionType = domains.length > 0 ? 'domain_allow' : 'link_allow';
      ruleName = `Allow Only ${domains.length > 0 ? 'Domains' : 'Links'}: ${(domains.length > 0 ? domains : links).slice(0, 3).join(', ')}${(domains.length > 0 ? domains : links).length > 3 ? '...' : ''}`;
    }

    if (ruleType !== 'whop_only' && domains.length === 0 && links.length === 0) {
      alert('Please enter at least one domain or link');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          type: conditionType,
          domains: domains.length > 0 ? domains : undefined,
          links: links.length > 0 ? links : undefined,
          action: newAction,
          ruleName,
        }),
      });

      if (response.ok) {
        // Reload rules
        const data = await fetch(`/api/links?companyId=${companyId}`).then(r => r.json());
        setRules(data.rules || []);
        setNewDomains('');
        setNewLinks('');
        setShowAddForm(false);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to add rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEnabled = async (ruleId: string, currentEnabled: boolean) => {
    try {
      const response = await fetch(`/api/links/${ruleId}`, {
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
    if (!confirm('Are you sure you want to delete this link/domain rule?')) return;

    try {
      const response = await fetch(`/api/links/${ruleId}`, {
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
      const response = await fetch(`/api/links/${ruleId}`, {
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
        <h1 className="text-3xl font-bold text-gray-900">Link/Domain Rules</h1>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Link/Domain Rules</h1>
          <p className="mt-2 text-gray-600">
            Manage rules for links and domains - block or allow specific links/domains
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? 'Cancel' : 'Add Rule'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Link/Domain Rule</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rule Type
              </label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="whop_only">Whop.com Only (Delete all other links)</option>
                <option value="block_list">Block List (Block specific domains/links)</option>
                <option value="allow_list">Allow List (Only allow specific domains/links)</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                {ruleType === 'whop_only' && 'Automatically deletes any link that does not start with whop.com'}
                {ruleType === 'block_list' && 'Blocks messages containing the specified domains or links'}
                {ruleType === 'allow_list' && 'Only allows messages with the specified domains or links, blocks all others'}
              </p>
            </div>

            {ruleType !== 'whop_only' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domains to {ruleType === 'block_list' ? 'Block' : 'Allow'} (one per line)
                  </label>
                  <textarea
                    value={newDomains}
                    onChange={(e) => setNewDomains(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="example.com&#10;spam-site.com&#10;malicious-domain.com"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Enter domains without http:// or www. (e.g., example.com)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Links to {ruleType === 'block_list' ? 'Block' : 'Allow'} (one per line)
                  </label>
                  <textarea
                    value={newLinks}
                    onChange={(e) => setNewLinks(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="https://example.com/page&#10;https://spam-site.com/bad-link"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Enter full URLs (e.g., https://example.com/page)
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action
              </label>
              <select
                value={newAction}
                onChange={(e) => setNewAction(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="delete">Delete immediately</option>
                <option value="restrict">Restrict (send to review)</option>
              </select>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewDomains('');
                  setNewLinks('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRule}
                disabled={submitting || (ruleType !== 'whop_only' && !newDomains.trim() && !newLinks.trim())}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Rule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <p className="text-gray-500 mb-4">No link/domain rules yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first link/domain rule
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
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
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {rule.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  {rule.domains.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-gray-700 mb-1">Domains:</p>
                      <div className="flex flex-wrap gap-2">
                        {rule.domains.map((domain, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                          >
                            {domain}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {rule.links.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Links:</p>
                      <div className="flex flex-wrap gap-2">
                        {rule.links.map((link, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded break-all"
                          >
                            {link}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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
                  className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
