// Popup script - handles UI, data formatting, and clipboard operations

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
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if we're on Codecademy
    if (!tab.url.includes('codecademy.com')) {
      showError();
      return;
    }

    // Request data from content script
    chrome.tabs.sendMessage(
      tab.id,
      { action: 'extractProgress' },
      (response) => {
        if (chrome.runtime.lastError) {
          // Content script might not be loaded yet, try cached data
          loadCachedData();
          return;
        }

        if (response && response.success) {
          progressData = response.data;
          displayProgress(progressData);
        } else {
          // Fallback to cached data
          loadCachedData();
        }
      }
    );
  } catch (error) {
    console.error('Error loading progress:', error);
    loadCachedData();
  }
}

/**
 * Load cached data from chrome.storage
 */
async function loadCachedData() {
  const result = await chrome.storage.local.get(['cachedProgress']);
  if (result.cachedProgress) {
    progressData = result.cachedProgress;
    displayProgress(progressData);
  } else {
    showError();
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
  if (data.overallProgress !== null) {
    overallProgressEl.textContent = `${data.overallProgress}%`;
    overallProgressEl.style.display = 'block';
  } else {
    overallProgressEl.style.display = 'none';
  }

  // Current module
  if (data.currentModule && data.currentModule.name) {
    currentModuleNameEl.textContent = data.currentModule.name;
    if (data.currentModule.progress !== null) {
      currentModuleProgressEl.textContent = `${data.currentModule.progress}%`;
      currentModuleProgressEl.style.display = 'inline-block';
    } else {
      currentModuleProgressEl.style.display = 'none';
    }
    currentModuleSection.style.display = 'block';
  } else {
    currentModuleSection.style.display = 'none';
  }

  // Recent lessons
  if (data.recentLessons && data.recentLessons.length > 0) {
    recentLessonsEl.innerHTML = '';
    data.recentLessons.forEach(lesson => {
      const li = document.createElement('li');
      li.textContent = lesson;
      recentLessonsEl.appendChild(li);
    });
    recentLessonsSection.style.display = 'block';
  } else {
    recentLessonsSection.style.display = 'none';
  }

  // Completed modules
  if (data.completedModules && data.completedModules.length > 0) {
    completedModulesEl.innerHTML = '';
    data.completedModules.forEach(module => {
      const chip = document.createElement('span');
      chip.className = 'module-chip';
      chip.textContent = module;
      completedModulesEl.appendChild(chip);
    });
    completedModulesSection.style.display = 'block';
  } else {
    completedModulesSection.style.display = 'none';
  }
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
    text += 'Previously completed modules:\n';
    data.completedModules.forEach(module => {
      text += `• ${module}\n`;
    });
    text += '\n';
  }

  // Add AI instruction
  text += 'Please quiz me with 5-7 quick recall questions focused on my most recently completed lesson. ';
  text += 'After that, quiz me with 5-7 quick recall questions about any of the lessons I\'ve completed so far. ';
  text += 'After each answer, provide a brief explanation. Ready when you say "start".';

  return text;
}

/**
 * Copy formatted text to clipboard
 */
async function copyToClipboard() {
  if (!progressData) {
    return;
  }

  try {
    const formattedText = formatForAI(progressData);
    await navigator.clipboard.writeText(formattedText);

    // Show success message
    successMsg.classList.remove('hidden');
    copyBtn.classList.add('success');

    // Hide after 2 seconds
    setTimeout(() => {
      successMsg.classList.add('hidden');
      copyBtn.classList.remove('success');
    }, 2000);
  } catch (error) {
    console.error('Failed to copy:', error);
    alert('Failed to copy to clipboard. Please try again.');
  }
}

/**
 * Parse career path base URL from any Codecademy URL
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
 * Navigate to career path page for progress extraction
 */
async function navigateToCareerPath() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let targetUrl = 'https://www.codecademy.com/learn';

    // Try to parse the current tab's URL first
    if (tab.url && tab.url.includes('codecademy.com')) {
      const parsed = parseCareerPathUrl(tab.url);
      if (parsed) {
        targetUrl = parsed;
      }
    }

    // If no parsed URL, try cached data
    if (targetUrl === 'https://www.codecademy.com/learn') {
      const result = await chrome.storage.local.get(['cachedProgress']);
      if (result.cachedProgress?.pageUrl) {
        targetUrl = result.cachedProgress.pageUrl;
      }
    }

    // Navigate to the target URL
    await chrome.tabs.update(tab.id, { url: targetUrl });

    // Close the popup (it will reopen automatically after navigation)
    window.close();
  } catch (error) {
    console.error('Navigation error:', error);
    alert('Failed to navigate. Please manually go to your Codecademy career path page.');
  }
}

// Event listeners
copyBtn.addEventListener('click', copyToClipboard);
goToPathBtn.addEventListener('click', navigateToCareerPath);
