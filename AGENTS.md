# AGENTS.md - Codecademy Progress Tracker Extension

## Project Overview

A browser extension that extracts progress data from Codecademy's Full-Stack Engineer Career Path and formats it for AI-powered quizzing sessions. Built as a learning project by a bootcamp student.

## Current Status

**Phase:** Initial Development (MVP)
**Target Browser:** Chrome (Manifest V3)
**Current Focus:** DOM data extraction from Codecademy pages

## Project Goals

### Primary Goal (MVP)
- Extract course progress data from Codecademy Career Path pages
- Display extracted data in extension popup
- Provide "Copy for AI Chat" button that formats data for voice quizzing
- AI/LLM agnostic - no direct API integrations in MVP

### Use Case
After completing daily lessons, user clicks extension to copy formatted progress data, then pastes into ChatGPT/Gemini for voice-based quizzing during commute.

### Future Considerations (Post-MVP)
- Google Drive API integration for automatic sync
- Direct API calls to Claude/GPT/Gemini
- Progress history tracking
- Multiple export formats

## Technical Stack

- **Language:** Vanilla JavaScript (no frameworks in extension code)
- **Browser API:** Chrome Extension Manifest V3
- **Target Site:** codecademy.com
- **Developer Experience:** 
  - Comfortable with JavaScript, React, Express.js, DOM manipulation
  - Currently learning: Databases, SQL, Chrome Extension APIs
  - Familiar with DevTools but not expert level

## File Structure

```
codecademy-tracker/
├── manifest.json          # Extension configuration
├── content.js            # Runs on Codecademy pages, extracts data
├── background.js         # Service worker (if needed for future features)
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic and button handlers
├── styles.css            # Popup styling (optional)
└── README.md             # User-facing documentation
```

## Key Implementation Details

### DOM Extraction Strategy

**Codecademy uses styled-components with auto-generated class names** (e.g., `gamut-198d51l-StyledText`). These are unstable and should NOT be used as selectors.

**Use instead:**
- Element tags: `h1`, `h2`, `h3`
- ARIA attributes: `data-testid="completed-icon"`
- Text content matching
- DOM relationships (parent/child/sibling navigation)

### Data to Extract

From the Career Path syllabus page:

1. **Career Path Name:** `document.querySelector('h1')?.textContent`
2. **Current Module:** Module with progress indicator (e.g., "60% progress")
3. **Completed Modules:** Modules with checkmark icons
4. **Recent Lessons:** Lessons from expanded module sections
5. **Progress Percentage:** From the `figcaption` element

### Example Selectors (Verified)

```javascript
// Career path title
const careerPath = document.querySelector('h1')?.textContent;

// Current module in progress
const currentModule = document.querySelector('figcaption')
  ?.closest('button')
  ?.querySelector('h2')?.textContent;

// Progress percentage
const progress = document.querySelector('figcaption')?.textContent;

// Completed modules (has completed icon)
const completed = [...document.querySelectorAll('h2')]
  .filter(h2 => h2.closest('button')?.querySelector('[data-testid="completed-icon"]'))
  .map(h2 => h2.textContent.trim());

// Recently completed lessons (from expanded sections)
const lessons = [...document.querySelectorAll('[data-testid="completed-icon"]')]
  .map(icon => icon.closest('button')?.querySelector('h3')?.textContent)
  .filter(Boolean);
```

## Output Format for AI Quizzing

The extension should format data like this:

```
I just finished studying on Codecademy - Full-Stack Engineer path.

Currently working on: Database Basics (60% complete)

Recently completed lessons:
• Introduction: Database Basics
• Types of Databases  
• Working With Your First Database

Previously completed modules:
• Fundamentals of HTML
• Fundamentals of CSS
• JavaScript Syntax, Part I
[... etc ...]

Please quiz me with 5-7 quick recall questions focused on my recently completed lessons. After that, quiz me with 5-7 quick recall questions based on any of all the lessons I've completed so far. After each answer, provide a brief explanation. Continue quizzing me with this this pattern (5-7  recent, then 5-7 randomly selected) until I ask you to stop. Ready when you say "start".
```

## Code Conventions & Preferences

### Do's ✅
- **Keep it simple** - Favor readability over cleverness
- **Explain the why** - Add comments explaining logic, not just what code does
- **Error handling** - Use optional chaining (`?.`) and nullish coalescing (`??`)
- **Functional style** - Use array methods (`.map`, `.filter`, etc.)
- **Modern JavaScript** - Use `const`/`let`, arrow functions, template literals

### Don'ts ❌
- **No frameworks** - Vanilla JS only for this extension
- **No overengineering** - This is a learning project, not production code
- **No paid services** - Suggest free alternatives first
- **No feature creep** - Keep suggestions focused on MVP scope
- **No production patterns** - Skip extensive error handling, logging, analytics in early stages

### Code Style
```javascript
// Good: Clear, simple, well-commented
function extractModuleName() {
  // Find the module with a progress indicator (in-progress module)
  const progressElement = document.querySelector('figcaption');
  const moduleButton = progressElement?.closest('button');
  const moduleName = moduleButton?.querySelector('h2')?.textContent;
  
  return moduleName?.trim() || 'Unknown Module';
}

// Avoid: Over-abstracted, premature optimization
class ModuleExtractor {
  constructor(selector) { /* ... */ }
  extract() { /* ... */ }
  validate() { /* ... */ }
  // ... too much for MVP
}
```


**Approach:** Build a working MVP first, then iterate. Focus on learning fundamentals over using advanced patterns.

## Common Pitfalls to Avoid

1. **Using unstable selectors** - Codecademy's CSS classes change, use semantic selectors
2. **Assuming page structure** - Always use optional chaining for safe access
3. **Overcomplicating MVP** - Resist urge to add features before core works
4. **Forgetting permissions** - Manifest must declare `activeTab` permission
5. **Not testing on actual site** - Load extension and test on real Codecademy pages early

## Development Workflow

1. **Test selectors in DevTools console first** - Before writing extension code
2. **Reload extension after changes** - chrome://extensions → Reload button
3. **Check console for errors** - DevTools → Console tab (both page and extension)
4. **Iterate quickly** - Get something working, then improve

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Content script runs on Codecademy pages
- [ ] Data extraction works on Career Path syllabus page
- [ ] Copy button successfully copies to clipboard
- [ ] Formatted text is ready to paste into AI chat
- [ ] Works with different modules/progress states

## Resources

- **Chrome Extension Docs:** https://developer.chrome.com/docs/extensions/mv3/
- **Manifest V3 Guide:** https://developer.chrome.com/docs/extensions/mv3/manifest/
- **Content Scripts:** https://developer.chrome.com/docs/extensions/mv3/content_scripts/

## Questions for the User

If any of these are unclear, ask the developer:
- Should we track progress history over time?
- Which specific Codecademy pages should extension work on?
- Any specific error handling requirements?
- Preferred format for timestamps/dates?
