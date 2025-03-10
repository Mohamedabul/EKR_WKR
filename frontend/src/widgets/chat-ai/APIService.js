import axios from "axios";
import config from "../../config";

const CancelToken = axios.CancelToken;

// Export constants for testing
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000; // 1 second
export const API_TIMEOUT = 300000; // 30 seconds
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error occurred. Please check your connection.",
  INVALID_REQUEST: "Invalid request. Please check your input.",
  SERVER_ERROR: "Server error occurred. Please try again later.",
  TIMEOUT_ERROR: "Request timed out. Please try again.",
  RATE_LIMIT: "Rate limit exceeded. Please try again later.",
  VALIDATION_ERROR: "Invalid input data provided.",
};

/**
 * ResponseTransformer class for standardizing API responses
 */
export class ResponseTransformer {
  /**
   * Transforms a raw API response into a standardized format
   * @param {Object} response - The raw API response
   * @param {boolean} isStreaming - Whether this is a streaming response
   * @returns {Object} Standardized response object
   */
  static transformResponse(response, isStreaming = false) {
    if (!response) {
      throw new Error(ERROR_MESSAGES.SERVER_ERROR);
    }

    if (isStreaming) {
      return this.transformStreamingResponse(response);
    }

    return {
      type: "completion",
      content: response.response || "",
      timestamp: response.response_timestamp || Date.now(),
      metadata: {
        queryTimestamp: response.query_timestamp,
      },
    };
  }

  /**
   * Transforms a streaming response chunk
   * @param {Object} chunk - The streaming response chunk
   * @returns {Object} Standardized streaming response object
   */
  static transformStreamingResponse(chunk) {
    if (chunk.done) {
      return {
        type: "stream",
        done: true,
        timestamp: Date.now(),
      };
    }

    return {
      type: "stream",
      content: chunk.content || "",
      done: false,
      timestamp: Date.now(),
    };
  }

  /**
   * Transforms an error into a standardized format
   * @param {Error} error - The error to transform
   * @returns {Object} Standardized error object
   */
  static transformError(error) {
    const baseError = {
      type: "error",
      timestamp: Date.now(),
      code: "UNKNOWN_ERROR",
    };

    if (axios.isCancel(error)) {
      return {
        ...baseError,
        message: "Request was cancelled",
        code: "REQUEST_CANCELLED",
      };
    }

    if (error.response) {
      const statusCode = error.response.status;
      switch (statusCode) {
        case 429:
          return {
            ...baseError,
            message: ERROR_MESSAGES.RATE_LIMIT,
            code: "RATE_LIMIT_EXCEEDED",
            status: statusCode,
          };
        case 400:
          return {
            ...baseError,
            message: ERROR_MESSAGES.INVALID_REQUEST,
            code: "INVALID_REQUEST",
            status: statusCode,
          };
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            ...baseError,
            message: ERROR_MESSAGES.SERVER_ERROR,
            code: "SERVER_ERROR",
            status: statusCode,
          };
      }
    }

    if (error.code === "ECONNABORTED") {
      return {
        ...baseError,
        message: ERROR_MESSAGES.TIMEOUT_ERROR,
        code: "TIMEOUT",
      };
    }

    return {
      ...baseError,
      message: error.message || ERROR_MESSAGES.NETWORK_ERROR,
      code: error.code || "NETWORK_ERROR",
    };
  }

  /**
   * Validates and sanitizes the response data
   * @param {Object} data - The response data to validate
   * @returns {boolean} True if the response is valid
   */
  static validateResponse(data) {
    if (!data) return false;
    if (data.type === "stream") {
      return (
        typeof data.done === "boolean" &&
        (data.done === true || typeof data.content === "string")
      );
    }
    return (
      data.type === "completion" &&
      typeof data.content === "string" &&
      data.content.length > 0
    );
  }
}

/**
 * TokenBucket implementation for rate limiting
 */
export class TokenBucket {
  constructor(capacity = 60, refillRate = 1) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  /**
   * Refills the token bucket based on elapsed time
   * @private
   */
  refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Attempts to consume a token
   * @returns {boolean} True if a token was consumed, false otherwise
   */
  tryConsume() {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}

/**
 * RequestQueue implementation for managing API requests
 */
export class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  /**
   * Adds a request to the queue
   * @param {Function} request - The request function to execute
   * @param {Object} options - Request options including priority
   * @returns {Promise} Promise that resolves with the request result
   */
  enqueue(request, options = { priority: 0 }) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        request,
        priority: options.priority,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Sort queue by priority (higher priority first) and timestamp
      this.queue.sort(
        (a, b) => b.priority - a.priority || a.timestamp - b.timestamp
      );

