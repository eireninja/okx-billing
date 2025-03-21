/**
 * @fileoverview Test script for Cloudflare D1 database connectivity.
 * This script verifies the database connection and tests the ability to
 * retrieve API keys and user information from the D1 database. It helps
 * ensure proper database configuration and data access.
 */

require('dotenv').config();
const { dbClient } = require('./database');

// Mask sensitive information for display
function maskString(str, visibleStart = 4, visibleEnd = 4) {
  if (!str) return 'null';
  if (str.length <= visibleStart + visibleEnd) {
    return '*'.repeat(str.length);
  }
  return str.substring(0, visibleStart) + 
         '*'.repeat(Math.max(0, str.length - visibleStart - visibleEnd)) + 
         str.substring(str.length - visibleEnd);
}

/**
 * Test database connectivity and API key retrieval
 * @param {string} exchange - Exchange name to test (e.g., 'OKX')
 * @returns {Promise<void>}
 */
async function testDatabase(exchange) {
    try {
        console.log(`Testing database connection for ${exchange}...`);
        
        // Test getting all users with their API keys
        console.log('\n=== TESTING getAllUsersWithApiKeys ===');
        const usersWithApiKeys = await dbClient.getAllUsersWithApiKeys();
        
        if (usersWithApiKeys && usersWithApiKeys.length > 0) {
            console.log(`Found ${usersWithApiKeys.length} users with API keys`);
            
            usersWithApiKeys.forEach((user, index) => {
                console.log(`\n--- User ${index + 1} ---`);
                console.log(`Name: ${user.name}`);
                console.log(`Email: ${user.email}`);
                console.log(`User ID: ${maskString(user.id, 0, 4)}`);
                console.log(`API Key: ${maskString(user.api_key, 8, 4)}`);
                console.log(`Secret Key: ${maskString(user.secret_key, 0, 0)}`);
                console.log(`Passphrase: ${maskString(user.passphrase, 0, 0)}`);
                console.log(`Exchange: ${user.exchange}`);
                console.log(`Label: ${user.label || 'No Label'}`);
            });
        } else {
            console.log('No users with API keys found');
        }
        
        // Test the original getAllApiKeys method
        console.log('\n=== TESTING getAllApiKeys ===');
        const allApiKeys = await dbClient.getAllApiKeys();
        
        if (allApiKeys && allApiKeys.length > 0) {
            console.log(`Found ${allApiKeys.length} API keys`);
            
            allApiKeys.forEach((apiKey, index) => {
                console.log(`\n--- API Key ${index + 1} ---`);
                console.log(`Exchange: ${apiKey.exchange}`);
                console.log(`API Key: ${maskString(apiKey.api_key, 8, 4)}`);
                console.log(`Secret Key: ${maskString(apiKey.secret_key, 0, 0)}`);
                console.log(`Passphrase: ${maskString(apiKey.passphrase, 0, 0)}`);
            });
        } else {
            console.log('No API keys found');
        }
        
        // Test the original getApiKeys method
        console.log('\n=== TESTING getApiKeys ===');
        const apiKey = await dbClient.getApiKeys();
        
        if (apiKey) {
            console.log('Found API key:');
            console.log(`API Key: ${maskString(apiKey.api_key, 8, 4)}`);
            console.log(`Secret Key: ${maskString(apiKey.secret_key, 0, 0)}`);
            console.log(`Passphrase: ${maskString(apiKey.passphrase, 0, 0)}`);
        } else {
            console.log('No API key found');
        }
        
        console.log('\nDatabase tests completed successfully');
    } catch (error) {
        console.error(`Error testing database: ${error.message}`);
    }
}

// Run the test
testDatabase().catch(console.error);
