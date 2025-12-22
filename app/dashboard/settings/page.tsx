'use client';

import { useEffect, useState } from 'react';

interface Settings {
  moderation: {
    autoDeleteEnabled: boolean;
    defaultAction: 'delete' | 'restrict';
    requireReviewForHighSeverity: boolean;
    maxIncidentsPerUser: number;
    cooldownPeriod: number;
  };
  notifications: {
    notifyOnIncident: boolean;
    notifyOnRuleTrigger: boolean;
    escalationChannel: string;
    emailNotifications: boolean;
  };
  webhook: {
    enabled: boolean;
    verifySignature: boolean;
    rateLimitPerMinute: number;
  };
  general: {
    appName: string;
    timezone: string;
    language: string;
  };
}

interface Permission {
  id: string;
  userId: string;
  role: 'admin' | 'moderator' | 'viewer';
  createdAt: string;
  grantedBy: string | null;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'permissions' | 'moderation' | 'notifications' | 'webhook' | 'general'>('permissions');
  const [companyId, setCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'moderator' | 'viewer'>('moderator');
  const [addingPermission, setAddingPermission] = useState(false);

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

  // Load settings and permissions
  useEffect(() => {
    if (!companyId) return;

    Promise.all([
      fetch(`/api/settings?companyId=${companyId}`).then(r => {
        if (!r.ok) throw new Error(`Settings API error: ${r.status}`);
        return r.json();
      }),
      fetch(`/api/permissions?companyId=${companyId}`).then(r => {
        if (!r.ok) {
          // If 403, return empty permissions array (user not admin yet)
          if (r.status === 403) {
            return { permissions: [] };
          }
          throw new Error(`Permissions API error: ${r.status}`);
        }
        return r.json();
      }),
    ])
      .then(([settingsData, permissionsData]) => {
        if (settingsData.error) {
          console.error('Settings error:', settingsData.error);
          // Still set default settings structure
          setSettings({
            moderation: {
              autoDeleteEnabled: true,
              defaultAction: 'delete',
              requireReviewForHighSeverity: true,
              maxIncidentsPerUser: 5,
              cooldownPeriod: 3600,
            },
            notifications: {
              notifyOnIncident: true,
              notifyOnRuleTrigger: false,
              escalationChannel: '',
              emailNotifications: false,
            },
            webhook: {
              enabled: true,
              verifySignature: true,
              rateLimitPerMinute: 100,
            },
            general: {
              appName: 'Whop AutoMod',
              timezone: 'UTC',
              language: 'en',
            },
          });
        } else if (settingsData.settings) {
          setSettings(settingsData.settings);
        }
        if (permissionsData.permissions) {
          setPermissions(permissionsData.permissions);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading settings:', err);
        // Set default settings on error
        setSettings({
          moderation: {
            autoDeleteEnabled: true,
            defaultAction: 'delete',
            requireReviewForHighSeverity: true,
            maxIncidentsPerUser: 5,
            cooldownPeriod: 3600,
          },
          notifications: {
            notifyOnIncident: true,
            notifyOnRuleTrigger: false,
            escalationChannel: '',
            emailNotifications: false,
          },
          webhook: {
            enabled: true,
            verifySignature: true,
            rateLimitPerMinute: 100,
          },
          general: {
            appName: 'Whop AutoMod',
            timezone: 'UTC',
            language: 'en',
          },
        });
        setLoading(false);
      });
  }, [companyId]);

  const handleSaveSettings = async (section: keyof Settings, sectionData: any) => {
    if (!companyId || !settings) return;

    setSaving(true);
    try {
      const updatedSettings = {
        ...settings,
        [section]: sectionData,
      };

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          settings: updatedSettings,
        }),
      });

