import axios from 'axios'

// Polymarket API configuration
const POLYMARKET_BASE_URL = 'https://clob.polymarket.com'
const GAMMA_BASE_URL = 'https://gamma-api.polymarket.com'

// Types for Polymarket API responses
export interface PolymarketMarket {
  id: string
  question: string
  description?: string
  market_slug: string
  end_date_iso: string
  game_start_time: string
  seconds_delay: number
  fpmm: string
  maker_base_fee: string
  taker_base_fee: string
  category: string
  neg_risk: boolean
  new_base_fee: string
  new_fee_start_time: string
  volume: string
  volume_24hr: string
  liquidity: string
  outcome_prices: string[]
  outcomes: string[]
  outright_price: string
  last_trade_price: string
  best_bid: string
  best_ask: string
  spread: string
  active: boolean
  closed: boolean
  archived: boolean
  accepting_orders: boolean
  minimum_order_size: string
  minimum_tick_size: string
  maximum_orders_per_market: string
  enable_order_book: boolean
}

export interface MarketPrice {
  market_id: string
  price: number
  timestamp: string
  side?: 'buy' | 'sell'
}

export class PolymarketAPI {
  private apiKey: string
  private secret: string
  private passphrase: string

  constructor() {
    this.apiKey = process.env.POLYMARKET_API_KEY || ''
    this.secret = process.env.POLYMARKET_SECRET || ''
    this.passphrase = process.env.POLYMARKET_PASSPHRASE || ''
  }

  /**
   * Get all active markets from Polymarket
   */
  async getActiveMarkets(): Promise<PolymarketMarket[]> {
    try {
      const response = await axios.get(`${GAMMA_BASE_URL}/markets`, {
        params: {
          limit: 100,
          active: true,
          archived: false,
          closed: false
        }
      })
      
      return response.data || []
    } catch (error) {
      console.error('Error fetching active markets:', error)
      throw new Error('Failed to fetch active markets')
    }
  }

  /**
   * Get specific market by ID
   */
  async getMarket(marketId: string): Promise<PolymarketMarket | null> {
    try {
      const response = await axios.get(`${GAMMA_BASE_URL}/markets/${marketId}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching market ${marketId}:`, error)
      return null
    }
  }

  /**
   * Get market price history for a specific time range
   */
  async getMarketPriceHistory(
    marketId: string, 
    startTime?: Date, 
    endTime?: Date
  ): Promise<MarketPrice[]> {
    try {
      const params: any = {
        market: marketId
      }
      
      if (startTime) {
        params.start_ts = Math.floor(startTime.getTime() / 1000)
      }
      
      if (endTime) {
        params.end_ts = Math.floor(endTime.getTime() / 1000)
      }

      const response = await axios.get(`${GAMMA_BASE_URL}/prices-history`, {
        params
      })
      
      return response.data?.history || []
    } catch (error) {
      console.error(`Error fetching price history for market ${marketId}:`, error)
      return []
    }
  }

  /**
   * Get current market prices
   */
  async getCurrentMarketPrices(marketIds: string[]): Promise<Record<string, number>> {
    try {
      const promises = marketIds.map(async (marketId) => {
        const response = await axios.get(`${GAMMA_BASE_URL}/prices`, {
          params: { market: marketId }
        })
        return {
          marketId,
          price: response.data?.price || 0
        }
      })

      const results = await Promise.all(promises)
      const priceMap: Record<string, number> = {}
      
      results.forEach(({ marketId, price }) => {
        priceMap[marketId] = price
      })
      
      return priceMap
    } catch (error) {
      console.error('Error fetching current prices:', error)
      return {}
    }
  }

  /**
   * Calculate probability from price (assuming binary market)
   */
  static calculateProbability(price: number): number {
    // Polymarket prices are typically in cents, so divide by 100 to get probability
    return Math.max(0, Math.min(1, price / 100))
  }

  /**
   * Calculate percentage change between two probabilities
   */
  static calculatePercentageChange(oldProb: number, newProb: number): number {
    if (oldProb === 0) return newProb > 0 ? 100 : 0
    return ((newProb - oldProb) / oldProb) * 100
  }
}

export const polymarketApi = new PolymarketAPI()
