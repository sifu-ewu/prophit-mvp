import { prisma } from './prisma'
import { polymarketApi, PolymarketAPI } from './polymarket'
import type { PolymarketMarket } from './polymarket'

export class DataCollector {
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null
  private readonly POLL_INTERVAL = 5 * 60 * 1000 // 5 minutes
  private readonly MOVEMENT_THRESHOLD = parseFloat(process.env.MOVEMENT_THRESHOLD || '10') // 10% default
  private readonly MOVEMENT_LOOKBACK_MINUTES = parseInt(process.env.MOVEMENT_LOOKBACK_MINUTES || '60') // fallback window

  /**
   * Start the data collection process
   */
  start() {
    if (this.isRunning) {
      console.log('Data collector is already running')
      return
    }

    console.log('Starting data collector...')
    this.isRunning = true
    
    // Run immediately, then on interval
    this.collectData()
    this.intervalId = setInterval(() => {
      this.collectData()
    }, this.POLL_INTERVAL)
  }

  /**
   * Stop the data collection process
   */
  stop() {
    if (!this.isRunning) return

    console.log('Stopping data collector...')
    this.isRunning = false
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Main data collection method
   */
  private async collectData() {
    try {
      console.log('Collecting market data...', new Date().toISOString())
      
      // Get active markets from Polymarket
      const markets = await polymarketApi.getActiveMarkets()
      console.log(`Found ${markets.length} active markets`)

      // Process each market
      for (const market of markets) {
        await this.processMarket(market)
      }

      console.log('Data collection completed')
    } catch (error) {
      console.error('Error during data collection:', error)
    }
  }

  /**
   * Process a single market
   */
  private async processMarket(marketData: PolymarketMarket) {
    try {
      // Store or update market info
      await this.storeMarketInfo(marketData)
      
      // Seed initial history on first encounter to enable immediate detection
      await this.seedInitialHistory(marketData.id)

      // Get current price and store price history
      const currentPrice = parseFloat(marketData.last_trade_price || '0')
      const probability = PolymarketAPI.calculateProbability(currentPrice)
      
      await this.storePriceHistory(marketData.id, probability, parseFloat(marketData.volume_24hr || '0'))
      
      // Check for significant movements
      await this.detectMovements(marketData.id, probability)
      
    } catch (error) {
      console.error(`Error processing market ${marketData.id}:`, error)
    }
  }

  /**
   * If this market has no saved history yet, backfill recent price history
   * so movement detection can work without waiting many polling cycles.
   */
  private async seedInitialHistory(marketId: string) {
    const existingCount = await prisma.marketPriceHistory.count({ where: { marketId } })
    if (existingCount > 0) return

    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000)
    try {
      const history = await polymarketApi.getMarketPriceHistory(marketId, startTime, endTime)
      if (!history || history.length === 0) return

      const data = history.map(h => ({
        marketId,
        probability: PolymarketAPI.calculateProbability(h.price),
        volume: undefined as number | undefined,
        timestamp: new Date(h.timestamp)
      }))

      // Insert in chronological order; use createMany for efficiency
      if (data.length > 0) {
        // Sort by timestamp ascending
        data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        await prisma.marketPriceHistory.createMany({ data })
      }
    } catch (err) {
      console.warn(`Backfill failed for market ${marketId}:`, err)
    }
  }

  /**
   * Store or update market information
   */
  private async storeMarketInfo(marketData: PolymarketMarket) {
    await prisma.market.upsert({
      where: { id: marketData.id },
      update: {
        question: marketData.question,
        description: marketData.description,
        category: marketData.category,
        endDate: marketData.end_date_iso ? new Date(marketData.end_date_iso) : null,
        active: marketData.active && !marketData.closed && !marketData.archived,
        volume: parseFloat(marketData.volume_24hr || '0'),
        updatedAt: new Date()
      },
      create: {
        id: marketData.id,
        question: marketData.question,
        description: marketData.description,
        category: marketData.category,
        endDate: marketData.end_date_iso ? new Date(marketData.end_date_iso) : null,
        active: marketData.active && !marketData.closed && !marketData.archived,
        volume: parseFloat(marketData.volume_24hr || '0')
      }
    })
  }

  /**
   * Store price history point
   */
  private async storePriceHistory(marketId: string, probability: number, volume: number) {
    await prisma.marketPriceHistory.create({
      data: {
        marketId,
        probability,
        volume,
        timestamp: new Date()
      }
    })
  }

  /**
   * Detect significant movements in the last 24 hours
   */
  private async detectMovements(marketId: string, currentProbability: number) {
    // Primary baseline: earliest point within the last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    let baseline = await prisma.marketPriceHistory.findFirst({
      where: {
        marketId,
        timestamp: { gte: oneDayAgo }
      },
      orderBy: { timestamp: 'asc' }
    })

    // Fallback baseline: earliest point within a shorter recent window
    if (!baseline) {
      const lookbackStart = new Date(Date.now() - this.MOVEMENT_LOOKBACK_MINUTES * 60 * 1000)
      baseline = await prisma.marketPriceHistory.findFirst({
        where: { marketId, timestamp: { gte: lookbackStart } },
        orderBy: { timestamp: 'asc' }
      })
    }

    // Final fallback: earliest known point (if we have at least one saved before now)
    if (!baseline) {
      baseline = await prisma.marketPriceHistory.findFirst({
        where: { marketId },
        orderBy: { timestamp: 'asc' }
      })
    }

    if (!baseline) {
      // No baseline yet; need more history to compare
      return
    }

    // Calculate percentage change
    const percentageChange = PolymarketAPI.calculatePercentageChange(
      baseline.probability,
      currentProbability
    )

    const absChange = Math.abs(percentageChange)

    // Determine significance level
    let significance: string
    if (absChange >= 25) {
      significance = 'major'
    } else if (absChange >= 15) {
      significance = 'moderate'
    } else if (absChange >= this.MOVEMENT_THRESHOLD) {
      significance = 'minor'
    } else {
      return // Not significant enough
    }

    // Check if we already detected this movement recently (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentMovement = await prisma.marketMovement.findFirst({
      where: {
        marketId,
        significance,
        createdAt: { gte: oneHourAgo }
      }
    })

    if (recentMovement) return // Already detected recently

    // Store the movement
    await prisma.marketMovement.create({
      data: {
        marketId,
        startPrice: baseline.probability,
        endPrice: currentProbability,
        changePercent: percentageChange,
        startTime: baseline.timestamp,
        endTime: new Date(),
        significance
      }
    })

    console.log(`🚨 ${significance.toUpperCase()} movement detected for market ${marketId}: ${percentageChange.toFixed(2)}%`)
  }

  /**
   * Get recent movements for API
   */
  static async getRecentMovements(limit = 20) {
    return await prisma.marketMovement.findMany({
      include: {
        market: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })
  }

  /**
   * Get market details with price history
   */
  static async getMarketDetails(marketId: string) {
    const market = await prisma.market.findUnique({
      where: { id: marketId },
      include: {
        priceHistories: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 1000 // Last 1000 data points
        },
        movements: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10 // Last 10 movements
        }
      }
    })

    return market
  }
}

export const dataCollector = new DataCollector()
