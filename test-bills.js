require('dotenv').config();
const fetch = require('node-fetch');
const crypto = require('crypto');

// Generate OKX API signature
function generateSignature(timestamp, method, requestPath, body, secretKey) {
  const message = timestamp + method + requestPath + (body || '');
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

// Make OKX API request
async function makeOkxApiRequest(credentials, method, path, body) {
  const timestamp = new Date().toISOString();
  const signature = generateSignature(timestamp, method, path, body, credentials.secretKey);

  const headers = {
    'OK-ACCESS-KEY': credentials.apiKey,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': credentials.passphrase,
  };

  const response = await fetch(`https://www.okx.com${path}`, {
    method,
    headers,
    body,
  });

  const data = await response.json();
  return data;
}

async function testBills() {
  try {
    // Test credentials from environment
    const credentials = {
      apiKey: process.env.API_KEY,
      secretKey: process.env.SECRET_KEY,
      passphrase: process.env.PASSPHRASE,
    };

    console.log('Testing bill retrieval...');

    // Test instruments
    const instruments = [
      { id: 'BTC-USDT', type: 'SPOT' },
      { id: 'BTC-USDT-SWAP', type: 'USDT SWAP' },
      { id: 'BTC-USD-SWAP', type: 'COIN SWAP' }
    ];

    for (const instrument of instruments) {
      console.log(`\nChecking ${instrument.type} bills for ${instrument.id}...`);
      
      const endpoint = `/api/v5/account/bills?instId=${instrument.id}&limit=10`;
      console.log(`API Request: ${endpoint}`);
      
      const bills = await makeOkxApiRequest(credentials, 'GET', endpoint);
      
      if (bills.data && bills.data.length > 0) {
        console.log(`Found ${bills.data.length} bills`);
        console.log('\nFirst bill:');
        console.log(JSON.stringify(bills.data[0], null, 2));
      } else {
        console.log('No bills found');
        console.log('Raw API response:');
        console.log(JSON.stringify(bills, null, 2));
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBills();
