# Icon Setup Instructions

The extension requires a PNG icon, but I've created an SVG file (`icon.svg`) for you.

## Quick Option: Use a Placeholder

For testing purposes, you can use any 128x128 PNG image. Here are some quick options:

### Option 1: Online Converter (Recommended)
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `icon.svg` from this folder
3. Download the converted PNG
4. Rename it to `icon.png` and place it in the `assets` folder

### Option 2: Create a Simple Placeholder
1. Go to https://placeholder.com/
2. Download a 128x128 image in any color
3. Save it as `icon.png` in the `assets` folder

### Option 3: Use macOS Preview (Mac users)
1. Open `icon.svg` in Preview
2. File → Export
3. Format: PNG
4. Resolution: 128x128
5. Save as `icon.png` in the `assets` folder

### Option 4: Use ImageMagick (Command line)
If you have ImageMagick installed:
```bash
convert -background none -size 128x128 icon.svg icon.png
```

### Option 5: Design Your Own
Create a custom icon at:
- https://www.canva.com/ (128x128 px)
- https://www.figma.com/ (free design tool)
- Photoshop, GIMP, or any image editor

## Testing Without an Icon

If you want to test immediately:
1. The extension will show a default Chrome icon
2. It will still work perfectly - the icon is just for appearance
3. You can add the icon later

## What Happens Next

Once you have `icon.png`:
1. Place it in the `assets/` folder
2. Reload the extension in Chrome
3. The icon will appear in your toolbar
