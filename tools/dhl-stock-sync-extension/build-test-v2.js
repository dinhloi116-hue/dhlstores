const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const manifest=JSON.parse(read('manifest.json'));
const pkg=JSON.parse(read('package.json'));

assert.strictEqual(manifest.manifest_version,3);
assert.strictEqual(pkg.version,manifest.version,'package.json và manifest phải cùng version');
assert.ok(manifest.permissions.includes('alarms'));
assert.ok(manifest.permissions.includes('sidePanel'));
assert.ok(manifest.host_permissions.includes('https://si.aobongda.net/*'));
assert.ok(manifest.host_permissions.includes('https://*.mysapo.net/*'));

const runtimeFiles=[
  'background.js','popup.html','popup.css',
  'safe-category-guard.js','stock-core.js','dom-stock-parser.js','visible-category-grid-core.js','content.js',
  'match-core.js','shop-rules.js','generic-shop-rules.js','xlsx-lite.js',
  'warehouse-core.js','generic-warehouse-mode.js','kids-product-size-mode.js','warehouse-sku-link-mode.js',
  'stock-history-core.js','batch-stock-core.js','scan-quality-core.js','stock-branch-core.js','excel-sku-core.js','stock-import-core.js','auto-sync-core.js',
  'sapo-inventory-resolver-core.js','sapo-inventory-set-compat.js',
  'manual-job-runner-background.js','manual-job-runner-mode.js',
  'manual-sapo-background.js','manual-sapo-output-mode.js',
  'sapo-product-create-background.js','sapo-product-create-continuous-background.js',
  'auto-sync-safety-background.js','saved-profiles-mode.js','tool-reset-mode.js','batch-stock-cache-mode.js',
  'lazy-product-mode.js','workflow-order-mode.js',
  'product-create-core.js','catalog-ui-shell.js','catalog-popup-v3-mode.js',
  'sapo-product-create-mode.js','single-product-add-mode.js'
];
for(const file of runtimeFiles)assert.ok(fs.existsSync(path.join(dir,file)),`Thiếu runtime file: ${file}`);

const background=read('background.js');
assert.ok(background.includes("'manual-job-runner-background.js'"));
assert.ok(background.includes("'scan-quality-core.js'"),'Thiếu core kiểm tra chất lượng quét');
assert.ok(background.includes("'manual-sapo-background.js'"));
assert.ok(background.includes("'sapo-inventory-set-compat.js'"));
assert.ok(background.includes("'sapo-product-create-background.js'"));
assert.ok(background.includes("'sapo-product-create-continuous-background.js'"));
assert.ok(background.includes("'auto-sync-safety-background.js'"));
assert.ok(!background.includes("'auto-sync-background-v2.js'"),'Không được load auto scan cũ');
assert.ok(!background.includes("'sapo-stock-queue-continuous-background.js'"),'Không được load stock auto-retry cũ');
assert.ok(background.includes('migrateToManualOnlyMode'));
assert.ok(background.includes('autoPushSapo: false'));

const runnerBg=read('manual-job-runner-background.js');
assert.ok(runnerBg.includes("type:'DHL_SCAN_ONE_DESCRIPTOR_POPUP_ONLY'"),'Quét tồn phải popup-only để đủ size');
assert.ok(!runnerBg.includes("type:'DHL_SCAN_ONE_DESCRIPTOR',descriptor"),'Không được API-first cho tồn kho');
assert.ok(runnerBg.includes('const sourceTabId=Number(message.sourceTabId)||0'),'Phải dùng đúng ID tab nguồn');
assert.ok(runnerBg.includes('await chrome.tabs.get(sourceTabId)'),'Phải lấy tab đang mở');
assert.ok(runnerBg.includes('sameCategoryPage(tab.url,job.sourceUrl)'),'Phải chặn đổi danh mục');
assert.ok(runnerBg.includes('if(!tab.active)'),'Chỉ quét tab đang được xem');
assert.ok(!runnerBg.includes('chrome.windows.create('),'Không được mở cửa sổ quét');
assert.ok(!runnerBg.includes('chrome.windows.remove('),'Không được đóng cửa sổ người dùng');
assert.ok(!runnerBg.includes('chrome.tabs.create('),'Không được mở tab quét');
assert.ok(!runnerBg.includes('chrome.tabs.remove('),'Không được đóng tab người dùng');
assert.ok(runnerBg.includes('if(!retrying&&job.index<=3&&job.consecutiveEmpty>=3)'),'Ba popup đầu lỗi phải chuyển vào hàng đợi quét lại');
assert.ok(runnerBg.includes("await finalize(job,'retry-paused')"),'Phải tạm dừng an toàn khi hết số lượt quét lại');
assert.ok(runnerBg.includes('const CHUNK_SIZE=4'),'Phải dùng lại tốc độ quét gốc');
assert.ok(runnerBg.includes('scheduleNext(80)'),'Giữ nhịp 80ms cho timer');
assert.ok(runnerBg.includes('setTimeout(()=>processStep().catch(()=>{})'),'Không chờ alarm 30 giây sau mỗi nhóm');
assert.ok(runnerBg.includes('await checkpoint(job)'),'Phải checkpoint sau từng sản phẩm');
assert.ok(runnerBg.includes("dhlCatalogSkuMode:'manual-background-popup-full'"));

