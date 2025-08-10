const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const markets = await prisma.market.count();
    const histories = await prisma.marketPriceHistory.count();
    const movements = await prisma.marketMovement.count();
    
    console.log('Database Status:');
    console.log('================');
    console.log('Markets:', markets);
    console.log('Price Histories:', histories);
    console.log('Movements:', movements);
    
    // Get sample of markets with recent data
    const marketsWithHistory = await prisma.market.findMany({
      take: 5,
      include: {
        priceHistories: {
          orderBy: { timestamp: 'desc' },
          take: 2
        }
      },
      where: {
        priceHistories: {
          some: {}
        }
      }
    });
    
    console.log('\nSample Markets with Price History:');
    console.log('===================================');
    marketsWithHistory.forEach(m => {
      console.log(`\n${m.question}`);
      if (m.priceHistories.length >= 2) {
        const latest = m.priceHistories[0];
        const prev = m.priceHistories[1];
        const change = ((latest.probability - prev.probability) / prev.probability) * 100;
        console.log(`  Latest: ${(latest.probability * 100).toFixed(2)}%`);
        console.log(`  Previous: ${(prev.probability * 100).toFixed(2)}%`);
        console.log(`  Change: ${change.toFixed(2)}%`);
      }
    });
    
    // Get recent movements
    const recentMovements = await prisma.marketMovement.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { market: true }
    });
    
    if (recentMovements.length > 0) {
      console.log('\nRecent Movements Detected:');
      console.log('==========================');
      recentMovements.forEach(m => {
        console.log(`- ${m.market.question}`);
        console.log(`  Change: ${m.changePercent.toFixed(2)}% (${m.significance})`);
        console.log(`  From: ${(m.startPrice * 100).toFixed(2)}% to ${(m.endPrice * 100).toFixed(2)}%`);
        console.log(`  Detected at: ${m.createdAt.toISOString()}`);
      });
    } else {
      console.log('\nNo movements detected yet. This is normal for the first run.');
      console.log('Movements will be detected after the next polling cycle (5 minutes).');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
