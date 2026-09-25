importScripts(
  'match-core.js',
  'shop-rules.js',
  'generic-shop-rules.js',
  'xlsx-lite.js',
  'warehouse-core.js',
  'generic-warehouse-mode.js',
  'kids-product-size-mode.js',
  'warehouse-sku-link-mode.js',
  'stock-history-core.js',
  'batch-stock-core.js',
  'auto-sync-core.js',
  'sapo-inventory-resolver-core.js',
  'sapo-inventory-set-compat.js',
  'sapo-product-create-background.js',
  'sapo-product-create-continuous-background.js',
  'auto-sync-background-v2.js',
  'manual-sapo-background.js',
  'auto-sync-safety-background.js',
  'sapo-stock-queue-continuous-background.js'
);

async function enableSidePanel() {
  if (!chrome.sidePanel || !chrome.sidePanel.setPanelBehavior) return;
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.warn('Không bật được side panel:', error);
  }
}

chrome.runtime.onInstalled.addListener(enableSidePanel);
chrome.runtime.onStartup.addListener(enableSidePanel);
enableSidePanel();
