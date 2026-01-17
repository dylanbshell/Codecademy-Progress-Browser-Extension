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
  console.log('=== Starting Codecademy Progress Extraction ===');

  // Extract all modules once and cache
  const allModules = extractAllModules();

  const data = {
    careerPath: extractCareerPath(),
    overallProgress: extractOverallProgress(),
    currentModule: extractCurrentModuleFromList(allModules),
    completedModules: extractCompletedModulesFromList(allModules),
    recentLessons: extractRecentLessons(),
    timestamp: new Date().toISOString()
  };

  console.log('=== Extraction Complete ===', data);
  return data;
}

/**
 * Extract the career path name
 * Looks for main heading (h1) on the page
 */
function extractCareerPath() {
  // First, try the syllabus browser h1 (most reliable)
  const syllabusH1 = document.querySelector('[data-testid="syllabus-browser-content"] h1');
  if (syllabusH1?.textContent?.trim()) {
    const text = syllabusH1.textContent.trim();
    // Make sure it's not a lesson name (lessons usually have colons or are very long)
    if (!text.includes(':') && text.length < 50) {
      return text;
    }
  }

  // Try other h1 selectors, but filter out lesson names
  const allH1s = document.querySelectorAll('h1');
  for (const h1 of allH1s) {
    const text = h1.textContent.trim();
    // Filter: career paths are usually short, don't have colons, and contain keywords
    if (text &&
        text.length < 50 &&
        !text.includes(':') &&
        !text.includes('Installing') &&
        !text.includes('Introduction:') &&
        (text.includes('Engineer') || text.includes('Developer') || text.includes('Scientist') || text.includes('Career'))) {
      return text;
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
 * Extract current module information from the modules list
 * Looks for modules marked as in-progress
 */
function extractCurrentModuleFromList(allModules) {
  // Find the first non-completed module (skipping "Welcome to" intro)
  for (const module of allModules) {
    const isWelcomeModule = module.name.toLowerCase().includes('welcome to');
    const isCompleted = module.isCompleted;

    // Skip the welcome/intro module and completed modules
    if (!isWelcomeModule && !isCompleted) {
      console.log(`Current module identified: "${module.name}"`);
      return {
        name: module.name,
        progress: module.progress
      };
    }

    // If it's incomplete but not the welcome module, and it has some progress, it's current
    if (!isWelcomeModule && module.progress && module.progress > 0 && module.progress < 100) {
      console.log(`Current module identified (with progress): "${module.name}"`);
      return {
        name: module.name,
        progress: module.progress
      };
    }
  }

  console.log('No current module found');
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
    // Get DIRECT li children only (not nested lis)
    const moduleItems = tracksList.querySelectorAll(':scope > li');

    console.log(`Found ${moduleItems.length} module items in tracks list`);

    moduleItems.forEach((item, index) => {
      // Find the module name - h2 should be within a button or div in the li
      const moduleNameEl = item.querySelector('h2');

      if (moduleNameEl) {
        const name = moduleNameEl.textContent.trim();

        // Check if this module has a completed icon
        const hasCompletedIcon = item.querySelector('[data-testid="completed-icon"]');
        const isCompleted = hasCompletedIcon !== null;

        console.log(`Module ${index}: "${name}" - Completed: ${isCompleted}`);

        // Try to find progress percentage
        const percentageMatch = item.textContent.match(/(\d+)%/);
        const progress = isCompleted ? 100 : (percentageMatch ? parseInt(percentageMatch[1]) : null);

        if (name && name.length > 2) {
          modules.push({
            name: name,
            progress: progress,
            isCompleted: isCompleted
          });
        }
      }
    });
  }

  console.log(`Total modules extracted: ${modules.length}`);

  // Fallback: look for all h2 elements in syllabus area
  if (modules.length === 0) {
    const syllabusContent = document.querySelector('[data-testid="syllabus-browser-content"]');
    if (syllabusContent) {
      const allH2s = syllabusContent.querySelectorAll('h2');
      allH2s.forEach(h2 => {
        const name = h2.textContent.trim();
        if (name && name.length > 3) {
          modules.push({
            name: name,
            progress: null,
            isCompleted: false
          });
        }
      });
    }
  }

  return modules;
}

/**
 * Extract completed modules from the modules list
 * Returns array of module names that are 100% complete
 */
function extractCompletedModulesFromList(allModules) {
  const completed = [];

  // Filter for completed modules, excluding the intro module
  for (const module of allModules) {
    if (module.isCompleted && !module.name.toLowerCase().includes('welcome to')) {
      completed.push(module.name);
    }
  }

  console.log(`Completed modules: ${completed.length}`);
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