const manualPush=read('manual-sapo-background.js');
assert.ok(manualPush.includes('const PUSH_CHUNK=12'),'Sapo push phải dùng chunk nhanh');
assert.ok(manualPush.includes('function isFatalPushError'));
assert.ok(manualPush.includes('Lỗi riêng một SKU không được làm dừng cả queue.'));
assert.ok(manualPush.includes("queue.status=queue.failed>0?'done-with-errors':'done'"));
assert.ok(manualPush.includes("message.type==='DHL_SAPO_PUSH_CANCEL'"));
const processBody=(manualPush.match(/async function processManualQueue\(\)\{([\s\S]*?)\n  \}\n\n  async function cancelManualPush/)||[])[1]||'';
assert.ok(processBody,'Không tìm thấy processManualQueue');
assert.ok(!/await sleep\(/.test(processBody),'Không được sleep cố định giữa SKU');
assert.ok(manualPush.includes('if(isFatalPushError(message))'),'Chỉ lỗi hệ thống mới pause');

const popup=read('popup.html');
for(const file of [
  'saved-profiles-mode.js','tool-reset-mode.js','manual-job-runner-mode.js','batch-stock-cache-mode.js',
  'manual-sapo-output-mode.js','lazy-product-mode.js','workflow-order-mode.js'
]) assert.ok(popup.includes(file),`Popup thiếu ${file}`);
for(const old of ['auto-sync-mode.js','auto-sync-safety-mode.js','auto-sync-ui-sticky-mode.js','sapo-push-report-mode.js']){
  assert.ok(!popup.includes(old),`Popup không được load module cũ ${old}`);
}

const lazy=read('lazy-product-mode.js');
for(const file of ['match-core.js','shop-rules.js','product-create-core.js','catalog-ui-shell.js','catalog-popup-v3-mode.js','sapo-product-create-mode.js','single-product-add-mode.js']){
  assert.ok(lazy.includes(`'${file}'`),`Lazy product thiếu ${file}`);
}

const resetUi=read('tool-reset-mode.js');
assert.ok(resetUi.includes('LÀM MỚI TOOL'));
assert.ok(!/RESET_KEYS=[\\s\\S]*dhlAutoSyncConfigV1[\\s\\S]*\\];/.test(resetUi),'Reset không được xóa config Sapo');
assert.ok(resetUi.includes('location.reload()'));
assert.ok(resetUi.includes("panelCleanupPort=chrome.runtime.connect({name:'dhl-stock-sync-panel'})"),'Panel phải giữ kết nối tự dọn trên vòng đời Side Panel');
const cleanupBg=background;
assert.ok(cleanupBg.includes('PANEL_AUTO_CLEANUP_KEYS'),'Phải có whitelist cache tạm');
assert.ok(cleanupBg.includes('chrome.runtime.onConnect.addListener'),'Phải theo dõi Side Panel đóng');
assert.ok(cleanupBg.includes("['queued','running','stopping','paused'].includes(scan.status)"),'Không dọn giữa lượt quét');
assert.ok(cleanupBg.includes("['running','paused'].includes(product.status)"),'Không dọn tác vụ tạo sản phẩm');
assert.ok(!cleanupBg.slice(cleanupBg.indexOf('const PANEL_AUTO_CLEANUP_KEYS'),cleanupBg.indexOf('async function cleanupPanelCloseCache')).includes("'dhlSavedStockProfilesV1'"),'Không được xóa hồ sơ nguồn');

const runnerUi=read('manual-job-runner-mode.js');
assert.ok(runnerUi.includes('ĐỒNG BỘ TAB NÀY'));
assert.ok(runnerUi.includes('TÙY CHỌN NÂNG CAO'));
assert.ok(runnerUi.includes('chrome.tabs.onActivated.addListener'));
assert.ok(runnerUi.includes('sourceTabId:tab.tabId'));

const manualUi=read('manual-sapo-output-mode.js');
assert.ok(manualUi.includes('ĐẨY LÊN SAPO'));
assert.ok(manualUi.includes('DỪNG ĐẨY SAPO'));
assert.ok(manualUi.includes("type:'DHL_SAPO_PUSH_MANUAL'"));
assert.ok(manualUi.includes("type:'DHL_SAPO_PUSH_CANCEL'"));
assert.ok(manualUi.includes("queue.status==='done-with-errors'"));

const workflow=read('workflow-order-mode.js');
assert.ok(workflow.includes("document.getElementById('manualJobRunner')"));
assert.ok(workflow.includes("document.getElementById('batchPendingBox')"));
assert.ok(workflow.includes("document.getElementById('profileHistory')"));
assert.ok(workflow.includes('#autoSyncPanel'),'Legacy panel phải bị ẩn nếu còn DOM cũ');

const content=read('content.js');
assert.ok(content.includes("message.type === 'DHL_SCAN_ONE_DESCRIPTOR_POPUP_ONLY'"));
assert.ok(content.includes('async function scanHdLivePopupOnly'));

const productBg=read('sapo-product-create-background.js');
assert.ok(productBg.includes("'/admin/products.json'"));
assert.ok(productBg.includes('Checkpoint sau từng size'));
assert.ok(productBg.includes('setVariantStockWithRetry'));

console.log('BUILD CURRENT PASS',{
  version:manifest.version,
  inventoryScan:'popup-only full variants',
  stockPush:'manual chunk 12 + row-error continue',
  startup:'lite + lazy product modules',
  architecture:'manual-only'
});
