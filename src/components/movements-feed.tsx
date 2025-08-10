'use client'

import React, { useState, useEffect } from 'react'
import { RefreshCw, Filter, AlertCircle } from 'lucide-react'
import { MarketMovement, ApiResponse } from '@/types'
import MovementCard from './movement-card'
import { useRouter } from 'next/navigation'

export default function MovementsFeed() {
  const [movements, setMovements] = useState<MarketMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [selectedSignificance, setSelectedSignificance] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  const router = useRouter()

  const fetchMovements = async () => {
    try {
      setError(null)
      const params = new URLSearchParams()
      
      if (selectedSignificance !== 'all') {
        params.append('significance', selectedSignificance)
      }
      
      const response = await fetch(`/api/movements?${params.toString()}`)
      const result: ApiResponse<MarketMovement[]> = await response.json()
      
      if (result.success && result.data) {
        setMovements(result.data)
        setLastUpdate(new Date())
      } else {
        setError(result.error || 'Failed to fetch movements')
      }
    } catch (err) {
      setError('Network error - please try again')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchMovements()
  }, [selectedSignificance])

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchMovements()
    }, 2 * 60 * 1000) // 2 minutes

    return () => clearInterval(interval)
  }, [autoRefresh, selectedSignificance])

  const handleRefresh = () => {
    setLoading(true)
    fetchMovements()
  }

  const handleMovementClick = (movement: MarketMovement) => {
    router.push(`/market/${movement.marketId}`)
  }

  if (loading && movements.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading market movements...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between bg-gray-900/50 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedSignificance}
              onChange={(e) => setSelectedSignificance(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Movements</option>
              <option value="major">Major (25%+)</option>
              <option value="moderate">Moderate (15%+)</option>
              <option value="minor">Minor (10%+)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-gray-800 border-gray-700"
            />
            <label htmlFor="auto-refresh" className="text-sm text-gray-400">
              Auto-refresh
            </label>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded text-white text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {/* Movements List */}
      {movements.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">
            Recent Market Movements
            <span className="ml-2 text-sm text-gray-400">
              ({movements.length} movements)
            </span>
          </h2>
          
          <div className="grid gap-4">
            {movements.map((movement) => (
              <MovementCard
                key={movement.id}
                movement={movement}
                onClick={() => handleMovementClick(movement)}
              />
            ))}
          </div>
        </div>
      ) : (
        !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">No movements found</div>
            <div className="text-gray-500 text-sm">
              {selectedSignificance !== 'all' 
                ? `No ${selectedSignificance} movements detected recently`
                : 'No significant market movements detected recently'
              }
            </div>
          </div>
        )
      )}
    </div>
  )
}
