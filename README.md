# Codecademy Progress Tracker

A Chrome browser extension that extracts your progress from Codecademy's Full-Stack Engineer Career Path and formats it for AI-powered study sessions.

## 🎯 The Problem

After completing lessons on Codecademy, I want to reinforce what I learned through AI-powered quizzing during my commute. But manually typing out what I've covered is time-consuming and breaks the flow.

## 💡 The Solution

This extension:
1. Reads your progress directly from Codecademy pages
2. Extracts course names, completion percentages, and recent lessons
3. Formats everything into a ready-to-use prompt
4. Copies it to your clipboard with one click

Then you just paste it into ChatGPT, Claude, or Gemini and start your voice-based study session!

## ✨ Features

### Current (MVP)
- ✅ Extract career path name and overall progress
- ✅ Identify current module and completion percentage  
- ✅ List completed modules
- ✅ Show recently completed lessons
- ✅ One-click copy to clipboard
- ✅ Formatted for AI quizzing

### Future Possibilities
- 📊 Track progress history over time
- 🔄 Automatic sync to Google Drive
- 🤖 Direct API integration with AI services
- 📱 Mobile companion app
- 📈 Progress visualization/graphs

## 🚀 Installation

### Prerequisites
- Google Chrome browser
- Active Codecademy account

### Setup (Development Mode)

1. **Download the extension**
   ```bash
   git clone https://github.com/yourusername/codecademy-tracker.git
   cd codecademy-tracker
   ```

2. **Load into Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `codecademy-tracker` folder

3. **Verify installation**
   - You should see the extension icon in your toolbar
   - Visit [Codecademy](https://www.codecademy.com/learn)
   - Click the extension icon to test

## 📖 How to Use

### Step 1: Complete Your Lessons
Study on Codecademy as usual. The extension works best when you:
- View your Career Path syllabus page
- Have recently completed lessons visible

### Step 2: Extract Your Progress
1. Click the extension icon in your Chrome toolbar
2. Your progress data will be displayed in the popup
3. Click "Copy for AI Chat" button

### Step 3: Get Quizzed
1. Open ChatGPT, Claude, or Gemini (mobile or web)
2. Paste the copied text
3. Start your voice-based study session!

### Example Output

When you click "Copy for AI Chat", you'll get text like:

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
• JavaScript Syntax, Part II
[... and more ...]

Please quiz me with 5-7 quick recall questions focused on my recently 
completed lessons. After each answer, provide a brief explanation. 
Ready when you say "start".
```

## 🛠️ How It Works

### Architecture

```
┌─────────────────────┐
│  Codecademy Page    │
│  (Career Path View) │
└──────────┬──────────┘
           │
           │ DOM Extraction
           ▼
┌─────────────────────┐
│   content.js        │
│   (Reads page data) │
└──────────┬──────────┘
           │
           │ Sends data
           ▼
┌─────────────────────┐
│   popup.js          │
│   (Formats & shows) │
└──────────┬──────────┘
           │
           │ User clicks
           ▼
┌─────────────────────┐
│   Clipboard         │
│   (Ready to paste!) │
└─────────────────────┘
```

### Technical Details

**Extension Type:** Chrome Manifest V3  
**Permissions Required:** `activeTab`, `storage`  
**Target Site:** codecademy.com

**Key Files:**
- `manifest.json` - Extension configuration
- `content.js` - Extracts data from Codecademy pages
- `popup.html/js` - User interface and copy functionality

**DOM Extraction Strategy:**  
Codecademy uses dynamic CSS class names, so we extract data using:
- Semantic HTML elements (`h1`, `h2`, `h3`)
- ARIA attributes (`data-testid`)
- DOM relationships (parent/child navigation)
- Text content matching

This makes the extension more resilient to Codecademy UI updates.

## 🧪 Development

### Project Structure
```
codecademy-tracker/
├── manifest.json          # Extension configuration
├── content.js            # DOM extraction logic
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── styles.css            # UI styling (optional)
├── README.md             # This file
├── AGENTS.md             # AI assistant context
└── assets/
    └── icon.png          # Extension icon
```

### Testing

1. **Test data extraction in console:**
   ```javascript
   // Open Codecademy Career Path page
   // Open DevTools (F12) → Console
   
   // Test career path extraction
   console.log(document.querySelector('h1')?.textContent);
   
   // Test module extraction
   console.log([...document.querySelectorAll('h2')].map(h => h.textContent));
   ```

2. **Test extension functionality:**
   - Load extension in Chrome
   - Navigate to Codecademy
   - Click extension icon
   - Verify data appears correctly
   - Test copy button

3. **Test with AI:**
   - Copy formatted text
   - Paste into ChatGPT/Claude/Gemini
   - Verify AI understands the format
   - Try a quiz session

### Making Changes

After editing any files:
1. Go to `chrome://extensions/`
2. Click the reload icon on your extension
3. Refresh any Codecademy pages
4. Test your changes

## 🤝 Contributing

This is currently a personal learning project, but suggestions are welcome!

**If you want to:**
- Report a bug → Open an issue
- Suggest a feature → Open an issue
- Submit code → Fork and open a pull request

**Code Style Guidelines:**
- Use vanilla JavaScript (no frameworks)
- Comment your code, especially the "why"
- Keep it simple - this is a learning project
- Test on actual Codecademy pages

## 📋 Known Limitations

- **Chrome only** - Not tested on Firefox/Safari/Edge
- **Career Path specific** - Designed for Full-Stack Engineer path
- **Manual trigger** - Must click extension icon (not automatic)
- **English only** - Assumes Codecademy is in English
- **No history** - Doesn't track progress over time (yet)

## 🐛 Troubleshooting

### Extension doesn't appear
- Make sure Developer mode is enabled in `chrome://extensions/`
- Check that you loaded the correct folder
- Look for errors on the extensions page

### No data shows in popup
- Verify you're on a Codecademy Career Path page
- Open DevTools → Console and check for errors
- Try reloading both the extension and the page

### Copy button doesn't work
- Check browser console for errors
- Ensure you granted clipboard permissions
- Try clicking the button again

### Data looks wrong
- Codecademy may have updated their UI
- Check `content.js` selectors need updating
- Open an issue with a screenshot

## 📚 Learning Resources

This project taught me:
- Chrome Extension APIs and architecture
- Real-world DOM manipulation
- Working with dynamic, third-party websites
- Building practical automation tools

**Helpful links:**
- [Chrome Extension Getting Started](https://developer.chrome.com/docs/extensions/mv3/getstarted/)
- [Content Scripts Documentation](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

## 📄 License

MIT License - Feel free to use this for your own learning!

## 💬 About

Built by a bootcamp student learning full-stack development on Codecademy. This extension solves a real problem I had: reinforcing learning through AI-powered quizzing during my commute.

**Tech Stack I'm Learning:**
- ✅ HTML/CSS/JavaScript
- ✅ React
- ✅ Express.js
- 🔄 Databases & SQL (currently)
- ⏭️ More to come!

## 🙏 Acknowledgments

- Codecademy for the excellent learning platform
- The Chrome Extensions documentation
- ChatGPT/Claude/Gemini for being great study partners

---

**Questions?** Open an issue or reach out!  
**Finding this useful?** Star the repo! ⭐
