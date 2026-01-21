// Popup script - handles UI, data formatting, and clipboard operations

// Timing constants
const SUCCESS_MESSAGE_DURATION = 2000; // How long to show the success message

// AI instruction template
const AI_QUIZ_INSTRUCTION = 'Please quiz me with 10 multiple choice questions focused on my most recently completed lesson. ' +
  'After that, quiz me with 10 multiple choice questions about any of the lessons I\'ve completed so far. ' +
  'Finally, continue quizzing me with multiple choice questions on any of the lessons I\'ve completed until I ask otherwise. ' +
  'Be sure to provide a brief explanation after each answer. ' +
  'Ready when I say "start".';

// DOM elements
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const contentEl = document.getElementById('content');
const careerPathEl = document.getElementById('careerPath');
const overallProgressEl = document.getElementById('overallProgress');
const currentModuleSection = document.getElementById('currentModuleSection');
const currentModuleNameEl = document.getElementById('currentModuleName');
const currentModuleProgressEl = document.getElementById('currentModuleProgress');
const recentLessonsSection = document.getElementById('recentLessonsSection');
const recentLessonsEl = document.getElementById('recentLessons');
const completedModulesSection = document.getElementById('completedModulesSection');
const completedModulesEl = document.getElementById('completedModules');
const copyBtn = document.getElementById('copyBtn');
const successMsg = document.getElementById('successMsg');
const goToPathBtn = document.getElementById('goToPathBtn');

// Store progress data globally
let progressData = null;

// Initialize popup when opened
document.addEventListener('DOMContentLoaded', async () => {
  await loadProgressData();
});

/**
 * Load progress data from current tab
 */
async function loadProgressData() {
  try {
    logger.debug('Loading progress data');
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if we're on Codecademy
    if (!tab.url.includes('codecademy.com')) {
      logger.info('Not on Codecademy page, showing error');
      showError();
      return;
    }

    // Request data from content script
    chrome.tabs.sendMessage(
      tab.id,
      { action: 'extractProgress' },
      (response) => {
        if (chrome.runtime.lastError) {
          logger.warn('Content script not responding, loading cached data', chrome.runtime.lastError.message);
          // Content script might not be loaded yet, try cached data
          loadCachedData();
          return;
        }

        if (response && response.success) {
          logger.debug('Successfully received fresh data from content script');
          progressData = response.data;
          displayProgress(progressData);
        } else {
          logger.warn('Content script returned no data, loading cached data');
          // Fallback to cached data
          loadCachedData();
        }
      }
    );
  } catch (error) {
    logger.error('Error loading progress', error);
    loadCachedData();
  }
}

/**
 * Load cached data from chrome.storage
 */
async function loadCachedData() {
  try {
    logger.debug('Loading cached progress data');
    const result = await chrome.storage.local.get(['cachedProgress']);
    if (result.cachedProgress) {
      logger.debug('Cached data found');
      progressData = result.cachedProgress;
      displayProgress(progressData);
    } else {
      logger.warn('No cached data available');
      showError();
    }
  } catch (error) {
    logger.error('Failed to load cached data', error);
    showError();
  }
}

/**
 * Helper function to show/hide sections conditionally
 * @param {HTMLElement} element - The element to show/hide
 * @param {boolean} shouldShow - Whether to show the element
 * @param {function} [contentSetter] - Optional function to set content when showing
 */
function toggleSection(element, shouldShow, contentSetter = null) {
  if (shouldShow) {
    if (contentSetter) {
      contentSetter();
    }
    element.style.display = 'block';
  } else {
    element.style.display = 'none';
  }
}

/**
 * Helper function to show/hide inline elements conditionally
 * @param {HTMLElement} element - The element to show/hide
 * @param {boolean} shouldShow - Whether to show the element
 * @param {function} [contentSetter] - Optional function to set content when showing
 */
function toggleInlineElement(element, shouldShow, contentSetter = null) {
  if (shouldShow) {
    if (contentSetter) {
      contentSetter();
    }
    element.style.display = 'inline-block';
  } else {
    element.style.display = 'none';
  }
}

/**
 * Display progress data in the popup
 */
