// Shared utility functions for Codecademy Progress Tracker

// Logging configuration
const LOG_PREFIX = '[Codecademy Tracker]';
const DEBUG_MODE = false; // Set to true for verbose logging

/**
 * Logging utility for consistent error/debug messages
 */
const logger = {
  error: (message, error = null) => {
    console.error(`${LOG_PREFIX} ERROR:`, message, error || '');
  },
  warn: (message) => {
    console.warn(`${LOG_PREFIX} WARNING:`, message);
  },
  info: (message) => {
    console.info(`${LOG_PREFIX}`, message);
  },
  debug: (message, data = null) => {
    if (DEBUG_MODE) {
      console.log(`${LOG_PREFIX} DEBUG:`, message, data || '');
    }
  }
};

/**
 * Parse career path base URL from any Codecademy URL
 * Extracts the base journey/path URL, stripping away tracks/modules/lessons
 * @param {string} url - The full Codecademy URL
 * @returns {string|null} The base career path URL or null if not parseable
 */
function parseCareerPathUrl(url) {
  // Match pattern: /journeys/{name}/paths/{name}
  const journeyMatch = url.match(/^(https:\/\/www\.codecademy\.com\/journeys\/[^\/]+\/paths\/[^\/]+)/);
  if (journeyMatch) {
    return journeyMatch[1];
  }

  // Match pattern: /journeys/{name}
  const journeyOnlyMatch = url.match(/^(https:\/\/www\.codecademy\.com\/journeys\/[^\/]+)/);
  if (journeyOnlyMatch) {
    return journeyOnlyMatch[1];
  }

  return null;
}

/**
 * Async delay helper
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after the delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Try multiple selectors until one returns a result
 * @param {string[]} selectors - Array of CSS selectors to try
 * @param {function} [extractor] - Optional function to extract value from element
 * @returns {*} The first successful result or null
 */
function trySelectors(selectors, extractor = null) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return extractor ? extractor(element) : element;
    }
  }
  return null;
}

/**
 * Try multiple selectors and return all matching elements
 * @param {string[]} selectors - Array of CSS selectors to try
 * @returns {Element[]} Array of all matching elements
 */
function trySelectorsAll(selectors) {
  const results = [];
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      results.push(...elements);
    }
  }
  return results;
}
