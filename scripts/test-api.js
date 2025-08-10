const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing Polymarket Gamma API...\n');
    
    // Test getting markets
    const response = await axios.get('https://gamma-api.polymarket.com/markets', {
      params: {
        limit: 3,
        active: true,
        archived: false,
        closed: false
      }
    });
    
    console.log('Sample Market Data:');
    console.log('==================');
    
    const markets = response.data;
    if (markets && markets.length > 0) {
      markets.forEach((market, index) => {
        console.log(`\nMarket ${index + 1}:`);
        console.log('ID:', market.id);
        console.log('Question:', market.question);
        console.log('Outcomes:', market.outcomes);
        console.log('Outcome Prices:', market.outcome_prices);
        console.log('Last Trade Price:', market.last_trade_price);
        console.log('Best Bid:', market.best_bid);
        console.log('Best Ask:', market.best_ask);
        console.log('Volume 24hr:', market.volume_24hr);
        console.log('Category:', market.category);
        
        // Calculate probability
        if (market.outcome_prices && market.outcome_prices.length > 0) {
          const price = parseFloat(market.outcome_prices[0]);
          console.log('Calculated Probability:', price, '(raw price value)');
        }
      });
    }
    
  } catch (error) {
    console.error('Error testing API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAPI();