function displayProgress(data) {
  // Hide loading, show content
  loadingEl.classList.add('hidden');
  contentEl.classList.remove('hidden');

  // Career path name
  careerPathEl.textContent = data.careerPath || 'Codecademy Career Path';

  // Overall progress
  toggleSection(
    overallProgressEl,
    data.overallProgress !== null,
    () => overallProgressEl.textContent = `${data.overallProgress}%`
  );

  // Current module
  toggleSection(
    currentModuleSection,
    data.currentModule && data.currentModule.name,
    () => {
      currentModuleNameEl.textContent = data.currentModule.name;
      toggleInlineElement(
        currentModuleProgressEl,
        data.currentModule.progress !== null,
        () => currentModuleProgressEl.textContent = `${data.currentModule.progress}%`
      );
    }
  );

  // Recent lessons
  toggleSection(
    recentLessonsSection,
    data.recentLessons && data.recentLessons.length > 0,
    () => {
      recentLessonsEl.innerHTML = '';
      data.recentLessons.forEach(lesson => {
        const li = document.createElement('li');
        li.textContent = lesson;
        recentLessonsEl.appendChild(li);
      });
    }
  );

  // Completed modules
  toggleSection(
    completedModulesSection,
    data.completedModules && data.completedModules.length > 0,
    () => {
      completedModulesEl.innerHTML = '';
      data.completedModules.forEach((module, index) => {
        const chip = document.createElement('span');
        chip.className = 'module-chip';
        chip.textContent = `${index + 1}. ${module}`;
        completedModulesEl.appendChild(chip);
      });
    }
  );
}

/**
 * Show error state
 */
function showError() {
  loadingEl.classList.add('hidden');
  errorEl.classList.remove('hidden');
  contentEl.classList.add('hidden');
}

/**
 * Format progress data for AI chat
 */
function formatForAI(data) {
  let text = `I just finished studying on Codecademy`;

  // Add career path name
  if (data.careerPath) {
    text += ` - ${data.careerPath}`;
  }
  text += '.\n\n';

  // Add current module
  if (data.currentModule && data.currentModule.name) {
    text += `Currently working on: ${data.currentModule.name}`;
    if (data.currentModule.progress !== null) {
      text += ` (${data.currentModule.progress}% complete)`;
    }
    text += '\n\n';
  }

  // Add recent lessons
  if (data.recentLessons && data.recentLessons.length > 0) {
    text += 'Recently completed lessons:\n';
    data.recentLessons.forEach(lesson => {
      text += `• ${lesson}\n`;
    });
    text += '\n';
  }

  // Add completed modules
  if (data.completedModules && data.completedModules.length > 0) {
    text += 'Previously completed modules (oldest to most recent):\n';
    data.completedModules.forEach((module, index) => {
      text += `${index + 1}. ${module}\n`;
    });
    text += '\n';
  }

  // Add AI instruction
  text += AI_QUIZ_INSTRUCTION;

  return text;
}

/**
 * Copy formatted text to clipboard
 */
async function copyToClipboard() {
  if (!progressData) {
    logger.warn('No progress data available to copy');
    return;
  }

  try {
    const formattedText = formatForAI(progressData);
    await navigator.clipboard.writeText(formattedText);
    logger.info('Progress data copied to clipboard');

    // Show success message
    successMsg.classList.remove('hidden');
    copyBtn.classList.add('success');

    // Hide after timeout
    setTimeout(() => {
      successMsg.classList.add('hidden');
      copyBtn.classList.remove('success');
    }, SUCCESS_MESSAGE_DURATION);
  } catch (error) {
    logger.error('Failed to copy to clipboard', error);
    alert('Failed to copy to clipboard. Please try again.');
  }
}

/**
 * Navigate to career path page for progress extraction
 */
async function navigateToCareerPath() {
  try {
    logger.debug('Attempting to navigate to career path page');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let targetUrl = null;

    // Try to parse the current tab's URL first
    if (tab.url && tab.url.includes('codecademy.com')) {
      const parsed = parseCareerPathUrl(tab.url);
      if (parsed) {
        targetUrl = parsed;
        logger.debug('Parsed URL from current tab:', targetUrl);
      }
    }

    // If no parsed URL, try cached data
    if (!targetUrl) {
      const result = await chrome.storage.local.get(['cachedProgress']);
      if (result.cachedProgress?.pageUrl &&
          result.cachedProgress.pageUrl !== 'https://www.codecademy.com/learn') {
        targetUrl = result.cachedProgress.pageUrl;
        logger.info('Using cached URL:', targetUrl);
      }
    }

    // If still no URL, default to learn page
    if (!targetUrl) {
      targetUrl = 'https://www.codecademy.com/learn';
      logger.info('No cached career path found, using default:', targetUrl);
    }

    // Navigate to the target URL
    await chrome.tabs.update(tab.id, { url: targetUrl });
    logger.info('Navigating to:', targetUrl);

    // Close the popup (it will reopen automatically after navigation)
    window.close();
  } catch (error) {
    logger.error('Navigation error', error);
    alert('Failed to navigate. Please manually go to your Codecademy career path page.');
  }
}

// Event listeners
copyBtn.addEventListener('click', copyToClipboard);
goToPathBtn.addEventListener('click', navigateToCareerPath);
