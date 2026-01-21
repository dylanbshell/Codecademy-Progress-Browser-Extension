# Quick Start Guide

Your Codecademy Progress Tracker extension is ready! Follow these steps to get it running.

## Step 1: Load the Extension

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or: Menu (⋮) → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Toggle the switch in the top-right corner

3. **Load Your Extension**
   - Click "Load unpacked"
   - Select this folder: `Codecademy Progress Browser Extension`
   - Click "Select" or "Open"

4. **Verify Installation**
   - You should see "Codecademy Progress Tracker" in your extensions list
   - The extension icon appears in your Chrome toolbar (puzzle piece icon)
   - Pin it for easy access: click the puzzle icon → pin

## Step 2: Test It Out

1. **Go to Codecademy**
   - Visit https://www.codecademy.com/learn
   - Navigate to your career path (e.g., Full-Stack Engineer)
   - View your syllabus/progress page

2. **Click the Extension**
   - Click the extension icon in your toolbar
   - Wait 1-2 seconds for data extraction
   - Your progress should appear in the popup

3. **Copy & Use**
   - Click "Copy for AI Chat"
   - Open ChatGPT, Claude, or Gemini
   - Paste and start your study session!

## Troubleshooting

### "Please navigate to a Codecademy career path page"
- Make sure you're on codecademy.com
- Navigate to a career path or syllabus page
- Refresh the page and try again

### No Data Appears
- Open DevTools (F12) → Console
- Look for any error messages
- Refresh both the page and the extension

### Extension Doesn't Load
- Make sure you selected the correct folder
- Check that all files are present (manifest.json, popup.html, etc.)
- Look for errors on the chrome://extensions/ page

### Need to Make Changes?
After editing any files:
1. Go to `chrome://extensions/`
2. Click the reload icon (🔄) on your extension
3. Refresh any open Codecademy pages
4. Test your changes

## What's Next?

- Use it regularly after your Codecademy sessions
- The extension auto-caches data for quick access
- Try it with ChatGPT voice mode on your phone!

## File Structure

```
Codecademy Progress Browser Extension/
├── manifest.json          ✓ Extension configuration
├── content.js            ✓ Data extraction from Codecademy
├── popup.html            ✓ Extension UI
├── popup.js              ✓ UI logic & formatting
├── utils.js              ✓ Utility functions
├── styles.css            ✓ Styling
├── icon16.png            ✓ Extension icon (16x16)
├── icon48.png            ✓ Extension icon (48x48)
├── icon128.png           ✓ Extension icon (128x128)
├── assets/
│   ├── icon.svg          ✓ SVG icon source
│   └── ICON_INSTRUCTIONS.md
├── README.md             ✓ Project documentation
├── AGENTS.md             ✓ AI context
└── INSTALLATION_GUIDE.md ✓ This file
```

## Having Issues?

1. Check the console for errors (F12 → Console)
2. Review the README.md for detailed documentation
3. Make sure you're on a Codecademy career path page
4. Try reloading both the extension and the page

**Happy studying!** 🚀
