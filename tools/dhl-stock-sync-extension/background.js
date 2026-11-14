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
  'scan-quality-core.js',
  'scan-retry-core.js',
  'stock-branch-core.js',
  'excel-sku-core.js',
  'stock-push-preview-core.js',
  'sapo-inventory-resolver-core.js',
  'sapo-inventory-set-compat.js',
  'sapo-product-create-background.js',
  'sapo-product-create-continuous-background.js',
  'auto-sync-safety-background.js',
  'manual-job-runner-background.js',
  'manual-sapo-background.js',
  'scheduled-stock-sync-background.js'
);

const MANUAL_ONLY_MIGRATION_KEY = 'dhlManualOnlyMigrationV0213';

async function migrateToManualOnlyMode() {
  try {
    const stored = await chrome.storage.local.get([
      MANUAL_ONLY_MIGRATION_KEY,
      'dhlAutoSyncConfigV1',
      'dhlAutoSyncCycleV1',
      'dhlAutoSyncStatusV1',
      'dhlManualScanJobV2'
    ]);
    if (stored[MANUAL_ONLY_MIGRATION_KEY]) return;

    // Tắt toàn bộ lịch quét tự động cũ. Giữ nguyên thông tin Sapo để nút đẩy thủ công vẫn dùng được.
    for (const alarmName of ['dhl-auto-stock-sync', 'dhl-auto-stock-step', 'dhl-sapo-push-queue']) {
      try { await chrome.alarms.clear(alarmName); } catch (_) {}
    }

    const config = stored.dhlAutoSyncConfigV1 && typeof stored.dhlAutoSyncConfigV1 === 'object'
      ? stored.dhlAutoSyncConfigV1
      : {};
    const nextConfig = {
      ...config,
      enabled: false,
      autoPushSapo: false,
      selectedProfileIds: [],
      profileUrls: {}
    };

    const status = stored.dhlAutoSyncStatusV1 && typeof stored.dhlAutoSyncStatusV1 === 'object'
      ? stored.dhlAutoSyncStatusV1
      : {};
    const nextStatus = {
      ...status,
      enabled: false,
      running: false,
      nextRunAt: 0,
      currentProfile: '',
      progress: ''
    };

    const updates = {
      dhlAutoSyncConfigV1: nextConfig,
      dhlAutoSyncStatusV1: nextStatus,
      [MANUAL_ONLY_MIGRATION_KEY]: Date.now()
    };

    const job = stored.dhlManualScanJobV2 && typeof stored.dhlManualScanJobV2 === 'object'
      ? stored.dhlManualScanJobV2
      : null;
    const looksLikeWika = job && /wika/i.test(String(job.sourceUrl || '') + ' ' + String(job.profileName || '') + ' ' + String(job.pageTitle || ''));
    if (job && job.running && looksLikeWika) {
      try { await chrome.alarms.clear('dhl-manual-scan-step'); } catch (_) {}
      if (job.tabId) {
        try { await chrome.tabs.remove(job.tabId); } catch (_) {}
      }
      updates.dhlManualScanJobV2 = {
        ...job,
        running: false,
        status: 'cancelled-by-manual-only-upgrade',
        stopAfterCurrent: false,
        tabId: 0,
        cancelledAt: Date.now()
      };
    }

    await chrome.storage.local.set(updates);
    await chrome.storage.local.remove('dhlAutoSyncCycleV1');
  } catch (error) {
    console.warn('Không dọn được trạng thái auto cũ:', error);
  }
}

const STOP_STOCK_PUSH_MIGRATION_KEY = 'dhlStopStockPushV0222';

async function stopDirectStockPush() {
  try {
    const stored = await chrome.storage.local.get([
      STOP_STOCK_PUSH_MIGRATION_KEY,
      'dhlSapoPushQueueV1'
    ]);
    if (stored[STOP_STOCK_PUSH_MIGRATION_KEY]) return;

    for (const alarmName of [
      'dhl-sapo-manual-push-queue',
      'dhl-sapo-push-queue'
    ]) {
      try { await chrome.alarms.clear(alarmName); } catch (_) {}
    }

    // Hủy queue đẩy tồn trực tiếp nhưng GIỮ nguyên cache quét và thông tin kết nối Sapo.
    await chrome.storage.local.remove('dhlSapoPushQueueV1');
    await chrome.storage.local.set({
      [STOP_STOCK_PUSH_MIGRATION_KEY]: Date.now()
    });
  } catch (error) {
    console.warn('Không dừng được queue đẩy tồn Sapo:', error);
  }
}

async function enableSidePanel() {
  if (!chrome.sidePanel || !chrome.sidePanel.setPanelBehavior) return;
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.warn('Không bật được side panel:', error);
  }
}

// Tự dọn cache khi đóng Side Panel, không làm gián đoạn công việc đang chạy.
const PANEL_AUTO_CLEANUP_PORT = 'dhl-stock-sync-panel';
// From v0.25.0, stock checkpoints and valid export data are preserved
// across panel close. The user explicitly clears cache with XÓA CACHE /
// LÀM MỚI TOOL. Silent cleanup caused loss of completed scans.
const PANEL_AUTO_CLEANUP_KEYS = [];
async function cleanupPanelCloseCache(){
  return {cleared:false,reason:'preserved-until-user-action'};
}

function requestPanelCloseCleanup(){
  return cleanupPanelCloseCache().catch(error=>{
    console.warn('Không thể tự dọn cache khi đóng DHL Stock Sync:',error);
    return {cleared:false,error:String(error&&error.message||error)};
  });
}

// Port tự ngắt khi bảng Side Panel thực sự đóng, kể cả khi pagehide không kịp gửi message.
chrome.runtime.onConnect.addListener(port=>{
  if(!port||port.name!==PANEL_AUTO_CLEANUP_PORT)return;
  port.onDisconnect.addListener(()=>{requestPanelCloseCleanup();});
});

// Dự phòng cho trình duyệt không gửi sự kiện ngắt Port đúng lúc.
chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
  if(!message||message.type!=='DHL_PANEL_CLOSE_AUTO_CLEANUP')return;
  requestPanelCloseCleanup().then(sendResponse);
  return true;
});

chrome.runtime.onInstalled.addListener(enableSidePanel);
chrome.runtime.onStartup.addListener(enableSidePanel);
enableSidePanel();
migrateToManualOnlyMode();
stopDirectStockPush();
