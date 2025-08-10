'use client'

import React, { useState } from 'react'
import { ArrowUpRight, ArrowDownRight, Clock, TrendingUp } from 'lucide-react'
import { MarketMovement } from '@/types'
import { 
  formatPercentage, 
  formatProbability, 
  formatDateTime, 
  getMovementColor, 
  getMovementBgColor,
  getSignificanceBadgeColor,
  truncateText 
} from '@/lib/utils'

interface MovementCardProps {
  movement: MarketMovement
  onClick?: () => void
}

export default function MovementCard({ movement, onClick }: MovementCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isPositive = movement.changePercent > 0

  return (
    <div
      className={`
        relative p-6 rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm
        hover:bg-gray-800/50 hover:border-gray-700 transition-all duration-200 cursor-pointer
        ${isHovered ? 'scale-[1.02]' : 'scale-100'}
      `}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Significance Badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`
          px-2 py-1 rounded-full text-xs font-medium border uppercase tracking-wide
          ${getSignificanceBadgeColor(movement.significance)}
        `}>
          {movement.significance}
        </span>
        <div className="flex items-center space-x-2 text-gray-400 text-sm">
          <Clock className="w-4 h-4" />
          <span>{formatDateTime(movement.createdAt)}</span>
        </div>
      </div>

      {/* Market Question */}
      <h3 className="text-lg font-semibold text-white mb-3 leading-tight">
        {truncateText(movement.market.question, 120)}
      </h3>

      {/* Movement Details */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`
            flex items-center space-x-1 px-3 py-2 rounded-lg
            ${getMovementBgColor(movement.changePercent)}
          `}>
            {isPositive ? (
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-400" />
            )}
            <span className={`font-bold ${getMovementColor(movement.changePercent)}`}>
              {formatPercentage(movement.changePercent)}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-400">Current Odds</div>
          <div className="text-lg font-semibold text-white">
            {formatProbability(movement.endPrice)}
          </div>
        </div>
      </div>

      {/* Price Change Details */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <div>
          <span>From {formatProbability(movement.startPrice)}</span>
          <span className="mx-2">→</span>
          <span>To {formatProbability(movement.endPrice)}</span>
        </div>
        
        {movement.market.category && (
          <span className="px-2 py-1 bg-gray-800 rounded text-xs">
            {movement.market.category}
          </span>
        )}
      </div>

      {/* Hover Effect */}
      <div className={`
        absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl
        opacity-0 transition-opacity duration-200
        ${isHovered ? 'opacity-100' : 'opacity-0'}
      `} />
    </div>
  )
}
