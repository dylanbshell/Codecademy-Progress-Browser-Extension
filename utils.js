// Shared utility functions for Codecademy Progress Tracker

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