      this.processQueue();
    });
  }

  /**
   * Processes the request queue
   * @private
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const { request, resolve, reject } = this.queue.shift();

      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Add delay between requests to prevent overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.processing = false;
  }
}

/**
 * LRUCache implementation with TTL support
 */
export class LRUCache {
  constructor(capacity = 100, ttl = 3600000) {
    // Default 1 hour TTL
    this.capacity = capacity;
    this.ttl = ttl;
    this.cache = new Map();
  }

  /**
   * Get a value from the cache
   * @param {string} key - The cache key
   * @returns {*} The cached value or undefined if not found/expired
   */
  get(key) {
    if (!this.cache.has(key)) return undefined;

    const item = this.cache.get(key);
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to front (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  /**
   * Set a value in the cache
   * @param {string} key - The cache key
   * @param {*} value - The value to cache
   */
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove the least recently used item (first item in map)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.clear();
  }
}

/**
 * Delay function for retry mechanism
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after the delay
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Validates the query input
 * @param {string} query - The query to validate
 * @throws {Error} If validation fails
 */
export const validateQuery = (query) => {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    throw new Error(ERROR_MESSAGES.VALIDATION_ERROR);
  }
};

/**
 * APIService class for handling OpenAI API communication
 */
class APIService {
  /**
   * Safely parses JSON string with error handling
   * @private
   * @param {string} jsonString - The JSON string to parse
   * @returns {Object|null} Parsed object or null if parsing fails
   */
  safeJSONParse(jsonString) {
    try {
      if (typeof jsonString !== "string") {
        console.warn("Invalid input type for JSON parsing:", typeof jsonString);
        return null;
      }

      // Remove any BOM and non-printable characters
      const sanitized = jsonString
        .replace(/^\uFEFF/, "")
        .replace(/[\x00-\x1F\x7F-\x9F]/g, "");

      const parsed = JSON.parse(sanitized);

      // Validate the parsed result is an object or array
      if (
        parsed === null ||
        (typeof parsed !== "object" && !Array.isArray(parsed))
      ) {
        console.warn("Invalid JSON structure:", typeof parsed);
        return null;
      }

      // Deep clean the parsed object to remove control characters
      const cleanObject = (obj) => {
        if (Array.isArray(obj)) {
          return obj.map((item) => cleanObject(item));
        } else if (typeof obj === "object" && obj !== null) {
          const cleaned = {};
          for (const [key, value] of Object.entries(obj)) {
            cleaned[key] = cleanObject(value);
          }
          return cleaned;
        } else if (typeof obj === "string") {
          return obj.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
        }
        return obj;
      };

      return cleanObject(parsed);
    } catch (e) {
      console.warn(
        "JSON parse error:",
        e.message,
        "\nInput:",
        jsonString.substring(0, 100)
      );
      return null;
    }
  }

  /**
   * Sanitizes string input to prevent XSS and ensure valid content
   * @private
   * @param {string} str - The string to sanitize
   * @returns {string} Sanitized string
   */
  sanitizeString(str) {
    if (typeof str !== "string") return "";

    return str
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
      .replace(/[\u2028\u2029]/g, " ") // Replace line/paragraph separators
      .replace(/[\uFDD0-\uFDEF\uFFFE\uFFFF]/g, "") // Remove non-characters
      .replace(/[&'"]/g, (char) => {
        // Escape special characters
        switch (char) {
          case "&":
            return "&amp;";
          case "'":
            return "&#39;";
          case '"':
            return "&quot;";
          default:
            return char;
        }
      })
      .trim(); // Remove leading/trailing whitespace
  }

  constructor(
    cacheCapacity = 100,
    cacheTTL = 3600000,
    rateLimit = 60,
    refillRate = 1
  ) {
    // Map to store pending requests
    this.pendingRequests = new Map();

    this.client = axios.create({
      baseURL: config.API_URL,
      timeout: API_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
    });
    this.cache = new LRUCache(cacheCapacity, cacheTTL);
    this.tokenBucket = new TokenBucket(rateLimit, refillRate);
    this.requestQueue = new RequestQueue();
  }

