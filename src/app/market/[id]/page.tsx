'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clock, TrendingUp, Calendar, Volume } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MarketDetails, ApiResponse, MarketPriceHistory } from '@/types'
import { 
  formatPercentage, 
  formatProbability, 
  formatDateTime, 
  formatDate,
  getMovementColor 
} from '@/lib/utils'

export default function MarketPage() {
  const params = useParams()
  const router = useRouter()
  const [market, setMarket] = useState<MarketDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h')

  const marketId = params.id as string

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        setError(null)
        setLoading(true)
        
        const response = await fetch(`/api/markets/${marketId}`)
        const result: ApiResponse<MarketDetails> = await response.json()
        
        if (result.success && result.data) {
          setMarket(result.data)
        } else {
          setError(result.error || 'Market not found')
        }
      } catch (err) {
        setError('Failed to load market data')
      } finally {
        setLoading(false)
      }
    }

    if (marketId) {
      fetchMarket()
    }
  }, [marketId])

  // Filter price history based on time range
  const getFilteredPriceHistory = (priceHistory: MarketPriceHistory[]) => {
    const now = new Date()
    let cutoffTime: Date

    switch (timeRange) {
      case '1h':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '6h':
        cutoffTime = new Date(now.getTime() - 6 * 60 * 60 * 1000)
        break
      case '24h':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      default:
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    return priceHistory
      .filter(point => new Date(point.timestamp) >= cutoffTime)
      .map(point => ({
        timestamp: new Date(point.timestamp).getTime(),
        probability: point.probability * 100, // Convert to percentage
        time: formatDateTime(point.timestamp)
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span>Loading market data...</span>
        </div>
      </div>
    )
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">{error || 'Market not found'}</div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Back to Markets
          </button>
        </div>
      </div>
    )
  }

  const chartData = getFilteredPriceHistory(market.priceHistories)
  const currentProbability = market.priceHistories[0]?.probability || 0
  const latestMovement = market.movements[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-300" />
              <span className="text-gray-300">Back to Feed</span>
            </button>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-2">
                {market.question}
              </h1>
              {market.description && (
                <p className="text-gray-400">{market.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Chart */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Price History</h2>
                  
                  <div className="flex items-center space-x-2">
                    {(['1h', '6h', '24h', '7d'] as const).map((range) => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          timeRange === range
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                {chartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="timestamp"
                          type="number"
                          scale="time"
                          domain={['dataMin', 'dataMax']}
                          tickFormatter={(value) => new Date(value).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                          stroke="#9CA3AF"
                        />
                        <YAxis 
                          domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                          stroke="#9CA3AF"
                        />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleString()}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Probability']}
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="probability" 
                          stroke="#3B82F6" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-gray-400">
                    No price data available for this time range
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Current Stats */}
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Current Status</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Current Probability</div>
                    <div className="text-2xl font-bold text-white">
                      {formatProbability(currentProbability)}
                    </div>
                  </div>

                  {latestMovement && (
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Latest Change</div>
                      <div className={`text-lg font-semibold ${getMovementColor(latestMovement.changePercent)}`}>
                        {formatPercentage(latestMovement.changePercent)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateTime(latestMovement.createdAt)}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-800">
                    <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>End Date</span>
                    </div>
                    <div className="text-white">
                      {market.endDate ? formatDate(market.endDate) : 'Not specified'}
                    </div>
                  </div>

                  {market.volume && (
                    <div>
                      <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                        <Volume className="w-4 h-4" />
                        <span>24h Volume</span>
                      </div>
                      <div className="text-white">
                        ${market.volume.toLocaleString()}
                      </div>
                    </div>
                  )}

                  {market.category && (
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Category</div>
                      <span className="px-2 py-1 bg-gray-800 rounded text-sm text-gray-300">
                        {market.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Movements */}
              {market.movements.length > 0 && (
                <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Movements</h3>
                  
                  <div className="space-y-3">
                    {market.movements.slice(0, 5).map((movement) => (
                      <div 
                        key={movement.id}
                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                      >
                        <div>
                          <div className={`font-semibold ${getMovementColor(movement.changePercent)}`}>
                            {formatPercentage(movement.changePercent)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatDateTime(movement.createdAt)}
                          </div>
                        </div>
                        <span className={`
                          px-2 py-1 rounded text-xs font-medium uppercase tracking-wide
                          ${movement.significance === 'major' ? 'bg-red-500/20 text-red-300' :
                            movement.significance === 'moderate' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-blue-500/20 text-blue-300'}
                        `}>
                          {movement.significance}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
