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
  // Try to find the h1 in the syllabus browser or main page
  const selectors = [
    '[data-testid="syllabus-browser-content"] h1',
    'h1[class*="StyledText"]',
    'h1',
    '[class*="career-path"] h1',
    'h1[class*="title"]'
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
  // Look for the tracks accordion list in the syllabus browser
  const tracksList = document.querySelector('[data-testid="tracks-accordions-list"]');

  if (tracksList) {
    // Find all list items (modules)
    const moduleItems = tracksList.querySelectorAll('li');

    // Find the first module without a completed icon (in progress)
    for (const item of moduleItems) {
      const completedIcon = item.querySelector('[data-testid="completed-icon"]');

      if (!completedIcon) {
        // This module is in progress
        const moduleNameEl = item.querySelector('h2[class*="StyledText"]');
        if (moduleNameEl) {
          const moduleName = moduleNameEl.textContent.trim();

          // Try to find progress percentage
          const percentageMatch = item.textContent.match(/(\d+)%/);
          const progress = percentageMatch ? parseInt(percentageMatch[1]) : null;

          if (moduleName) {
            return {
              name: moduleName,
              progress: progress
            };
          }
        }
      }
    }
  }

  // Fallback: look for elements with "current" or "active" indicators
  const currentSelectors = [
    '[class*="current"] h2',
    '[class*="active"] h2',
    'button[class*="active"] h2'
  ];

  for (const selector of currentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const moduleName = element.textContent.trim();
      if (moduleName) {
        return {
          name: moduleName,
          progress: null
        };
      }
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

  // Look for the tracks accordion list in the syllabus browser
  const tracksList = document.querySelector('[data-testid="tracks-accordions-list"]');

  if (tracksList) {
    // Find all list items (modules)
    const moduleItems = tracksList.querySelectorAll('li');

    moduleItems.forEach(item => {
      // Find the module name (h2 tag)
      const moduleNameEl = item.querySelector('h2[class*="StyledText"]');
      if (moduleNameEl) {
        const name = moduleNameEl.textContent.trim();

        // Check if completed
        const hasCompletedIcon = item.querySelector('[data-testid="completed-icon"]');
        const progress = hasCompletedIcon ? 100 : null;

        // Try to find actual progress percentage if available
        const percentageMatch = item.textContent.match(/(\d+)%/);
        const actualProgress = percentageMatch ? parseInt(percentageMatch[1]) : progress;

        if (name) {
          modules.push({
            name: name,
            progress: actualProgress
          });
        }
      }
    });
  }

  // Fallback: look for all h2 elements on the page
  if (modules.length === 0) {
    const allH2s = document.querySelectorAll('h2[class*="StyledText"]');
    allH2s.forEach(h2 => {
      const name = h2.textContent.trim();
      if (name && name.length > 3) {
        modules.push({
          name: name,
          progress: null
        });
      }
    });
  }

  return modules;
}

/**
 * Extract completed modules
 * Returns array of module names that are 100% complete
 */
function extractCompletedModules() {
  const completed = [];

  // Look for the tracks accordion list in the syllabus browser
  const tracksList = document.querySelector('[data-testid="tracks-accordions-list"]');

  if (tracksList) {
    // Find all list items (modules)
    const moduleItems = tracksList.querySelectorAll('li');

    moduleItems.forEach(item => {
      // Check if this module has a completed icon
      const completedIcon = item.querySelector('[data-testid="completed-icon"]');

      if (completedIcon) {
        // Find the module name (h2 tag)
        const moduleNameEl = item.querySelector('h2[class*="StyledText"]');
        if (moduleNameEl) {
          const name = moduleNameEl.textContent.trim();
          if (name && !completed.includes(name)) {
            completed.push(name);
          }
        }
      }
    });
  }

  // Fallback: look for h2 elements with completed icons nearby
  if (completed.length === 0) {
    const allH2s = document.querySelectorAll('h2[class*="StyledText"]');
    allH2s.forEach(h2 => {
      // Check if there's a completed icon in the same parent or ancestor
      const parent = h2.closest('li, button, div[class*="module"]');
      if (parent && parent.querySelector('[data-testid="completed-icon"]')) {
        const name = h2.textContent.trim();
        if (name && !completed.includes(name)) {
          completed.push(name);
        }
      }
    });
  }

  return completed;
}

/**
 * Extract recently completed lessons
 * Looks for lesson items marked as recent or complete
 */
function extractRecentLessons() {
  const lessons = [];
  const seenLessons = new Set();

  // Strategy 1: Look inside expanded modules in the syllabus browser
  const tracksList = document.querySelector('[data-testid="tracks-accordions-list"]');
  if (tracksList) {
    // Look for expanded accordion items
    const expandedModules = tracksList.querySelectorAll('[aria-expanded="true"]');

    expandedModules.forEach(module => {
      // Find lesson items within expanded modules
      const lessonItems = module.querySelectorAll('li, [class*="lesson"]');
      lessonItems.forEach(item => {
        const hasCompletedIcon = item.querySelector('[data-testid="completed-icon"]');
        if (hasCompletedIcon) {
          // Look for lesson name in h3, h4, or span
          const lessonNameEl = item.querySelector('h3, h4, span[class*="text"], a');
          if (lessonNameEl) {
            const name = lessonNameEl.textContent.trim();
            if (name && !seenLessons.has(name) && name.length > 3 && name.length < 150) {
              lessons.push(name);
              seenLessons.add(name);
            }
          }
        }
      });
    });
  }

  // Strategy 2: Look on the main content area for lesson info
  const mainContent = document.querySelector('main, [role="main"], #main-content');
  if (mainContent && lessons.length < 5) {
    // Look for completed checkmarks or progress indicators
    const completedElements = mainContent.querySelectorAll('[data-testid="completed-icon"]');
    completedElements.forEach(icon => {
      const container = icon.closest('li, div[class*="item"], button');
      if (container) {
        const nameEl = container.querySelector('h3, h4, h5, span, a');
        if (nameEl) {
          const name = nameEl.textContent.trim();
          if (name && !seenLessons.has(name) && name.length > 3 && name.length < 150) {
            lessons.push(name);
            seenLessons.add(name);
          }
        }
      }
    });
  }

  // Strategy 3: Get lesson titles from h3/h4 tags with completed indicators nearby
  if (lessons.length < 3) {
    const headings = document.querySelectorAll('h3, h4');
    headings.forEach(heading => {
      const parent = heading.closest('li, div, section');
      if (parent) {
        const hasCheck = parent.querySelector('[data-testid="completed-icon"], [class*="complete"], [class*="check"]');
        if (hasCheck) {
          const name = heading.textContent.trim();
          if (name && !seenLessons.has(name) && name.length > 3 && name.length < 150 && !name.match(/^\d+%$/)) {
            lessons.push(name);
            seenLessons.add(name);
          }
        }
      }
    });
  }

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
