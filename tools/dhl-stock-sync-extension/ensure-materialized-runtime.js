const fs = require('fs');
const path = require('path');

const dir = __dirname;
const popupPath = path.join(dir, 'popup.js');
const contentPath = path.join(dir, 'content.js');
const xlsxPath = path.join(dir, 'xlsx-lite.js');
const pkgPath = path.join(dir, 'package.json');

function read(file) { return fs.readFileSync(file, 'utf8'); }

function isMaterialized() {
  const popup = read(popupPath);
  const content = read(contentPath);
  const xlsx = read(xlsxPath);
  return popup.includes('ensureCurrentCategoryTab')
    && !popup.includes('ensureHdCategoryTab')
    && !popup.includes('HD_URL')
    && content.includes('discoverCurrentCategory')
    && content.includes('detectedSizesFromRoot')
    && !content.includes('HD_PATH')
    && xlsx.includes("inner=cm[2]||''");
}

if (!isMaterialized()) {
  require('./build-runtime-patch.js');
  require('./build-generic-category-patch.js');
}

// Keep the visible diagnostic version in popup.js aligned with package.json.
const pkg = JSON.parse(read(pkgPath));
let popup = read(popupPath);
popup = popup.replace(/const VERSION = '[^']+';/, `const VERSION = '${pkg.version}';`);
fs.writeFileSync(popupPath, popup, 'utf8');

if (!isMaterialized()) {
  throw new Error('Runtime source was not materialized to current-category mode');
}

console.log('MATERIALIZED RUNTIME PASS:', pkg.version);
