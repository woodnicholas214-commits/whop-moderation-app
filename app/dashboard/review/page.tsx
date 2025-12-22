'use client';

import { useEffect, useState } from 'react';

interface Incident {
  id: string;
  source: string;
  contentId: string;
  authorId: string;
  contentSnapshot: any;
  ruleHits: any[];
  features: any;
  status: string;
  createdAt: string;
  rule: {
    id: string;
    name: string;
  } | null;
}

export default function ReviewQueuePage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const companyId = 'default'; // TODO: Get from context

  useEffect(() => {
    fetch(`/api/incidents?companyId=${companyId}&status=pending`)
      .then((res) => res.json())
      .then((data) => {
        setIncidents(data.incidents || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [companyId]);

  const handleReview = async (incidentId: string, status: string) => {
    try {
      const response = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setIncidents(incidents.filter((i) => i.id !== incidentId));
      } else {
        alert('Failed to update incident');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to update incident');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Review Queue</h1>
        <p className="mt-2 text-gray-600">Review and moderate flagged content</p>
      </div>

      {incidents.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <p className="text-gray-500">No pending incidents</p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <div key={incident.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {incident.rule?.name || 'Unknown Rule'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {incident.source} • {new Date(incident.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleReview(incident.id, 'approved')}
                    className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview(incident.id, 'removed')}
                    className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => handleReview(incident.id, 'dismissed')}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded mb-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {incident.contentSnapshot?.content || 'No content'}
                </p>
              </div>

              <div className="text-sm text-gray-600">
                <p>Author: {incident.authorId}</p>
                <p>Rule Hits: {incident.ruleHits.length}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

