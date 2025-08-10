'use client'

import React from 'react'
import { TrendingUp, Activity } from 'lucide-react'

export default function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Prophit MVP</h1>
              <p className="text-sm text-gray-400">Market Movement Tracker</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 rounded-full">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">Live</span>
            </div>
            
            <div className="text-sm text-gray-400">
              Tracking Polymarket
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
