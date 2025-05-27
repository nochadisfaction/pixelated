import React, { useState } from 'react'
import RecommendationDisplay from './RecommendationDisplay'
import type { TreatmentRecommendation } from '../../lib/ai/services/RecommendationService'

interface TreatmentPlannerProps {
  pageTitle: string
  pageDescription: string
}

export default function TreatmentPlanner({
  pageTitle,
  pageDescription,
}: TreatmentPlannerProps) {
  const [clientId, setClientId] = useState('')
  const [indications, setIndications] = useState('')
  const [recommendations, setRecommendations] = useState<
    TreatmentRecommendation[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  async function fetchRecommendationsHandler(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setRecommendations([])
    try {
      if (!clientId || !indications) {
        setError('Client ID and at least one indication are required.')
        setLoading(false)
        return
      }
      const res = await fetch('/api/ai/recommendations/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          indications: indications
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          includePersonalization: true,
          includeEfficacyStats: true,
          includeAlternativeApproaches: true,
          maxMediaRecommendations: 3,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to fetch recommendations')
        setLoading(false)
        return
      }
      setRecommendations(data.data.recommendations || [])
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredRecommendations =
    filter === 'all'
      ? recommendations
      : recommendations.filter(
          (rec: TreatmentRecommendation) => rec.priority === filter,
        )

  return (
    <>
      <h1 className="text-3xl font-bold mb-2">{pageTitle}</h1>
      <p className="text-lg text-gray-600 mb-8">{pageDescription}</p>

      <form
        className="bg-white rounded-lg shadow p-6 mb-8"
        onSubmit={fetchRecommendationsHandler}
        autoComplete="off"
      >
        <div className="mb-4">
          <label
            htmlFor="clientId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Client ID (UUID)
          </label>
          <input
            id="clientId"
            name="clientId"
            type="text"
            required
            pattern="[0-9a-fA-F-]{36}"
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="indications"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Indications (comma-separated)
          </label>
          <input
            id="indications"
            name="indications"
            type="text"
            required
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={indications}
            onChange={(e) => setIndications(e.target.value)}
            placeholder="e.g. depression, anxiety"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded transition disabled:opacity-50"
          disabled={loading}
        >
          Fetch Recommendations
        </button>
      </form>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          className={`filter-btn${filter === 'all' ? ' active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          type="button"
          className={`filter-btn${filter === 'high' ? ' active' : ''}`}
          onClick={() => setFilter('high')}
        >
          High Priority
        </button>
        <button
          type="button"
          className={`filter-btn${filter === 'medium' ? ' active' : ''}`}
          onClick={() => setFilter('medium')}
        >
          Medium
        </button>
        <button
          type="button"
          className={`filter-btn${filter === 'low' ? ' active' : ''}`}
          onClick={() => setFilter('low')}
        >
          Low
        </button>
      </div>

      {loading && (
        <div className="text-blue-600">Loading recommendations...</div>
      )}
      {error && <div className="text-red-600">{error}</div>}

      {!loading &&
        !error &&
        filteredRecommendations.length === 0 &&
        recommendations.length > 0 && (
          <p className="text-gray-600">
            No recommendations match the current filter.
          </p>
        )}
      {!loading && !error && filteredRecommendations.length > 0 && (
        <RecommendationDisplay recommendations={filteredRecommendations} />
      )}
      {!loading &&
        !error &&
        recommendations.length === 0 &&
        clientId &&
        indications && (
          <p className="text-gray-600">
            No recommendations found for the given criteria.
          </p>
        )}
    </>
  )
}
