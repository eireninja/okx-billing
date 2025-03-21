/**
 * @fileoverview Test script for OKX bills endpoint integration.
 * This script tests the bills endpoint functionality by fetching and analyzing
 * trading history for spot and perpetual trading pairs. It helps verify
 * proper API connectivity and data retrieval.
 */

// Load environment variables and dependencies
require('dotenv').config();
const fetch = require('node-fetch');
const crypto = require('crypto');
const { dbClient } = require('./database');

/**
 * Generate OKX API signature
 * @param {string} timestamp - Timestamp for the request
 * @param {string} method - HTTP method (e.g., 'GET', 'POST')
 * @param {string} requestPath - API request path
 * @param {string} body - Request body
 * @param {string} secretKey - OKX API secret key
 * @returns {string} Base64-encoded HMAC signature
 */
function generateSignature(timestamp, method, requestPath, body, secretKey) {
  const message = timestamp + method + requestPath + (body || '');
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

/**
 * Make OKX API request
 * @param {Object} credentials - OKX API credentials
 * @param {string} method - HTTP method (e.g., 'GET', 'POST')
 * @param {string} path - API request path
 * @param {string} body - Request body
 * @returns {Promise<Object>} API response data
 */
async function makeOkxApiRequest(credentials, method, path, body) {
  const timestamp = new Date().toISOString();
  const signature = generateSignature(timestamp, method, path, body, credentials.secretKey);
  
  const response = await fetch(`https://www.okx.com${path}`, {
    method,
    headers: {
      'OK-ACCESS-KEY': credentials.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': credentials.passphrase,
      'Content-Type': 'application/json',
    },
    body,
  });

  const data = await response.json();
  return data;
}

/**
 * Test the bills endpoint for a specific trading pair
 * @param {Object} credentials - OKX API credentials
 * @param {string} instId - Instrument ID (e.g., 'BTC-USDT')
 * @returns {Promise<void>}
 */
async function testBillsEndpoint(credentials, instId) {
  try {
    console.log(`\nChecking bills for ${instId}...`);
    
    const endpoint = `/api/v5/account/bills?instId=${instId}&limit=10`;
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
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Main test function that runs all bills endpoint tests
 * @returns {Promise<void>}
 */
async function runTests() {
  try {
    // Get API credentials from database
    const apiKeys = await dbClient.getApiKeys('OKX');
    
    if (!apiKeys) {
      throw new Error('No API keys found in database');
    }

    const credentials = {
      apiKey: apiKeys.api_key,
      secretKey: apiKeys.secret_key,
      passphrase: apiKeys.passphrase
    };

    // Test different instruments
    const instruments = [
      { id: 'BTC-USDT', type: 'spot' },
      { id: 'BTC-USDT-SWAP', type: 'USDT perpetual' },
      { id: 'BTC-USD-SWAP', type: 'inverse perpetual' }
    ];

    for (const instrument of instruments) {
      await testBillsEndpoint(credentials, instrument.id);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the tests
runTests().catch(console.error);
