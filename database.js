// Load environment variables from .env file
require("dotenv").config();

const fetch = require("node-fetch");

// Hardcoded exchange name
const EXCHANGE_NAME = "OKX";

class CloudflareD1Client {
  constructor(accountId, databaseId, apiToken) {
    this.accountId = accountId;
    this.databaseId = databaseId;
    this.apiToken = apiToken;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`;
  }

  async executeQuery(sqlQuery, params = []) {
    try {
      console.log(`Executing query: ${sqlQuery}`);
      console.log(`With params: ${JSON.stringify(params)}`);

      const response = await fetch(`${this.baseUrl}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sql: sqlQuery,
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
   * Get API keys for OKX exchange
   * @returns {Object|null} API keys for OKX or null if not found
   */
  async getApiKeys() {
    console.log(`Fetching API keys for ${EXCHANGE_NAME}`);

    try {
      const data = await this.executeQuery(
        "SELECT api_key, secret_key, passphrase FROM api_keys WHERE exchange = ? LIMIT 1",
        [EXCHANGE_NAME]
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
        console.log(`Found API keys for ${EXCHANGE_NAME}`);
        return data.result[0].results[0];
      }

      console.log(`No ${EXCHANGE_NAME} API keys found in the database`);
      return null;
    } catch (error) {
      console.error(
        `Error fetching API keys for ${EXCHANGE_NAME}: ${error.message}`
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
const dbClient = new CloudflareD1Client(
  process.env.CLOUDFLARE_ACCOUNT_ID,
  process.env.CLOUDFLARE_DATABASE_ID,
  process.env.CLOUDFLARE_API_TOKEN
);

module.exports = {
  dbClient,
};