  /**
   * Generates a unique request ID
   * @private
   * @param {string} query - The query being made
   * @param {boolean} stream - Whether this is a streaming request
   * @returns {string} A unique request ID
   */
  generateRequestId(query, stream) {
    // Escape special characters in query and ensure safe string generation
    const escapedQuery = encodeURIComponent(query.substring(0, 50)); // Limit query length
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `${escapedQuery}-${stream ? "1" : "0"}-${timestamp}-${random}`;
  }

  /**
   * Cancels a specific request
   * @param {string} requestId - The ID of the request to cancel
   * @returns {boolean} True if the request was cancelled, false if it wasn't found
   */
  cancelRequest(requestId) {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.cancel("Request cancelled by user");
      this.pendingRequests.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * Cancels all pending requests
   */
  cancelAllRequests() {
    for (const [requestId, request] of this.pendingRequests) {
      request.cancel("All requests cancelled by user");
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * Makes an API request with rate limiting and queuing
   * @private
   * @param {string} query - The query to send
   * @param {boolean} stream - Whether to use streaming response
   * @param {function} onChunk - Callback function for handling streaming chunks
   * @returns {Promise<Object>} The API response
   */
  async makeRequest(query, stream = false, onChunk = null) {
    let lastError = null;
    const requestId = this.generateRequestId(query, stream);

    // Create a cancel token source
    const cancelTokenSource = CancelToken.source();
    this.pendingRequests.set(requestId, cancelTokenSource);

    let attempt;
    try {
      for (attempt = 0; attempt < MAX_RETRIES; attempt++) {
        // Check if we can make a request
        if (!this.tokenBucket.tryConsume()) {
          throw new Error(ERROR_MESSAGES.RATE_LIMIT);
        }

        // Prepare request body with proper JSON stringification
        const requestBody = {
          //   model: "Meta-Llama-3.1-405B-Instruct",
          //   messages: [
          //     {
          //       role: "system",
          //       content:
          //         "You are a helpful assistant for medicine and medicine related problems",
          //     },
          //     { role: "user", content: this.sanitizeString(query) },
          //   ],
          // messages: [{ role: "user", content: this.sanitizeString(query) }],
          //   stream: stream,
          question: query,
        };

        // Ensure proper JSON stringification of request body
        const response = await fetch(`/api/get-response`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: query }),
          //   credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch response from the server");
        }

        const data = await response.json();
        console.log(`-----response`, data);
        return data.response;

        // Transform and validate response
        // const transformedResponse = ResponseTransformer.transformResponse(
        //   response.data,
        //   stream
        // );
        // if (!ResponseTransformer.validateResponse(transformedResponse)) {
        //   throw new Error(ERROR_MESSAGES.SERVER_ERROR);
        // }

        // return transformedResponse;
      }
    } catch (error) {
      lastError = error;

      // Don't retry on validation errors
      if (error.message === ERROR_MESSAGES.VALIDATION_ERROR) {
        throw error;
      }

      if (attempt < MAX_RETRIES - 1) {
        // Calculate delay time based on error type
        const delayTime =
          error.message === ERROR_MESSAGES.RATE_LIMIT
            ? RETRY_DELAY * 2 * (attempt + 1)
            : RETRY_DELAY * (attempt + 1);
        await delay(delayTime);
        // continue;
      }

      // If this was the last attempt, transform and throw the error
      throw ResponseTransformer.transformError(error);
    }
  }

  async getConversation(conversationId) {
    try {
      const response = await this.client.get(`/conversation/${conversationId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  async getAllConversations() {
    try {
      // This endpoint must be implemented on your backend.
      const response = await this.client.get(`/conversations`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadFile(file, conversationId = null) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (conversationId) {
        formData.append("conversation_id", conversationId);
      }
      const response = await this.client.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async sendQuery(query, conversationId = null) {
    try {
      validateQuery(query);
      const payload = { query };
      if (conversationId) {
        payload.conversation_id = conversationId;
      }
      const response = await this.client.post("/query", payload);
      const transformedResponse = ResponseTransformer.transformResponse(
        response.data
      );
      this.cache.set(this.generateRequestId(query, false), transformedResponse);
      return transformedResponse;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async sendStreamingQuery(query, onChunk, options = { priority: 0 }) {
    try {
      validateQuery(query);

      // Streaming responses cannot be cached
      await this.requestQueue.enqueue(
        async () => this.makeRequest(query, true, onChunk),
        options
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Handles different types of errors and throws appropriate error messages
   * @param {Error} error - The error to handle
   * @throws {Error} A formatted error message
   */
  handleError(error) {
    const transformedError = ResponseTransformer.transformError(error);
    throw new Error(transformedError.message);
  }
}

export default APIService;
