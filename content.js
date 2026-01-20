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

  // Try to get data from React/Apollo state first
  const apolloData = extractFromApolloCache();
  if (apolloData && apolloData.completedModules && apolloData.completedModules.length > 0) {
    console.log('=== Using Apollo Cache Data ===');
    return apolloData;
  }

  // Fallback to DOM extraction
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
 * Try to extract progress data from Apollo/React state
 * Codecademy uses Apollo GraphQL which caches data in the page
 */
function extractFromApolloCache() {
  try {
    console.log('[Apollo] Attempting to extract from React/Apollo state...');

    // Method 1: Check for Apollo Client cache on window
    if (window.__APOLLO_CLIENT__) {
      console.log('[Apollo] Found window.__APOLLO_CLIENT__');
      const cache = window.__APOLLO_CLIENT__.cache;
      if (cache) {
        const extracted = cache.extract();
        console.log('[Apollo] Cache keys:', Object.keys(extracted).slice(0, 10).join(', '));
        const result = parseApolloCache(extracted);
        if (result) return result;
      }
    }

    // Method 2: Check for Apollo State
    if (window.__APOLLO_STATE__) {
      console.log('[Apollo] Found window.__APOLLO_STATE__');
      const result = parseApolloCache(window.__APOLLO_STATE__);
      if (result) return result;
    }

    // Method 3: Look for React Fiber on various possible root elements
    const possibleRoots = [
      document.querySelector('#app'),
      document.querySelector('[data-reactroot]'),
      document.querySelector('#root'),
      document.querySelector('#__next'),
      document.querySelector('[id*="react"]'),
      document.body.firstElementChild,
      document.querySelector('main'),
      document.querySelector('[class*="App"]'),
      document.querySelector('[data-testid="syllabus-browser-content"]')?.closest('div'),
    ].filter(Boolean);

    console.log('[Apollo] Checking', possibleRoots.length, 'possible root elements');

    for (const rootElement of possibleRoots) {
      const allKeys = Object.keys(rootElement);
      const fiberKey = allKeys.find(key =>
        key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')
      );

      if (fiberKey) {
        console.log('[Apollo] Found React Fiber on:', rootElement.tagName, rootElement.id || rootElement.className?.slice(0, 30));
        console.log('[Apollo] Fiber key:', fiberKey);

        const progressData = searchReactTree(rootElement[fiberKey]);
        if (progressData) {
          return progressData;
        }
      }
    }

    console.log('[Apollo] No React Fiber found on any root element');
    return null;
  } catch (error) {
    console.log('[Apollo] Error extracting from Apollo cache:', error.message);
    console.error(error);
    return null;
  }
}

/**
 * Parse Apollo cache data to extract progress information
 */
function parseApolloCache(cacheData) {
  console.log('[Apollo] Parsing cache data...');

  const completed = [];
  let currentModule = null;

  try {
    // Look for ContentItemProgressSummary objects in the cache
    for (const key of Object.keys(cacheData)) {
      const item = cacheData[key];

      if (item?.__typename === 'ContentItemProgressSummary') {
        console.log('[Apollo] Found progress item:', key, 'completed:', item.completed, 'userCompleted:', item.userCompleted);
      }

      // Look for track/module data
      if (item?.title && (item.completed === true || item.userCompleted === true)) {
        if (!item.title.toLowerCase().includes('welcome to')) {
          completed.push(item.title);
        }
      }
    }

    if (completed.length > 0) {
      console.log('[Apollo] Found', completed.length, 'completed items in cache');
      return {
        careerPath: 'Full-Stack Engineer',
        overallProgress: null,
        currentModule: currentModule,
        completedModules: completed,
        recentLessons: [],
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    console.log('[Apollo] Error parsing cache:', error.message);
  }

  return null;
}

/**
 * Recursively search React tree for progress data
 */
let nodesVisited = 0;
let interestingKeys = new Set();

function searchReactTree(node, depth = 0, maxDepth = 15) {
  if (depth === 0) {
    nodesVisited = 0;
    interestingKeys = new Set();
  }

  if (!node || depth > maxDepth) return null;
  nodesVisited++;

  try {
    // Check if this node has memoizedProps or memoizedState with progress data
    const props = node.memoizedProps || {};
    const state = node.memoizedState || {};

    // Log node type for debugging (only first few at each depth level)
    if (depth <= 3 && nodesVisited <= 20) {
      const nodeType = node.type?.name || node.type?.displayName || (typeof node.type === 'string' ? node.type : 'unknown');
      console.log(`[Apollo] Visiting node depth=${depth}: ${nodeType}`);
    }

    // Look for arrays that might contain module/track data
    const checkForProgressData = (obj, path = 'root') => {
      if (!obj || typeof obj !== 'object') return null;

      // Look for track/module arrays
      if (Array.isArray(obj)) {
        // Check if this looks like a list of tracks/modules
        if (obj.length > 5 && obj[0] && typeof obj[0] === 'object') {
          const first = obj[0];
          const keys = Object.keys(first).slice(0, 5).join(', ');
          console.log(`[Apollo] Found array at ${path} with ${obj.length} items, first item keys: ${keys}`);
          if (first.title || first.name || first.displayName) {
            console.log(`[Apollo] Array has title/name/displayName - extracting progress...`);
            return extractProgressFromArray(obj);
          }
        }
      }

      // Recursively check object properties
      for (const key in obj) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('track') || lowerKey.includes('module') || lowerKey.includes('progress') || lowerKey.includes('syllabus') || lowerKey.includes('content') || lowerKey.includes('data')) {
          interestingKeys.add(key);
          const result = checkForProgressData(obj[key], `${path}.${key}`);
          if (result) return result;
        }
      }

      return null;
    };

    const propsData = checkForProgressData(props);
    if (propsData) return propsData;

    const stateData = checkForProgressData(state);
    if (stateData) return stateData;

    // Search child and sibling nodes
    const childResult = searchReactTree(node.child, depth + 1, maxDepth);
    if (childResult) return childResult;

    const siblingResult = searchReactTree(node.sibling, depth + 1, maxDepth);
    if (siblingResult) return siblingResult;

  } catch (error) {
    // Log errors at shallow depths
    if (depth <= 2) {
      console.log(`[Apollo] Error at depth ${depth}:`, error.message);
    }
  }

  // Log summary when returning from root
  if (depth === 0) {
    console.log(`[Apollo] Tree search complete. Nodes visited: ${nodesVisited}`);
    console.log(`[Apollo] Interesting keys found: ${[...interestingKeys].join(', ') || 'none'}`);
  }

  return null;
}

