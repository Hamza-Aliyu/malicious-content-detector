const fs = require('fs');
const path = require('path');

// Simple build script to copy files to dist folder
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${src} -> ${dest}`);
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  });
}

// Clean dist folder
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
  console.log('Cleaned dist folder');
}

// Create dist folder
fs.mkdirSync('dist', { recursive: true });

// Copy files
copyFile('src/manifest.json', 'dist/manifest.json');
copyFile('src/background.js', 'dist/background.js');
copyFile('src/content.js', 'dist/content.js');
copyFile('src/popup.html', 'dist/popup.html');
copyFile('src/popup.js', 'dist/popup.js');
copyFile('src/styles.css', 'dist/styles.css');

// Copy directories
copyDirectory('src/icons', 'dist/icons');
copyDirectory('src/test_pages', 'dist/test_pages');

console.log('\n✅ Build completed successfully!');
console.log('\nNext steps:');
console.log('1. Open Chrome and go to chrome://extensions/');
console.log('2. Enable "Developer mode"');
console.log('3. Click "Load unpacked" and select the "dist" folder');
console.log('4. Test with the pages in dist/test_pages/');
