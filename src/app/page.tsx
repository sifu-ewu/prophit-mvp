'use client'

import React, { useEffect } from 'react'
import Header from '@/components/header'
import MovementsFeed from '@/components/movements-feed'

export default function Home() {
  // Start the data collector when the app loads
  useEffect(() => {
    const startCollector = async () => {
      try {
        await fetch('/api/start-collector', { method: 'POST' })
        console.log('Data collector started')
      } catch (error) {
        console.error('Failed to start data collector:', error)
      }
    }

    startCollector()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              Market Movement Tracker
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Track significant probability changes in Polymarket and understand what moved when
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Major: 25%+ change</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Moderate: 15%+ change</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Minor: 10%+ change</span>
              </div>
            </div>
          </div>

          {/* Movements Feed */}
          <MovementsFeed />
        </div>
      </main>
    </div>
  )
}