      if (response.ok) {
        setSettings(updatedSettings);
        alert('Settings saved successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPermission = async () => {
    if (!newUserId.trim() || !companyId) return;

    setAddingPermission(true);
    try {
      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          userId: newUserId.trim(),
          role: newRole,
        }),
      });

      if (response.ok) {
        const data = await fetch(`/api/permissions?companyId=${companyId}`).then(r => r.json());
        setPermissions(data.permissions || []);
        setNewUserId('');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to add permission');
    } finally {
      setAddingPermission(false);
    }
  };

  const handleUpdatePermission = async (userId: string, role: string) => {
    try {
      const response = await fetch(`/api/permissions/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          role,
        }),
      });

      if (response.ok) {
        const data = await fetch(`/api/permissions?companyId=${companyId}`).then(r => r.json());
        setPermissions(data.permissions || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeletePermission = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user\'s access?')) return;

    try {
      const response = await fetch(`/api/permissions/${userId}?companyId=${companyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPermissions(permissions.filter(p => p.userId !== userId));
      }
    } catch (error) {
      console.error(error);
      alert('Failed to remove permission');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <div>Loading...</div>
      </div>
    );
  }

  if (!settings) {
    return <div>Error loading settings</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Configure app settings and user permissions</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['permissions', 'moderation', 'notifications', 'webhook', 'general'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Permissions</h2>
            <p className="text-sm text-gray-600 mb-4">
              Manage who can access the AutoMod app and their permission levels.
            </p>

            <div className="mb-6 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Roles:</strong> Admin (full access), Moderator (can manage rules and review), Viewer (read-only)
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-3">Add User</h3>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  placeholder="Whop User ID"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={handleAddPermission}
                  disabled={addingPermission || !newUserId.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {addingPermission ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </div>

            {permissions.length === 0 ? (
              <p className="text-gray-500">No permissions set yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {permissions.map((perm) => (
                      <tr key={perm.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{perm.userId}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={perm.role}
                            onChange={(e) => handleUpdatePermission(perm.userId, e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="admin">Admin</option>
                            <option value="moderator">Moderator</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(perm.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleDeletePermission(perm.userId)}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Moderation Tab */}
      {activeTab === 'moderation' && (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Moderation Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Auto-Delete Enabled</label>
                <p className="text-sm text-gray-500">Automatically delete messages that violate rules</p>
              </div>
              <input
                type="checkbox"
                checked={settings.moderation.autoDeleteEnabled}
                onChange={(e) => {
                  const updated = { ...settings.moderation, autoDeleteEnabled: e.target.checked };
                  handleSaveSettings('moderation', updated);
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Action</label>
              <select
                value={settings.moderation.defaultAction}
                onChange={(e) => {
                  const updated = { ...settings.moderation, defaultAction: e.target.value as any };
                  handleSaveSettings('moderation', updated);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="delete">Delete immediately</option>
                <option value="restrict">Send to review queue</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Require Review for High Severity</label>
                <p className="text-sm text-gray-500">Always send high severity incidents to review queue</p>
              </div>
              <input
                type="checkbox"
                checked={settings.moderation.requireReviewForHighSeverity}
                onChange={(e) => {
                  const updated = { ...settings.moderation, requireReviewForHighSeverity: e.target.checked };
                  handleSaveSettings('moderation', updated);
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Incidents Per User (before auto-action)
              </label>
              <input
                type="number"
                value={settings.moderation.maxIncidentsPerUser}
                onChange={(e) => {
                  const updated = { ...settings.moderation, maxIncidentsPerUser: parseInt(e.target.value) || 5 };
                  handleSaveSettings('moderation', updated);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cooldown Period (seconds)
              </label>
              <input
                type="number"
                value={settings.moderation.cooldownPeriod}
                onChange={(e) => {
                  const updated = { ...settings.moderation, cooldownPeriod: parseInt(e.target.value) || 3600 };
                  handleSaveSettings('moderation', updated);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Notify on Incident</label>
                <p className="text-sm text-gray-500">Send notifications when incidents are created</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.notifyOnIncident}
                onChange={(e) => {
                  const updated = { ...settings.notifications, notifyOnIncident: e.target.checked };
                  handleSaveSettings('notifications', updated);
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Notify on Rule Trigger</label>
                <p className="text-sm text-gray-500">Send notifications when rules are triggered</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.notifyOnRuleTrigger}
                onChange={(e) => {
                  const updated = { ...settings.notifications, notifyOnRuleTrigger: e.target.checked };
                  handleSaveSettings('notifications', updated);
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Escalation Channel ID</label>
              <input
                type="text"
                value={settings.notifications.escalationChannel}
                onChange={(e) => {
                  const updated = { ...settings.notifications, escalationChannel: e.target.value };
                  handleSaveSettings('notifications', updated);
                }}
                placeholder="Channel ID for escalation notifications"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                <p className="text-sm text-gray-500">Send email notifications for important events</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.emailNotifications}
                onChange={(e) => {
                  const updated = { ...settings.notifications, emailNotifications: e.target.checked };
                  handleSaveSettings('notifications', updated);
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Webhook Tab */}
      {activeTab === 'webhook' && (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Webhook Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Webhook Enabled</label>
                <p className="text-sm text-gray-500">Process incoming webhook events</p>
              </div>
              <input
                type="checkbox"
                checked={settings.webhook.enabled}
                onChange={(e) => {
                  const updated = { ...settings.webhook, enabled: e.target.checked };
                  handleSaveSettings('webhook', updated);
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Verify Signature</label>
                <p className="text-sm text-gray-500">Verify webhook signatures for security</p>
              </div>
              <input
                type="checkbox"
                checked={settings.webhook.verifySignature}
                onChange={(e) => {
                  const updated = { ...settings.webhook, verifySignature: e.target.checked };
                  handleSaveSettings('webhook', updated);
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rate Limit (requests per minute)
              </label>
              <input
                type="number"
                value={settings.webhook.rateLimitPerMinute}
                onChange={(e) => {
                  const updated = { ...settings.webhook, rateLimitPerMinute: parseInt(e.target.value) || 100 };
                  handleSaveSettings('webhook', updated);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="1000"
              />
            </div>
          </div>
        </div>
      )}

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">App Name</label>
              <input
                type="text"
                value={settings.general.appName}
                onChange={(e) => {
                  const updated = { ...settings.general, appName: e.target.value };
                  handleSaveSettings('general', updated);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
              <select
                value={settings.general.timezone}
                onChange={(e) => {
                  const updated = { ...settings.general, timezone: e.target.value };
                  handleSaveSettings('general', updated);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                value={settings.general.language}
                onChange={(e) => {
                  const updated = { ...settings.general, language: e.target.value };
                  handleSaveSettings('general', updated);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
