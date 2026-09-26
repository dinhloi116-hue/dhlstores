const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const compat=read('sapo-inventory-set-compat.js');
assert.ok(compat.includes('/admin/inventory_levels/set.json'));
assert.ok(compat.includes("method: 'PUT'"));
assert.ok(compat.includes('location_id: locationId'));
assert.ok(compat.includes('inventory_item_id: inventoryItemId'));
assert.ok(compat.includes('available'));
assert.ok(compat.includes('/admin\\/inventory_items\\/(\\d+)\\/locations\\/(\\d+)\\.json'));
assert.ok(compat.includes('/admin/inventory_levels.json?inventory_item_id='));
assert.ok(compat.includes('/admin/variants/${variantId}.json'));
assert.ok(compat.includes('inventory_quantity_adjustment: adjustment'));
assert.ok(compat.includes('available - currentAvailable'));
assert.ok(compat.includes('[404, 405]'));

const continuous=read('sapo-stock-queue-continuous-background.js');
assert.ok(continuous.includes("const QUEUE_KEY='dhlSapoPushQueueV1'"));
assert.ok(continuous.includes('last.skipped=true'));
assert.ok(continuous.includes('queue.index=index+1'));
assert.ok(continuous.includes("queue.status=done?'done':'running'"));
assert.ok(continuous.includes("queue.manualPaused=false"));
assert.ok(continuous.includes('isSystemError'));
assert.ok(continuous.includes('sapo http (401|403|405|408|429|5\\d\\d)'));
assert.ok(continuous.includes('sapo http 404.*request path is not found'));
assert.ok(continuous.includes('recoverLegacyPost405Queue'));
assert.ok(continuous.includes('errors.every(e=>isLegacyPost405'));
assert.ok(continuous.includes('queue.index=0'));
assert.ok(continuous.includes('queue.successRows=[]'));
assert.ok(continuous.includes('queue.skippedRows=[]'));
assert.ok(continuous.includes('queue.recoveryHistory'));
assert.ok(continuous.includes('clearConsumedManualCache'));
assert.ok(continuous.includes("const MANUAL_ALARM='dhl-sapo-manual-push-queue'"));
assert.ok(continuous.includes("const AUTO_ALARM='dhl-sapo-push-queue'"));

const background=read('background.js');
assert.ok(background.includes("'sapo-inventory-set-compat.js'"));
assert.ok(background.includes("'sapo-stock-queue-continuous-background.js'"));
assert.ok(background.indexOf("'sapo-inventory-set-compat.js'")<background.indexOf("'auto-sync-background-v2.js'"));
assert.ok(background.indexOf("'sapo-inventory-set-compat.js'")<background.indexOf("'manual-sapo-background.js'"));
assert.ok(background.indexOf("'sapo-stock-queue-continuous-background.js'")>background.indexOf("'manual-sapo-background.js'"));

const report=read('sapo-push-report-mode.js');
assert.ok(report.includes('HOÀN TẤT CÓ LỖI'));
assert.ok(report.includes('ĐÃ BỎ QUA'));
assert.ok(report.includes('DÒNG LỖI ĐÃ BỎ QUA'));
assert.ok(report.includes('const processed=Number(q.index||0)'));

console.log('SAPO STOCK WRITE COMPAT PASS');
