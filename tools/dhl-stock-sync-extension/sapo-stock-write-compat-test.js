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
assert.ok(compat.includes('[400,404,405,409,422]'));
assert.ok(compat.includes('authSafeStatus'));

const manualBg=read('manual-sapo-background.js');
assert.ok(manualBg.includes('function sapoErrorDetail'));
assert.ok(manualBg.includes('JSON.stringify(candidate)'));
assert.ok(manualBg.includes('async function writeStockWith403Fallback'));
assert.ok(manualBg.includes('/admin/variants/${variantId}.json'));
assert.ok(manualBg.includes("inventory_management:'bizweb'"));
assert.ok(manualBg.includes('inventory_quantity:Number(row.stock)'));
assert.ok(manualBg.includes('/Sapo HTTP 403:\\s*access_denied/i'));
assert.ok(manualBg.includes("variant-fallback-403"));
assert.ok(manualBg.includes("const mapKey=`${storeHost(sapo.storeHost)}|${Number(sapo.locationId)}|${variantId?`v:${variantId}`:`s:${skuKey}`}`"));
assert.ok(manualBg.includes('const PUSH_CHUNK=12'));
assert.ok(manualBg.includes('function isFatalPushError'));
assert.ok(manualBg.includes('Lỗi riêng một SKU không được làm dừng cả queue.'));
assert.ok(manualBg.includes("queue.status=queue.failed>0?'done-with-errors':'done'"));
assert.ok(manualBg.includes("message.type==='DHL_SAPO_PUSH_CANCEL'"));

const processBody=(manualBg.match(/async function processManualQueue\(\)\{([\s\S]*?)\n  \}\n\n  async function cancelManualPush/)||[])[1]||'';
assert.ok(processBody);
assert.ok(!/await sleep\(/.test(processBody),'Không được sleep cố định giữa từng SKU');

const productBg=read('sapo-product-create-background.js');
assert.ok(productBg.includes('function sapoErrorDetail'));
assert.ok(productBg.includes('JSON.stringify(candidate)'));

const background=read('background.js');
assert.ok(background.includes("'sapo-inventory-set-compat.js'"));
assert.ok(background.includes("'manual-sapo-background.js'"));
assert.ok(background.indexOf("'sapo-inventory-set-compat.js'")<background.indexOf("'manual-sapo-background.js'"));
assert.ok(!background.includes("'sapo-stock-queue-continuous-background.js'"),'Không được bật continuous stock retry cũ');
assert.ok(!background.includes("'auto-sync-background-v2.js'"),'Không được bật auto stock sync cũ');

const manualUi=read('manual-sapo-output-mode.js');
assert.ok(manualUi.includes('ĐẨY LÊN SAPO'));
assert.ok(manualUi.includes('DỪNG ĐẨY SAPO'));
assert.ok(manualUi.includes("queue.status==='done-with-errors'"));
assert.ok(manualUi.includes('Cache vẫn giữ để có thể đẩy lại hoặc tải Excel.'));

console.log('SAPO STOCK WRITE COMPAT PASS',{
  cascade:'POST set -> PUT set -> POST adjust',
  manualQueue:'chunk 12, row errors continue',
  continuousLegacy:false,
  cancel:true
});
