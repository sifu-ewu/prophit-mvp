import axios from 'axios'
import crypto from 'crypto'

// Polymarket API configuration
const CLOB_BASE_URL = 'https://clob.polymarket.com'
const GAMMA_BASE_URL = 'https://gamma-api.polymarket.com'
const STRAPI_BASE_URL = 'https://strapi-matic.poly.market'

// Types for Polymarket API responses
export interface PolymarketMarket {
  id: string
  condition_id: string
  question: string
  description?: string
  market_slug?: string
  end_date_iso?: string
  category?: string
  volume?: string
  volume_24hr?: string
  liquidity?: string
  outcome_prices?: number[]
  outcomes?: string[]
  tokens?: Array<{
    token_id: string
    outcome: string
    price?: number
    winner?: boolean
  }>
  active: boolean
  closed: boolean
  accepting_orders?: boolean
  minimum_order_size?: number
  minimum_tick_size?: number
  // Additional fields from CLOB API
  neg_risk?: boolean
  fee_rate_bps?: string
  maker_base_fee?: number
  taker_base_fee?: number
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
  private privateKey: string

  constructor() {
    this.apiKey = process.env.POLYMARKET_API_KEY?.replace(/"/g, '') || ''
    this.secret = process.env.POLYMARKET_SECRET?.replace(/"/g, '') || ''
    this.passphrase = process.env.POLYMARKET_PASSPHRASE?.replace(/"/g, '') || ''
    this.privateKey = process.env.POLYMARKET_PRIVATE_KEY?.replace(/"/g, '') || ''
  }

  /**
   * Create authentication headers for CLOB API
   */
  private createAuthHeaders(method: string, path: string, body?: any): Record<string, string> {
    const timestamp = Date.now().toString()
    const bodyStr = body ? JSON.stringify(body) : ''
    
    // Create the message to sign
    const message = timestamp + method.toUpperCase() + path + bodyStr
    
    // Create signature using HMAC SHA256
    const signature = crypto
      .createHmac('sha256', Buffer.from(this.secret, 'base64'))
      .update(message)
      .digest('base64')
    
    return {
      'POLY-API-KEY': this.apiKey,
      'POLY-SIGNATURE': signature,
      'POLY-TIMESTAMP': timestamp,
      'POLY-PASSPHRASE': this.passphrase,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }

  /**
   * Get all active markets from Polymarket
   */
  async getActiveMarkets(): Promise<PolymarketMarket[]> {
    try {
      // Try to get real data from Polymarket
      console.log('Attempting to fetch real Polymarket data...')
      
      // First try the Strapi API which has market metadata
      const strapiResponse = await axios.get(`${STRAPI_BASE_URL}/markets`, {
        params: {
          active: true,
          closed: false,
          _limit: 50,
          _sort: 'volume_num_shares:desc'
        },
        timeout: 5000
      })

      if (strapiResponse.data && Array.isArray(strapiResponse.data)) {
        console.log(`Found ${strapiResponse.data.length} markets from Strapi`)
        
        const markets = strapiResponse.data
          .filter((m: any) => m.active && !m.closed)
          .slice(0, 30) // Limit to 30 markets
          .map((m: any) => {
            // Extract current price from outcomes
            let currentPrice = 0.5
            
            if (m.outcomes && Array.isArray(m.outcomes) && m.outcomes.length > 0) {
              const yesOutcome = m.outcomes.find((o: any) => 
                o.name?.toLowerCase() === 'yes' || o.outcome?.toLowerCase() === 'yes'
              )
              if (yesOutcome && yesOutcome.price) {
                currentPrice = parseFloat(yesOutcome.price)
              } else if (m.outcomes[0].price) {
                currentPrice = parseFloat(m.outcomes[0].price)
              }
            }
            
            // Use outcomePrices if available
            if (m.outcomePrices && Array.isArray(m.outcomePrices) && m.outcomePrices.length > 0) {
              currentPrice = parseFloat(m.outcomePrices[0])
            }
            
            return {
              id: m.slug || m.id || m.condition_id,
              condition_id: m.condition_id || m.slug || m.id,
              question: m.question || m.title || m.description,
              description: m.description,
              category: m.category || 'General',
              end_date_iso: m.end_date || m.endDate,
              volume_24hr: m.volume_num_shares || m.volume || '0',
              active: true,
              closed: false,
              outcome_prices: [currentPrice],
              outcomes: m.outcomes?.map((o: any) => o.name || o.outcome) || ['Yes', 'No'],
              tokens: m.outcomes?.map((o: any, idx: number) => ({
                token_id: `${m.slug}_${idx}`,
                outcome: o.name || o.outcome || `Option ${idx}`,
                price: o.price ? parseFloat(o.price) : (idx === 0 ? currentPrice : 1 - currentPrice)
              })) || []
            }
          })
        
        if (markets.length > 0) {
          console.log(`Returning ${markets.length} real Polymarket markets`)
          return markets
        }
      }
    } catch (error: any) {
      console.error('Error fetching from Strapi:', error.message)
    }

    // Try CLOB API with authentication
    try {
      const path = '/markets'
      const headers = this.createAuthHeaders('GET', path)
      
      const response = await axios.get(`${CLOB_BASE_URL}${path}`, {
        headers,
        params: {
          next_cursor: 'MA=='
        },
        timeout: 5000
      })

      if (response.data) {
        const markets = Array.isArray(response.data) ? response.data : response.data.data || []
        console.log(`Found ${markets.length} markets from CLOB`)
        
        const activeMarkets = markets
          .filter((m: any) => m.active && !m.closed && m.accepting_orders)
          .slice(0, 30)
          .map((m: any) => this.transformClobMarket(m))
        
        if (activeMarkets.length > 0) {
          console.log(`Returning ${activeMarkets.length} real CLOB markets`)
          return activeMarkets
        }
      }
    } catch (error: any) {
      console.error('Error fetching from CLOB:', error.message)
    }

    // Fall back to sample data if real data fails
    console.log('Using sample markets as fallback')
    return this.getSampleMarkets()
    
    /* Original implementation - uncomment when API credentials are properly configured
    try {
      // Use the CLOB markets endpoint directly
      console.log('Fetching markets from CLOB API...')
      const response = await axios.get(`${CLOB_BASE_URL}/markets`, {
        params: {
          next_cursor: 'MA==', // Start from beginning
        },
        headers: {
          'Accept': 'application/json',
          // Add authentication headers here
        }
      })

      if (!response.data) {
        console.log('No data received from CLOB API')
        return this.getSampleMarkets()
      }

      const markets = Array.isArray(response.data) ? response.data : response.data.data || []
      console.log(`Received ${markets.length} markets from CLOB API`)
      
      // Filter and transform markets
      const activeMarkets = markets
        .filter((m: any) => {
          // Only include active markets that are accepting orders
          return m.active === true && m.closed !== true && m.accepting_orders === true
        })
        .slice(0, 50) // Limit to 50 markets for MVP
        .map((m: any) => {
          // Transform market data...
        })
      
      console.log(`Returning ${activeMarkets.length} active markets`)
      return activeMarkets.length > 0 ? activeMarkets : this.getSampleMarkets()
      
    } catch (error: any) {
      console.error('Error fetching markets from CLOB:', error.message)
      console.log('Using sample data for demonstration')
      return this.getSampleMarkets()
    }
    */
  }

  /**
   * Transform CLOB market data to our format
   */
  private transformClobMarket(market: any): PolymarketMarket {
    let currentPrice = 0.5
    
    if (market.tokens && Array.isArray(market.tokens) && market.tokens.length > 0) {
      const yesToken = market.tokens.find((t: any) => 
        t.outcome?.toLowerCase() === 'yes'
      )
      
      if (yesToken && yesToken.price !== undefined) {
        currentPrice = parseFloat(yesToken.price)
      } else if (market.tokens[0].price !== undefined) {
        currentPrice = parseFloat(market.tokens[0].price)
      }
    }
    
    return {
      id: market.condition_id || market.id,
      condition_id: market.condition_id || market.id,
      question: market.question || market.title || 'Unknown Market',
      description: market.description,
      category: market.category,
      end_date_iso: market.end_date_iso,
      volume_24hr: market.volume || market.volume_24hr || '0',
      active: true,
      closed: false,
      tokens: market.tokens || [],
      outcome_prices: [currentPrice],
      outcomes: market.outcomes || (market.tokens?.map((t: any) => t.outcome) || ['Yes', 'No']),
      minimum_order_size: market.minimum_order_size,
      minimum_tick_size: market.minimum_tick_size,
      neg_risk: market.neg_risk,
      maker_base_fee: market.maker_base_fee,
      taker_base_fee: market.taker_base_fee
    }
  }

  /**
   * Generate sample markets for testing/demonstration
   */
  private getSampleMarkets(): PolymarketMarket[] {
    const sampleMarkets = [
      {
        id: 'sample_btc_100k',
        condition_id: 'sample_btc_100k',
        question: 'Will Bitcoin reach $100,000 by end of 2025?',
        category: 'Crypto',
        active: true,
        closed: false,
        volume_24hr: '250000',
        outcome_prices: [0.65],
        outcomes: ['Yes', 'No'],
        tokens: [
          { token_id: 'btc_yes', outcome: 'Yes', price: 0.65 },
          { token_id: 'btc_no', outcome: 'No', price: 0.35 }
        ]
      },
      {
        id: 'sample_trump_2024',
        condition_id: 'sample_trump_2024',
        question: 'Will Donald Trump win the 2024 Presidential Election?',
        category: 'Politics',
        active: true,
        closed: false,
        volume_24hr: '1500000',
        outcome_prices: [0.48],
        outcomes: ['Yes', 'No'],
        tokens: [
          { token_id: 'trump_yes', outcome: 'Yes', price: 0.48 },
          { token_id: 'trump_no', outcome: 'No', price: 0.52 }
        ]
      },
      {
        id: 'sample_fed_rates',
        condition_id: 'sample_fed_rates',
        question: 'Will the Fed cut rates in Q1 2025?',
        category: 'Economics',
        active: true,
        closed: false,
        volume_24hr: '500000',
        outcome_prices: [0.72],
        outcomes: ['Yes', 'No'],
        tokens: [
          { token_id: 'fed_yes', outcome: 'Yes', price: 0.72 },
          { token_id: 'fed_no', outcome: 'No', price: 0.28 }
        ]
      },
      {
        id: 'sample_ai_agi',
        condition_id: 'sample_ai_agi',
        question: 'Will AGI be achieved before 2030?',
        category: 'Technology',
        active: true,
        closed: false,
        volume_24hr: '150000',
        outcome_prices: [0.35],
        outcomes: ['Yes', 'No'],
        tokens: [
          { token_id: 'agi_yes', outcome: 'Yes', price: 0.35 },
          { token_id: 'agi_no', outcome: 'No', price: 0.65 }
        ]
      },
      {
        id: 'sample_eth_flip',
        condition_id: 'sample_eth_flip',
        question: 'Will Ethereum market cap exceed Bitcoin in 2025?',
        category: 'Crypto',
        active: true,
        closed: false,
        volume_24hr: '80000',
        outcome_prices: [0.22],
        outcomes: ['Yes', 'No'],
        tokens: [
          { token_id: 'eth_yes', outcome: 'Yes', price: 0.22 },
          { token_id: 'eth_no', outcome: 'No', price: 0.78 }
        ]
      }
    ]

    // Add some randomness to prices to simulate movement
    return sampleMarkets.map(market => {
      const randomChange = (Math.random() - 0.5) * 0.1 // ±5% change
      const newPrice = Math.max(0.01, Math.min(0.99, market.outcome_prices[0] + randomChange))
      
      return {
        ...market,
        outcome_prices: [newPrice],
        tokens: [
          { ...market.tokens![0], price: newPrice },
          { ...market.tokens![1], price: 1 - newPrice }
        ]
      }
    })
  }

  /**
   * Get specific market by ID
   */
  async getMarket(marketId: string): Promise<PolymarketMarket | null> {
    try {
      // Check if it's a sample market
      if (marketId.startsWith('sample_')) {
        return this.getSampleMarkets().find(m => m.id === marketId) || null
      }
      
      const response = await axios.get(`${CLOB_BASE_URL}/markets/${marketId}`)
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
   * Calculate probability from price or token data
   */
  static calculateProbability(market: PolymarketMarket): number {
    // Try to get price from tokens (CLOB format)
    if (market.tokens && market.tokens.length > 0) {
      // For binary markets, use the "Yes" token price
      const yesToken = market.tokens.find(t => 
        t.outcome && t.outcome.toLowerCase() === 'yes'
      )
      if (yesToken && yesToken.price !== undefined && yesToken.price !== null) {
        return yesToken.price
      }
      // If no yes token, use first token
      if (market.tokens[0] && market.tokens[0].price !== undefined && market.tokens[0].price !== null) {
        return market.tokens[0].price
      }
    }
    
    // Fallback to outcome_prices if available
    if (market.outcome_prices && market.outcome_prices.length > 0) {
      const price = market.outcome_prices[0]
      // Check if price is already in probability format (0-1) or needs conversion
      if (price > 1) {
        return price / 100
      }
      return price
    }
    
    // Default to 50% if no price data available
    return 0.5
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
