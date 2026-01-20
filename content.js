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
  const allModules = extractAllModules();

  return {
    careerPath: extractCareerPath(),
    overallProgress: extractOverallProgress(),
    currentModule: extractCurrentModuleFromList(allModules),
    completedModules: extractCompletedModulesFromList(allModules),
    recentLessons: extractRecentLessons(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Extract the career path name from the page heading
 */
function extractCareerPath() {
  // Try the syllabus browser h1 first (most reliable)
  const syllabusH1 = document.querySelector('[data-testid="syllabus-browser-content"] h1');
  if (syllabusH1?.textContent?.trim()) {
    const text = syllabusH1.textContent.trim();
    if (!text.includes(':') && text.length < 50) {
      return text;
    }
  }

  // Try other h1 elements, filtering for career path keywords
  const allH1s = document.querySelectorAll('h1');
  for (const h1 of allH1s) {
    const text = h1.textContent.trim();
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
 * Extract overall progress percentage from progress indicators
 */
function extractOverallProgress() {
  const percentageRegex = /(\d+)%/;
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
 * Extract current module (first incomplete module after completed ones)
 */
function extractCurrentModuleFromList(allModules) {
  for (const module of allModules) {
    const isWelcomeModule = module.name.toLowerCase().includes('welcome to');

    // Return first non-welcome, non-completed module
    if (!isWelcomeModule && !module.isCompleted) {
      return {
        name: module.name,
        progress: module.progress
      };
    }
  }

  return null;
}

/**
 * Extract all modules from the syllabus sidebar
 */
function extractAllModules() {
  const modules = [];
  const tracksList = document.querySelector('[data-testid="tracks-accordions-list"]');

  if (tracksList) {
    const moduleItems = tracksList.querySelectorAll(':scope > li');

    moduleItems.forEach((item) => {
      const moduleNameEl = item.querySelector('h2');

      if (moduleNameEl) {
        const name = moduleNameEl.textContent.trim();
        const isCompleted = checkModuleCompleted(item);

        // Extract progress percentage if present
        const percentageMatch = item.textContent.match(/(\d+)%/);
        const progress = isCompleted ? 100 : (percentageMatch ? parseInt(percentageMatch[1]) : null);

        if (name && name.length > 2) {
          modules.push({
            name,
            progress,
            isCompleted
          });
        }
      }
    });
  }

  // Fallback: look for h2 elements in syllabus area
  if (modules.length === 0) {
    const syllabusContent = document.querySelector('[data-testid="syllabus-browser-content"]');
    if (syllabusContent) {
      syllabusContent.querySelectorAll('h2').forEach(h2 => {
        const name = h2.textContent.trim();
        if (name && name.length > 3) {
          modules.push({ name, progress: null, isCompleted: false });
        }
      });
    }
  }

  return modules;
}

/**
 * Check if a module is completed by looking for the CheckFilledIcon SVG
 */
function checkModuleCompleted(moduleElement) {
  // Primary method: Look for CheckFilledIcon in SVG mask (Codecademy's completed checkmark)
  const svgs = moduleElement.querySelectorAll('svg');
  for (const svg of svgs) {
    // Check mask IDs
    const masks = svg.querySelectorAll('mask');
    for (const mask of masks) {
      if (mask.id?.includes('CheckFilledIcon')) {
        return true;
      }
    }
    // Fallback: check SVG innerHTML
    if (svg.innerHTML.includes('CheckFilledIcon')) {
      return true;
    }
  }

  // Secondary: Check for completed-icon data-testid
  if (moduleElement.querySelector('[data-testid="completed-icon"]')) {
    return true;
  }

  // Tertiary: Check for "100%" text
  if (moduleElement.textContent?.includes('100%')) {
    return true;
  }

  return false;
}

/**
 * Extract completed modules from the modules list
 */
function extractCompletedModulesFromList(allModules) {
  return allModules
    .filter(module => module.isCompleted && !module.name.toLowerCase().includes('welcome to'))
    .map(module => module.name);
}

/**
 * Extract recently completed lessons from expanded modules
 */
function extractRecentLessons() {
  const lessons = [];
  const seenLessons = new Set();

  // Look inside expanded modules in the syllabus browser
  const tracksList = document.querySelector('[data-testid="tracks-accordions-list"]');
  if (tracksList) {
    const expandedModules = tracksList.querySelectorAll('[aria-expanded="true"]');

    expandedModules.forEach(module => {
      const lessonItems = module.querySelectorAll('li, [class*="lesson"]');
      lessonItems.forEach(item => {
        // Check for completed lessons using CheckFilledIcon or completed-icon
        const hasCompletedIcon = item.querySelector('[data-testid="completed-icon"]') ||
                                  item.querySelector('svg')?.innerHTML.includes('CheckFilledIcon');

        if (hasCompletedIcon) {
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

  return lessons.slice(0, 10);
}

// Auto-extract on page load and cache in chrome.storage
window.addEventListener('load', () => {
  setTimeout(() => {
    const data = extractCodecademyProgress();
    chrome.storage.local.set({ cachedProgress: data });
  }, 2000);
});
