const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const compat=read('sapo-inventory-set-compat.js');
assert.ok(compat.includes('/admin/inventory_levels/set.json'));
assert.ok(compat.includes("method:'POST'"));
assert.ok(compat.includes("method:'PUT'"));
assert.ok(compat.includes('/admin/inventory_levels/adjust.json'));
assert.ok(compat.includes('available_adjustment:adjustment'));
assert.ok(compat.includes('currentInventoryLevel'));
assert.ok(compat.includes('adjustAbsolute'));
assert.ok(compat.includes('location_id:locationId'));
assert.ok(compat.includes('inventory_item_id:inventoryItemId'));
assert.ok(compat.includes('available'));
assert.ok(compat.includes('/admin\\/inventory_items\\/(\\d+)\\/locations\\/(\\d+)\\.json'));
assert.ok(compat.includes('/admin\\/inventory_levels\\/set\\.json'));
assert.ok(compat.includes('[400,404,405,409,422]'));
assert.ok(compat.includes('authSafeStatus'));

const continuous=read('sapo-stock-queue-continuous-background.js');
assert.ok(continuous.includes("const QUEUE_KEY='dhlSapoPushQueueV1'"));
assert.ok(continuous.includes("const LEGACY_STOCK_QUEUE_CUTOFF=Date.parse('2026-09-28T00:00:00Z')"));
assert.ok(continuous.includes('function isLegacyZeroProgress403'));
assert.ok(continuous.includes('async function purgeLegacyZeroProgress403'));
assert.ok(continuous.includes('chrome.storage.local.remove(QUEUE_KEY)'));
assert.ok(continuous.includes('last.skipped=true'));
assert.ok(continuous.includes('queue.index=index+1'));
assert.ok(continuous.includes("queue.status=done?'done':'running'"));
assert.ok(continuous.includes("queue.manualPaused=false"));
assert.ok(continuous.includes('isSystemError'));
assert.ok(continuous.includes('sapo http (401|403|405|408|429|5\\d\\d)'));
assert.ok(continuous.includes('sapo http 404.*request path is not found'));
assert.ok(continuous.includes('recoverLegacyPost405Queue'));
assert.ok(continuous.includes('recoverOpaque400Queue'));
assert.ok(continuous.includes('isOpaque400'));
assert.ok(continuous.includes('repeatedSystem400'));
assert.ok(continuous.includes('queue.opaque400RecoveredAt'));
assert.ok(continuous.includes('queue.index=0'));
assert.ok(continuous.includes('queue.successRows=[]'));
assert.ok(continuous.includes('queue.skippedRows=[]'));
assert.ok(continuous.includes('queue.recoveryHistory'));
assert.ok(continuous.includes('clearConsumedManualCache'));
assert.ok(continuous.includes("const MANUAL_ALARM='dhl-sapo-manual-push-queue'"));
assert.ok(continuous.includes("const AUTO_ALARM='dhl-sapo-push-queue'"));

for(const file of ['manual-sapo-background.js','auto-sync-background-v2.js','sapo-product-create-background.js']){
  const src=read(file);
  assert.ok(src.includes('function sapoErrorDetail'));
  assert.ok(src.includes('JSON.stringify(candidate)'));
}

const background=read('background.js');
assert.ok(background.includes("'sapo-inventory-set-compat.js'"));
assert.ok(background.includes("'sapo-stock-queue-continuous-background.js'"));
assert.ok(background.indexOf("'sapo-inventory-set-compat.js'")<background.indexOf("'auto-sync-background-v2.js'"));
assert.ok(background.indexOf("'sapo-inventory-set-compat.js'")<background.indexOf("'manual-sapo-background.js'"));
assert.ok(background.indexOf("'sapo-stock-queue-continuous-background.js'")>background.indexOf("'manual-sapo-background.js'"));

const manualUi=read('manual-sapo-output-mode.js');
assert.ok(manualUi.includes("const LEGACY_STOCK_QUEUE_CUTOFF=Date.parse('2026-09-28T00:00:00Z')"));
assert.ok(manualUi.includes('function staleLegacy403'));
assert.ok(manualUi.includes('await chrome.storage.local.remove(QUEUE_KEY)'));
assert.ok(!manualUi.includes('Hàng đợi Sapo thủ công đang dừng'));

const manualBg=read('manual-sapo-background.js');
assert.ok(manualBg.includes("const LEGACY_STOCK_QUEUE_CUTOFF=Date.parse('2026-09-28T00:00:00Z')"));
assert.ok(manualBg.includes('function staleLegacy403Queue'));
assert.ok(manualBg.includes('await chrome.storage.local.remove(SAPO_QUEUE_KEY)'));

const report=read('sapo-push-report-mode.js');
assert.ok(report.includes('HOÀN TẤT CÓ LỖI'));
assert.ok(report.includes('ĐÃ BỎ QUA'));
assert.ok(report.includes('DÒNG LỖI ĐÃ BỎ QUA'));
assert.ok(report.includes('const processed=Number(q.index||0)'));
assert.ok(report.includes('Lượt đẩy ID:'));
assert.ok(!report.includes('Queue ID:'));

console.log('SAPO STOCK WRITE COMPAT PASS',{
  cascade:'POST set -> PUT set -> POST adjust',
  opaque400Recovery:true,
  structuredErrors:true,
  stale403:'purged without clearing manual cache'
});
