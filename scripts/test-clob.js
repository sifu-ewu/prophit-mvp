const axios = require('axios');

async function testCLOB() {
  try {
    console.log('Testing CLOB API...\n');
    
    const response = await axios.get('https://clob.polymarket.com/markets', {
      params: {
        next_cursor: 'MA==',
      },
      headers: {
        'Accept': 'application/json',
      }
    });
    
    const markets = Array.isArray(response.data) ? response.data : response.data.data || [];
    console.log(`Total markets received: ${markets.length}`);
    
    // Check first few markets
    const sample = markets.slice(0, 3);
    sample.forEach((market, idx) => {
      console.log(`\nMarket ${idx + 1}:`);
      console.log('ID:', market.id);
      console.log('Condition ID:', market.condition_id);
      console.log('Question:', market.question);
      console.log('Active:', market.active);
      console.log('Closed:', market.closed);
      console.log('Accepting Orders:', market.accepting_orders);
      console.log('Tokens:', market.tokens?.length || 0);
      
      if (market.tokens && market.tokens.length > 0) {
        console.log('Token Details:');
        market.tokens.forEach(token => {
          console.log(`  - ${token.outcome}: price=${token.price}, token_id=${token.token_id}`);
        });
      }
    });
    
    // Count active markets
    const activeMarkets = markets.filter(m => 
      m.active === true && m.closed !== true && m.accepting_orders === true
    );
    console.log(`\nActive markets: ${activeMarkets.length}`);
    
    // Show a few active markets
    if (activeMarkets.length > 0) {
      console.log('\nSample Active Markets:');
      activeMarkets.slice(0, 3).forEach((market, idx) => {
        console.log(`${idx + 1}. ${market.question} (ID: ${market.condition_id})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCLOB();
