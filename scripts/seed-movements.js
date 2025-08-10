const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function seedMovements() {
  try {
    console.log('Seeding database with sample market data and movements...\n');
    
    // Sample markets with movements
    const markets = [
      {
        id: 'sample_btc_100k',
        question: 'Will Bitcoin reach $100,000 by end of 2025?',
        category: 'Crypto',
        initialPrice: 0.45,
        currentPrice: 0.65,
        change: 44.4 // 44.4% increase
      },
      {
        id: 'sample_trump_2024', 
        question: 'Will Donald Trump win the 2024 Presidential Election?',
        category: 'Politics',
        initialPrice: 0.55,
        currentPrice: 0.48,
        change: -12.7 // 12.7% decrease
      },
      {
        id: 'sample_fed_rates',
        question: 'Will the Fed cut rates in Q1 2025?',
        category: 'Economics',
        initialPrice: 0.60,
        currentPrice: 0.72,
        change: 20.0 // 20% increase
      },
      {
        id: 'sample_ai_agi',
        question: 'Will AGI be achieved before 2030?',
        category: 'Technology',
        initialPrice: 0.30,
        currentPrice: 0.42,
        change: 40.0 // 40% increase (major movement)
      },
      {
        id: 'sample_eth_flip',
        question: 'Will Ethereum market cap exceed Bitcoin in 2025?',
        category: 'Crypto',
        initialPrice: 0.18,
        currentPrice: 0.22,
        change: 22.2 // 22.2% increase
      }
    ];
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    for (const market of markets) {
      // Create or update market
      await prisma.market.upsert({
        where: { id: market.id },
        update: {
          question: market.question,
          category: market.category,
          active: true,
          volume: Math.random() * 1000000,
          updatedAt: now
        },
        create: {
          id: market.id,
          question: market.question,
          category: market.category,
          active: true,
          volume: Math.random() * 1000000
        }
      });
      
      // Create price history
      const pricePoints = [
        { probability: market.initialPrice, timestamp: oneDayAgo },
        { probability: market.initialPrice + (market.currentPrice - market.initialPrice) * 0.2, timestamp: sixHoursAgo },
        { probability: market.initialPrice + (market.currentPrice - market.initialPrice) * 0.5, timestamp: twoHoursAgo },
        { probability: market.initialPrice + (market.currentPrice - market.initialPrice) * 0.8, timestamp: oneHourAgo },
        { probability: market.currentPrice, timestamp: now }
      ];
      
      for (const point of pricePoints) {
        await prisma.marketPriceHistory.create({
          data: {
            marketId: market.id,
            probability: point.probability,
            volume: Math.random() * 100000,
            timestamp: point.timestamp
          }
        });
      }
      
      // Determine significance based on change percentage
      let significance = 'minor';
      const absChange = Math.abs(market.change);
      if (absChange >= 25) {
        significance = 'major';
      } else if (absChange >= 15) {
        significance = 'moderate';
      }
      
      // Create movement record
      await prisma.marketMovement.create({
        data: {
          marketId: market.id,
          startPrice: market.initialPrice,
          endPrice: market.currentPrice,
          changePercent: market.change,
          startTime: oneDayAgo,
          endTime: now,
          significance,
          createdAt: new Date(now.getTime() - Math.random() * 2 * 60 * 60 * 1000) // Random time in last 2 hours
        }
      });
      
      console.log(`✓ Created ${significance} movement for ${market.question}: ${market.change.toFixed(1)}%`);
    }
    
    // Add some extra recent movements for variety
    const recentMovements = [
      {
        marketId: 'sample_btc_100k',
        change: -8.5,
        time: new Date(now.getTime() - 30 * 60 * 1000) // 30 minutes ago
      },
      {
        marketId: 'sample_fed_rates',
        change: 11.2,
        time: new Date(now.getTime() - 45 * 60 * 1000) // 45 minutes ago
      }
    ];
    
    for (const movement of recentMovements) {
      const market = await prisma.market.findUnique({ where: { id: movement.marketId } });
      if (market) {
        const lastPrice = await prisma.marketPriceHistory.findFirst({
          where: { marketId: movement.marketId },
          orderBy: { timestamp: 'desc' }
        });
        
        if (lastPrice) {
          const startPrice = lastPrice.probability;
          const endPrice = startPrice * (1 + movement.change / 100);
          
          await prisma.marketMovement.create({
            data: {
              marketId: movement.marketId,
              startPrice,
              endPrice,
              changePercent: movement.change,
              startTime: new Date(movement.time.getTime() - 60 * 60 * 1000),
              endTime: movement.time,
              significance: Math.abs(movement.change) >= 10 ? 'minor' : 'minor',
              createdAt: movement.time
            }
          });
          
          console.log(`✓ Added recent movement for ${market.question}: ${movement.change.toFixed(1)}%`);
        }
      }
    }
    
    // Summary
    const totalMarkets = await prisma.market.count();
    const totalMovements = await prisma.marketMovement.count();
    const totalHistory = await prisma.marketPriceHistory.count();
    
    console.log('\n=== Database Summary ===');
    console.log(`Markets: ${totalMarkets}`);
    console.log(`Movements: ${totalMovements}`);
    console.log(`Price History Points: ${totalHistory}`);
    
    // Show recent movements
    const recentMovementsList = await prisma.marketMovement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { market: true }
    });
    
    console.log('\n=== Recent Movements ===');
    recentMovementsList.forEach(m => {
      const direction = m.changePercent > 0 ? '↑' : '↓';
      console.log(`${direction} ${m.market.question}: ${m.changePercent.toFixed(1)}% (${m.significance})`);
    });
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMovements();