/**
 * Extract progress data from an array of tracks/modules
 */
function extractProgressFromArray(arr) {
  console.log(`[Apollo] Extracting progress from array of ${arr.length} items...`);

  const completed = [];
  let currentModule = null;

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const name = item.title || item.displayName || item.name;
    if (!name) continue;

    // Check various ways completion might be indicated
    const isComplete =
      item.completed === true ||
      item.isCompleted === true ||
      item.userCompleted === true ||
      item.progress === 100 ||
      item.percentComplete === 100 ||
      item.status === 'completed' ||
      item.state === 'completed';

    // Log first few items for debugging
    if (i < 5) {
      console.log(`[Apollo] Item ${i}: "${name}" - completed=${item.completed}, isCompleted=${item.isCompleted}, progress=${item.progress}, status=${item.status}`);
    }

    if (isComplete && !name.toLowerCase().includes('welcome to')) {
      completed.push(name);
    }

    // Find current module (first incomplete one)
    if (!currentModule && !isComplete && !name.toLowerCase().includes('welcome to')) {
      currentModule = {
        name: name,
        progress: item.progress || item.percentComplete || null
      };
    }
  }

  console.log(`[Apollo] Extraction result: ${completed.length} completed, current="${currentModule?.name || 'none'}"`);

  if (completed.length > 0 || currentModule) {
    return {
      careerPath: 'Full-Stack Engineer',
      overallProgress: null,
      currentModule: currentModule,
      completedModules: completed,
      recentLessons: [],
      timestamp: new Date().toISOString()
    };
  }

  console.log('[Apollo] No completed modules or current module found in array');
  return null;
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

        // Debug: log first 3 modules in detail
        if (index < 3) {
          console.log(`[Debug] Module ${index} "${name}" HTML structure:`);
          // Log all data-testid attributes
          const testIds = item.querySelectorAll('[data-testid]');
          testIds.forEach(el => console.log(`  data-testid: "${el.getAttribute('data-testid')}"`));
          // Log aria attributes
          const ariaElements = item.querySelectorAll('[aria-label], [aria-checked], [aria-selected]');
          ariaElements.forEach(el => {
            console.log(`  aria: label="${el.getAttribute('aria-label')}", checked="${el.getAttribute('aria-checked')}"`);
          });
        }

        // Multiple strategies to detect completion:
        let isCompleted = false;
        let detectionMethod = '';

        // 1. Check for CheckFilledIcon mask in SVG (Codecademy's completed checkmark)
        const svgs = item.querySelectorAll('svg');
        for (const svg of svgs) {
          const masks = svg.querySelectorAll('mask');
          for (const mask of masks) {
            const maskId = mask.getAttribute('id') || '';
            if (maskId.includes('CheckFilledIcon')) {
              isCompleted = true;
              detectionMethod = 'CheckFilledIcon mask';
              break;
            }
          }
          if (isCompleted) break;

          // Also check innerHTML for CheckFilledIcon (in case mask is nested differently)
          if (svg.innerHTML.includes('CheckFilledIcon')) {
            isCompleted = true;
            detectionMethod = 'CheckFilledIcon in SVG';
            break;
          }
        }

        // 2. Check for completed icon data-testid
        if (!isCompleted && item.querySelector('[data-testid="completed-icon"]')) {
          isCompleted = true;
          detectionMethod = 'completed-icon testid';
        }

        // 3. Check for in-progress icon (means started but not complete)
        // We note this for progress tracking but don't mark as complete
        const inProgressIcon = item.querySelector('[data-testid="in-progress-icon"]');

        // 4. Check for "100%" text in the module item
        if (!isCompleted) {
          const textContent = item.textContent || '';
          if (textContent.includes('100%')) {
            isCompleted = true;
            detectionMethod = '100% text';
          }
        }

        // 5. Check aria-label for completion indicators
        if (!isCompleted) {
          const allElements = item.querySelectorAll('*');
          for (const el of allElements) {
            const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
            if (ariaLabel.includes('complete') || ariaLabel.includes('finished') || ariaLabel.includes('done')) {
              isCompleted = true;
              detectionMethod = `aria-label: ${ariaLabel}`;
              break;
            }
          }
        }

        console.log(`Module ${index}: "${name}" - Completed: ${isCompleted}` + (detectionMethod ? ` (${detectionMethod})` : ''));

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
