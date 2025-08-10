export interface Market {
  id: string
  question: string
  description?: string
  category?: string
  endDate?: string
  active: boolean
  volume?: number
  createdAt: string
  updatedAt: string
}

export interface MarketPriceHistory {
  id: number
  marketId: string
  probability: number
  price?: number
  volume?: number
  timestamp: string
}

export interface MarketMovement {
  id: number
  marketId: string
  startPrice: number
  endPrice: number
  changePercent: number
  startTime: string
  endTime: string
  significance: 'minor' | 'moderate' | 'major'
  detected: boolean
  createdAt: string
  market: Market
}

export interface MarketDetails extends Market {
  priceHistories: MarketPriceHistory[]
  movements: MarketMovement[]
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  total?: number
}
