# Install Favicon Package - Step by Step

## 📦 Step 1: Extract the Downloaded Package

```bash
# Navigate to your Downloads folder
cd ~/Downloads

# Find the favicon package (it's usually named something like 'favicons.zip' or similar)
# Extract it (double-click or use unzip command)
unzip favicons.zip -d favicons

# Or if it's a tar.gz file:
tar -xzf favicons.tar.gz
```

## 📍 Step 2: Copy Files to Angular Public Folder

Copy ALL the extracted files to your Angular project's `public` folder:

```bash
# Navigate to the extracted folder
cd ~/Downloads/favicons  # or whatever the extracted folder is named

# Copy all favicon files to the Angular public folder
cp favicon.ico /Users/arul/oneDC/MVP-ver1/oneDC/frontend/onedc/public/
cp favicon-96x96.png /Users/arul/oneDC/MVP-ver1/oneDC/frontend/onedc/public/
cp favicon.svg /Users/arul/oneDC/MVP-ver1/oneDC/frontend/onedc/public/
cp apple-touch-icon.png /Users/arul/oneDC/MVP-ver1/oneDC/frontend/onedc/public/
cp site.webmanifest /Users/arul/oneDC/MVP-ver1/oneDC/frontend/onedc/public/

# Copy any other icon files that were generated (like favicon-16x16.png, favicon-32x32.png, etc.)
cp *.png /Users/arul/oneDC/MVP-ver1/oneDC/frontend/onedc/public/
cp *.ico /Users/arul/oneDC/MVP-ver1/oneDC/frontend/onedc/public/
cp *.svg /Users/arul/oneDC/MVP-ver1/oneDC/frontend/onedc/public/
cp *.webmanifest /Users/arul/oneDC/MVP-ver1/oneDC/frontend/onedc/public/
```

## 📝 Step 3: Update index.html

The HTML code needs to go in your `index.html` file. I'll update it for you now.

Your final file structure should look like:
```
frontend/onedc/public/
├── favicon.ico
├── favicon-96x96.png
├── favicon.svg
├── apple-touch-icon.png
├── site.webmanifest
└── (any other icon files from the package)
```

## ✅ Quick One-Liner (After Extracting)

If all your favicon files are in `~/Downloads/favicons/`, run:

```bash
cp ~/Downloads/favicons/* /Users/arul/oneDC/MVP-ver1/oneDC/frontend/onedc/public/
```

## 🧪 Step 4: Test

After copying files:

1. Start your Angular dev server:
   ```bash
   cd /Users/arul/oneDC/MVP-ver1/oneDC/frontend/onedc
   ng serve
   ```

2. Open http://localhost:4200

3. Check the browser tab for your new icon

4. Hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)

## 🚀 Step 5: For Production

After verifying it works locally:

```bash
# Build the Angular app
cd /Users/arul/oneDC/MVP-ver1/oneDC/frontend/onedc
npm run build

# The favicon files will be automatically included in the build
```

Deploy as usual - the files will be in the root of your deployed site.
