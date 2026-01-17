// Content script for extracting Codecademy progress data
// This runs on Codecademy pages and extracts career path progress

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractProgress') {
    const progressData = extractCodecademyProgress();
    sendResponse({ success: true, data: progressData });
  }
  return true; // Keep message channel open for async response
});

/**
 * Main extraction function - gathers all progress data from the page
 */
function extractCodecademyProgress() {
  const data = {
    careerPath: extractCareerPath(),
    overallProgress: extractOverallProgress(),
    currentModule: extractCurrentModule(),
    completedModules: extractCompletedModules(),
    recentLessons: extractRecentLessons(),
    timestamp: new Date().toISOString()
  };

  return data;
}

/**
 * Extract the career path name
 * Looks for main heading (h1) on the page
 */
function extractCareerPath() {
  // Try multiple selectors for resilience
  const selectors = [
    'h1[class*="title"]',
    'h1[class*="heading"]',
    'h1',
    '[data-testid="career-path-title"]',
    '[class*="career-path"] h1'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element?.textContent?.trim()) {
      return element.textContent.trim();
    }
  }

  return 'Codecademy Career Path';
}

/**
 * Extract overall progress percentage
 * Looks for progress indicators, percentages in text
 */
function extractOverallProgress() {
  // Look for percentage text
  const percentageRegex = /(\d+)%/;

  // Try progress bars and percentage displays
  const selectors = [
    '[class*="progress"]',
    '[role="progressbar"]',
    '[data-testid*="progress"]',
    '[class*="completion"]'
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent || element.getAttribute('aria-valuenow') || '';
      const match = text.match(percentageRegex);
      if (match) {
        return parseInt(match[1]);
      }
    }
  }

  return null;
}

/**
 * Extract current module information
 * Looks for modules marked as in-progress
 */
function extractCurrentModule() {
  // Look for elements indicating current/in-progress status
  const selectors = [
    '[class*="in-progress"]',
    '[class*="current"]',
    '[data-testid*="current"]',
    '[class*="active"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      // Try to find module name and progress within or near this element
      const moduleNameEl = element.querySelector('h2, h3, [class*="title"]') || element;
      const moduleName = moduleNameEl.textContent.trim();

      // Look for progress percentage
      const percentageMatch = element.textContent.match(/(\d+)%/);
      const progress = percentageMatch ? parseInt(percentageMatch[1]) : null;

      if (moduleName) {
        return {
          name: moduleName,
          progress: progress
        };
      }
    }
  }

  // Fallback: look for the first module that's not 100% complete
  const allModules = extractAllModules();
  for (const module of allModules) {
    if (module.progress !== null && module.progress < 100 && module.progress > 0) {
      return module;
    }
  }

  return null;
}

/**
 * Extract all modules from the page
 * Helper function used by other extractors
 */
function extractAllModules() {
  const modules = [];

  // Look for module containers
  const moduleElements = document.querySelectorAll('[class*="module"], [class*="section"], [data-testid*="module"]');

  moduleElements.forEach(element => {
    const titleEl = element.querySelector('h2, h3, [class*="title"]');
    const title = titleEl?.textContent.trim();

    if (title) {
      const percentageMatch = element.textContent.match(/(\d+)%/);
      const progress = percentageMatch ? parseInt(percentageMatch[1]) : null;

      modules.push({
        name: title,
        progress: progress
      });
    }
  });

  return modules;
}

/**
 * Extract completed modules
 * Returns array of module names that are 100% complete
 */
function extractCompletedModules() {
  const completed = [];
  const allModules = extractAllModules();

  // Filter for 100% complete modules
  for (const module of allModules) {
    if (module.progress === 100) {
      completed.push(module.name);
    }
  }

  // Also look for elements specifically marked as complete
  const completeSelectors = [
    '[class*="complete"] h2',
    '[class*="complete"] h3',
    '[class*="completed"] h2',
    '[class*="completed"] h3',
    '[data-testid*="complete"] h2',
    '[data-testid*="complete"] h3'
  ];

  completeSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const name = el.textContent.trim();
      if (name && !completed.includes(name)) {
        completed.push(name);
      }
    });
  });

  return completed;
}

/**
 * Extract recently completed lessons
 * Looks for lesson items marked as recent or complete
 */
function extractRecentLessons() {
  const lessons = [];

  // Look for lesson lists or items
  const lessonSelectors = [
    '[class*="lesson"]',
    '[data-testid*="lesson"]',
    '[class*="item"]',
    'li'
  ];

  const seenLessons = new Set();

  lessonSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      // Check if it's marked as complete or recent
      const isComplete = element.className.includes('complete') ||
                        element.className.includes('finished') ||
                        element.querySelector('[class*="complete"]') ||
                        element.querySelector('[class*="check"]');

      if (isComplete) {
        // Get lesson name
        const nameEl = element.querySelector('h4, h5, span, a') || element;
        const name = nameEl.textContent.trim();

        // Avoid duplicates and invalid names
        if (name &&
            !seenLessons.has(name) &&
            name.length > 3 &&
            name.length < 150 &&
            !name.match(/^\d+%$/)) { // Avoid percentage-only text
          lessons.push(name);
          seenLessons.add(name);
        }
      }
    });
  });

  // Limit to most recent 10 lessons
  return lessons.slice(0, 10);
}

// Auto-extract on page load and store in chrome.storage
window.addEventListener('load', () => {
  setTimeout(() => {
    const data = extractCodecademyProgress();
    chrome.storage.local.set({ cachedProgress: data });
  }, 2000); // Wait 2 seconds for dynamic content to load
});
