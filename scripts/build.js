/**
 * Simple build script for Tito Kids Tube WebOS.
 * Copies files to dist/ without minification (for WebOS packaging).
 */

const fs = require('fs');
const path = require('path');

const SRC = __dirname.replace('scripts', '');
const DIST = path.join(SRC, 'dist');

// Files/folders to copy
const ITEMS = [
    'index.html',
    'appinfo.json',
    'css',
    'js',
    'assets',
];

// Clean dist
if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
}
fs.mkdirSync(DIST, { recursive: true });

// Copy each item
ITEMS.forEach(item => {
    const src = path.join(SRC, item);
    const dest = path.join(DIST, item);

    if (!fs.existsSync(src)) {
        console.warn(`Skipping missing: ${item}`);
        return;
    }

    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        copyDir(src, dest);
    } else {
        fs.copyFileSync(src, dest);
    }

    console.log(`Copied: ${item}`);
});

console.log('\\nBuild complete! Output in dist/');

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
