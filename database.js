/**
 * @fileoverview Cloudflare D1 database client for managing OKX API credentials.
 * This module provides a client for interacting with Cloudflare D1 database,
 * specifically for retrieving and managing user API keys and trading configurations.
 */

// Load environment variables from .env file
require("dotenv").config();

const fetch = require("node-fetch");

// Hardcoded exchange name
const EXCHANGE_NAME = "OKX";

/**
 * Client for interacting with Cloudflare D1 database
 * @class
 */
class CloudflareD1Client {
  /**
   * Create a CloudflareD1Client instance
   * @param {Object} config - Configuration object
   * @param {string} config.accountId - Cloudflare account ID
   * @param {string} config.databaseId - D1 database ID
   * @param {string} config.apiToken - Cloudflare API token
   */
  constructor(config) {
    this.accountId = config.accountId;
    this.databaseId = config.databaseId;
    this.apiToken = config.apiToken;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}`;
  }

  /**
   * Execute a SQL query on the D1 database
   * @param {string} query - SQL query to execute
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query results
   * @throws {Error} If the query fails
   */
  async executeQuery(query, params = []) {
    try {
      console.log(`Executing query: ${query}`);
      console.log(`With params: ${JSON.stringify(params)}`);

      const response = await fetch(`${this.baseUrl}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sql: query,
          params: params,
        }),
      });

      const data = await response.json();

      console.log(`Query response: ${JSON.stringify(data, null, 2)}`);

      if (!data.success) {
        throw new Error(
          `Database query failed: ${JSON.stringify(data.errors)}`
        );
      }

      return data;
    } catch (error) {
      console.error(`Database error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all API keys from the database
   * @returns {Array} Array of API keys
   */
  async getAllApiKeys() {
    console.log("Fetching all API keys");
    try {
      const data = await this.executeQuery(
        "SELECT exchange, api_key, secret_key, passphrase FROM api_keys"
      );

      // Check if the response has the expected structure
      if (
        data &&
        data.success &&
        data.result &&
        data.result[0] &&
        data.result[0].results
      ) {
        const results = data.result[0].results;
        console.log(`Found ${results.length} API keys in the database`);
        return results;
      }

      console.log("No API keys found in the database");
      return [];
    } catch (error) {
      console.error(`Error fetching API keys: ${error.message}`);
      return [];
    }
  }

  /**
   * Get API keys for a specific exchange
   * @param {string} exchange - Exchange name (e.g., 'OKX')
   * @returns {Promise<Array>} List of API keys with user information
   */
  async getApiKeys(exchange) {
    console.log(`Fetching API keys for ${exchange}`);

    try {
      const data = await this.executeQuery(
        "SELECT api_key, secret_key, passphrase FROM api_keys WHERE exchange = ? LIMIT 1",
        [exchange]
      );

      // Check if the response has the expected structure and contains results
      if (
        data &&
        data.success &&
        data.result &&
        data.result[0] &&
        data.result[0].results &&
        data.result[0].results.length > 0
      ) {
        console.log(`Found API keys for ${exchange}`);
        return data.result[0].results[0];
      }

      console.log(`No ${exchange} API keys found in the database`);
      return null;
    } catch (error) {
      console.error(
        `Error fetching API keys for ${exchange}: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Get user details for a specific API key
   * @param {string} apiKey - The API key to get user details for
   * @returns {Object|null} User details or null if not found
   */
  async getUserDetailsForApiKey(apiKey) {
    console.log(
      `Fetching user details for API key ${apiKey.substring(0, 8)}...`
    );

    try {
      const data = await this.executeQuery(
        "SELECT u.id, u.name, u.email, a.user_id, a.label FROM users u " +
          "JOIN api_keys a ON u.id = a.user_id " +
          "WHERE a.api_key = ? LIMIT 1",
        [apiKey]
      );

      // Check if the response has the expected structure and contains results
      if (
        data &&
        data.success &&
        data.result &&
        data.result[0] &&
        data.result[0].results &&
        data.result[0].results.length > 0
      ) {
        console.log(
          `Found user details for API key ${apiKey.substring(0, 8)}...`
        );
        return data.result[0].results[0];
      }

      console.log(
        `No user details found for API key ${apiKey.substring(0, 8)}...`
      );
      return null;
    } catch (error) {
      console.error(
        `Error fetching user details for API key ${apiKey.substring(
          0,
          8
        )}...: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Get all users with their API keys
   * @returns {Array} Array of users with their API keys
   */
  async getAllUsersWithApiKeys() {
    console.log("Fetching all users with their API keys");

    try {
      const data = await this.executeQuery(
        "SELECT u.id, u.name, u.email, a.id as api_key_id, a.api_key, a.secret_key, " +
          "a.passphrase, a.exchange, a.label " +
          "FROM users u JOIN api_keys a ON u.id = a.user_id " +
          "WHERE a.exchange = ?",
        [EXCHANGE_NAME]
      );

      // Check if the response has the expected structure
      if (
        data &&
        data.success &&
        data.result &&
        data.result[0] &&
        data.result[0].results
      ) {
        const results = data.result[0].results;
        console.log(`Found ${results.length} users with API keys`);
        return results;
      }

      console.log("No users with API keys found");
      return [];
    } catch (error) {
      console.error(`Error fetching users with API keys: ${error.message}`);
      return [];
    }
  }
}

// Create and export the database client instance
const dbClient = new CloudflareD1Client({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  databaseId: process.env.CLOUDFLARE_DATABASE_ID,
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
});

module.exports = {
  dbClient,
};
