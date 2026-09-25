const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const manifest=JSON.parse(read('manifest.json'));
assert.strictEqual(manifest.manifest_version,3);
assert.strictEqual(manifest.version,'0.19.3');
assert.ok(manifest.permissions.includes('alarms'));
assert.ok(manifest.host_permissions.includes('https://si.aobongda.net/*'));
assert.ok(manifest.host_permissions.includes('https://*.mysapo.net/*'));

for(const file of [
  'background.js','auto-sync-core.js','sapo-inventory-resolver-core.js','auto-sync-background-v2.js',
  'manual-sapo-background.js','sapo-product-create-background.js','auto-sync-safety-background.js','auto-sync-mode.js','auto-sync-safety-mode.js','auto-sync-ui-sticky-mode.js',
  'manual-sapo-output-mode.js','sapo-product-create-mode.js','single-product-add-mode.js','auto-sync-excel-mode.js','sapo-push-report-mode.js','workflow-order-mode.js',
  'batch-stock-core.js','stock-history-core.js','product-create-core.js','popup.html','popup.js','content.js'
]) assert.ok(fs.existsSync(path.join(dir,file)),`Thiếu ${file}`);

const background=read('background.js');
assert.ok(background.includes("'shop-rules.js'"));
assert.ok(background.includes("'generic-shop-rules.js'"));
assert.ok(background.indexOf("'shop-rules.js'")<background.indexOf("'auto-sync-background-v2.js'"));
assert.ok(background.includes("'sapo-inventory-resolver-core.js'"));
assert.ok(background.includes("'sapo-product-create-background.js'"));
assert.ok(background.includes("'auto-sync-background-v2.js'"));
assert.ok(background.includes("'manual-sapo-background.js'"));
assert.ok(!background.includes("\n  'auto-sync-background.js',"),'Không được chạy đồng thời background Sapo cũ và v2');
assert.ok(background.indexOf("'warehouse-sku-link-mode.js'")<background.indexOf("'auto-sync-background-v2.js'"));
assert.ok(background.indexOf("'manual-sapo-background.js'")>background.indexOf("'auto-sync-background-v2.js'"));

const autoCore=read('auto-sync-core.js');
assert.ok(autoCore.includes("master:'alias_size_exact'"));
assert.ok(autoCore.includes('const sourceGroups=matcher.groupSourceVariants(sourceResults||[])'));
assert.ok(autoCore.includes("matchedBy:'alias-size-exact'"));
assert.ok(autoCore.includes('sourceOnlySkuCount'));
assert.ok(autoCore.includes('generatedSkuCount:0'));
assert.ok(autoCore.includes('MASTER: cột A "Đường dẫn/Alias"'));

const savedProfiles=read('saved-profiles-mode.js');
assert.ok(savedProfiles.includes('autoCore.prepareRows(activeData.warehouseData, activeData.catalogData, latestSource, matcher, rules)'));
assert.ok(savedProfiles.includes('const hints = []; // Quét TOÀN BỘ'));
assert.ok(savedProfiles.includes('Cột A Đường dẫn/Alias là SKU GỐC'));

const batchCache=read('batch-stock-cache-mode.js');
assert.ok(batchCache.includes('autoCore.prepareRows(warehouseData,catalogData,sourceResults,matcher,rules)'));
assert.ok(batchCache.includes('sourceProductCount'));
assert.ok(batchCache.includes('generatedSkuCount:0'));
assert.ok(batchCache.includes('matchedSkuCount'));
assert.ok(batchCache.includes('sourceOnlySkuCount'));

const bg=read('auto-sync-background-v2.js');
assert.ok(bg.includes("const BATCH_KEY='dhlPendingStockBatchV1'"));
assert.ok(bg.includes("const ALARM='dhl-auto-stock-sync'"));
assert.ok(bg.includes("const PUSH_ALARM='dhl-sapo-push-queue'"));
assert.ok(bg.includes("chrome.tabs.create({url,active:false})"));
assert.ok(bg.includes('hints=[]; // luôn quét toàn bộ sản phẩm/màu/size của trang nguồn'));
assert.ok(bg.includes('variantTotal:Number(prepared.sourceVariantCount||prepared.rows.length)'));
assert.ok(bg.includes('autoCore.prepareRows(parsed.warehouseData,parsed.catalogData,sourceResults,matcher,rules)'));
assert.ok(bg.includes("type:'DHL_SCAN_HD_LIVE'"));
assert.ok(bg.includes("'/admin/store.json'"));
assert.ok(bg.includes("'/admin/locations.json'"));
assert.ok(bg.includes('/admin/inventory_items.json'));
assert.ok(bg.includes('/admin/variants/'));
assert.ok(bg.includes('resolver.findCandidate'));
assert.ok(bg.includes('successRows'));
assert.ok(bg.includes("inventory_level:{available:Number(row.stock)}"));
assert.ok(bg.includes('cycle.errors.length===0'));
assert.ok(bg.includes('PUSH_CHUNK=20'));
assert.ok(bg.includes("if(!config.autoPushSapo||!config.sapo||!config.sapo.verifiedAt)"));
assert.ok(bg.includes('let configSaveChain=Promise.resolve()'));
assert.ok(bg.includes('const pending=configSaveChain.then(run,run)'));
assert.ok(bg.includes("writeStatus({enabled:false,nextRunAt:0,intervalHours:config.intervalHours})"));
assert.ok(bg.includes('await saveConfig({sapo:verified})'));

// Inventory item lookup: variant_id là khóa chính và KHÔNG kèm location_id.
assert.ok(bg.includes("tryInventoryQuery(sapo,row,{variant_id:String(row.variantId)},'variant')"));
assert.ok(bg.includes("const q=new URLSearchParams({...params,limit:'50'})"));
assert.ok(!bg.includes("new URLSearchParams({...params,location_id:String(sapo.locationId),limit:'50'})"));
assert.ok(bg.includes("new URLSearchParams({limit:String(LIST_PAGE_LIMIT),page:String(page)})"));
assert.ok(!bg.includes("new URLSearchParams({location_id:String(sapo.locationId),limit:String(LIST_PAGE_LIMIT),page:String(page)})"));

// Queue tự động phải checkpoint sau TỪNG dòng thành công; retry không reset index/success.
assert.ok(bg.includes('Lưu NGAY sau từng dòng thành công'));
assert.ok(bg.includes("await chrome.storage.local.set({[SAPO_MAP_KEY]:map,[SAPO_QUEUE_KEY]:queue});\n        await writeStatus({push:pushState(queue,'running',config)});"));
assert.ok(bg.includes("if(q&&q.status==='paused'){q.status='running';await chrome.storage.local.set({[SAPO_QUEUE_KEY]:q})"));
assert.ok(!bg.includes('q.index=0'));

const manualBg=read('manual-sapo-background.js');
assert.ok(manualBg.includes("const BATCH_KEY='dhlManualPendingStockBatchV1'"));
assert.ok(manualBg.includes("message.type!=='DHL_SAPO_PUSH_MANUAL'"));
assert.ok(manualBg.includes("source:'manual'"));
assert.ok(manualBg.includes('manualPaused'));
assert.ok(manualBg.includes("tryInventoryQuery(sapo,row,{variant_id:String(row.variantId)},'variant')"));
assert.ok(manualBg.includes("inventory_level:{available:Number(row.stock)}"));
assert.ok(manualBg.includes('await chrome.storage.local.set({[SAPO_MAP_KEY]:map,[SAPO_QUEUE_KEY]:queue})'));
assert.ok(manualBg.includes('sourceScans:sourceScanMap(entries)'));
assert.ok(manualBg.includes('Number(entry.scannedAt||0)===Number(scannedAt||0)'));
assert.ok(manualBg.includes('try{await clearConsumedManualCache(queue);}catch{}'));
assert.ok(!manualBg.includes('autoPushSapo===true'));

const resolver=read('sapo-inventory-resolver-core.js');
assert.ok(resolver.includes('variant_id là định danh chính'));
assert.ok(resolver.includes('Number(x&&x.variant_id)===variantId'));
assert.ok(resolver.includes('normSku'));
assert.ok(resolver.includes("for(const key of ['data','result'])"));
assert.ok(resolver.includes('data.data&&data.data.variant'));
assert.ok(resolver.includes('data.result&&data.result.variant'));
assert.ok(resolver.indexOf('const byProductSku=')<resolver.indexOf('const bySku='));

const contentScanner=read('content.js');
assert.ok(contentScanner.includes('collectSourceSkuBundle'));
assert.ok(contentScanner.includes('scanDescriptorApiFast'));
assert.ok(contentScanner.includes("const concurrency=Math.min(3,Math.max(1,links.length))"));
assert.ok(contentScanner.includes("stage:'popup-fallback'"));
assert.ok(contentScanner.includes("scanMethod: 'category-alias-size'"));
assert.ok(contentScanner.includes("skuRule:'alias+size'"));
assert.ok(contentScanner.includes("message.type === 'DHL_SCAN_ONE_DESCRIPTOR'"));
assert.ok(contentScanner.includes('waitForPopupRefresh(before, expectedPath, 8000)'));

const catalogScanner=read('catalog-popup-v3-mode.js');
assert.ok(catalogScanner.includes("dhlCatalogSkuMode:'new-product-alias-size'"));
assert.ok(catalogScanner.includes('QUÉT TẤT CẢ SẢN PHẨM MỚI'));
assert.ok(catalogScanner.includes("type:'DHL_SCAN_HD_LIVE'"));
assert.ok(catalogScanner.includes("chrome.storage.local.remove(['dhlCatalogResults','dhlCatalogAt','dhlCatalogSkuSamples'])"));
assert.ok(catalogScanner.includes('không đọc SKU cũ'));


const productCore=read('product-create-core.js');
assert.ok(productCore.includes('function makeApiProducts'));
assert.ok(productCore.includes('images,'));
assert.ok(productCore.includes('variants')); 
assert.ok(productCore.includes('validHttpUrl'));
assert.ok(productCore.includes('variantImage'));
assert.ok(productCore.includes('Cột A "Đường dẫn/Alias" chính là SKU GỐC'));
assert.ok(productCore.includes('row[16]=`${skuBase}-${size}`'));
assert.ok(productCore.includes('sku:`${skuBase}-${size}`'));

const productBg=read('sapo-product-create-background.js');
assert.ok(productBg.includes("const QUEUE_KEY='dhlSapoProductCreateQueueV1'"));
assert.ok(productBg.includes("'/admin/products.json'"));
assert.ok(productBg.includes("sapoFetch(sapo,'/admin/products.json',{method:'POST'"));
assert.ok(productBg.includes("images:(item.images||[]).map((src,index)=>({src"));
assert.ok(productBg.includes("options:[{name:'Size'}]"));
assert.ok(productBg.includes("inventory_management:'bizweb'"));
assert.ok(productBg.includes("inventory_quantity:0"));
assert.ok(productBg.includes('/images.json'));
assert.ok(productBg.includes("inventory_level:{available:Number(expected.stock)}"));
assert.ok(productBg.includes('findExistingByAlias'));
assert.ok(productBg.includes('sameExpectedSkus'));
assert.ok(productBg.includes('Checkpoint ngay sau POST'));
assert.ok(productBg.includes("message.type==='DHL_SAPO_PRODUCT_CREATE_RETRY'"));

const popup=read('popup.html');
assert.ok(popup.includes('manual-sapo-output-mode.js'));
assert.ok(popup.includes('sapo-product-create-mode.js'));
assert.ok(popup.includes('single-product-add-mode.js'));
assert.ok(popup.includes('auto-sync-ui-sticky-mode.js'));
assert.ok(popup.includes('auto-sync-excel-mode.js'));
assert.ok(popup.includes('sapo-push-report-mode.js'));
assert.ok(popup.includes('workflow-order-mode.js'));
assert.ok(popup.indexOf('sapo-product-create-mode.js')>popup.indexOf('product-branch-mode.js'));
assert.ok(popup.indexOf('single-product-add-mode.js')>popup.indexOf('sapo-product-create-mode.js'));
assert.ok(popup.indexOf('manual-sapo-output-mode.js')>popup.indexOf('batch-stock-cache-mode.js'));
assert.ok(popup.indexOf('auto-sync-excel-mode.js')>popup.indexOf('auto-sync-mode.js'));
assert.ok(popup.indexOf('workflow-order-mode.js')>popup.indexOf('sapo-push-report-mode.js'));

const productUi=read('sapo-product-create-mode.js');
assert.ok(productUi.includes('ĐĂNG THẲNG LÊN SAPO'));
assert.ok(productUi.includes("type:'DHL_SAPO_PRODUCT_CREATE_START'"));
assert.ok(productUi.includes("type:'DHL_SAPO_PRODUCT_CREATE_RETRY'"));
assert.ok(productUi.includes('makeApiProducts'));
assert.ok(productUi.includes('dữ liệu từ lượt quét mới'));
assert.ok(productUi.includes('SKU KHÔNG lấy từ dữ liệu cũ.'));
assert.ok(productUi.includes('Tool vẫn kiểm tra alias/SKU để tránh tạo trùng'));

const manualUi=read('manual-sapo-output-mode.js');
assert.ok(manualUi.includes("const BATCH_KEY='dhlManualPendingStockBatchV1'"));
assert.ok(manualUi.includes('TẢI FILE EXCEL'));
assert.ok(manualUi.includes('ĐẨY THẲNG LÊN SAPO'));
assert.ok(manualUi.includes("type:'DHL_SAPO_PUSH_MANUAL'"));
assert.ok(manualUi.includes("x.auto!==true"));
assert.ok(manualUi.includes('THỬ LẠI ĐẨY SAPO'));
assert.ok(manualUi.includes("if(el&&el.textContent!==value)el.textContent=value"));

const batchUi=read('batch-stock-cache-mode.js');
assert.ok(batchUi.includes("const BATCH_KEY='dhlManualPendingStockBatchV1'"));
assert.ok(batchUi.includes("const LEGACY_BATCH_KEY='dhlPendingStockBatchV1'"));
assert.ok(batchUi.includes('migrateLegacyManual'));
assert.ok(batchUi.includes('auto:false'));
assert.ok(batchUi.includes('x.auto!==true'));
assert.ok(batchUi.includes('BƯỚC 3 — CHỌN ĐẦU RA'));
assert.ok(batchUi.includes("chrome.storage.local.set({[BATCH_KEY]:{}})"));

const autoUi=read('auto-sync-mode.js');
assert.ok(autoUi.includes("persistPatch({enabled:wanted}"));
assert.ok(autoUi.includes("persistPatch({selectedProfileIds:collectSelectedProfileIds()}"));
assert.ok(autoUi.includes("persistPatch({autoPushSapo:Boolean(push.checked)}"));
assert.ok(autoUi.includes('refreshRuntime'));
assert.ok(autoUi.includes('4. Bật lịch tự động'));
assert.ok(autoUi.includes('let configSaveChain=Promise.resolve()'));
assert.ok(autoUi.includes('const pending=configSaveChain.then(run,run)'));
assert.ok(autoUi.includes('configSaveChain=pending.catch(()=>{})'));
assert.ok(!autoUi.includes("setInterval(()=>{if(document.getElementById('autoSyncPanel'))load()"));

const excel=read('auto-sync-excel-mode.js');
assert.ok(excel.includes("const BATCH_KEY='dhlPendingStockBatchV1'"));
assert.ok(excel.includes("const CYCLE_KEY='dhlAutoSyncCycleV1'"));
assert.ok(excel.includes('TẢI FILE EXCEL'));
assert.ok(excel.includes('buildOfficialInventoryWorkbook'));
assert.ok(excel.includes('selectedProfileIds'));
assert.ok(excel.includes('entry.auto===true'));
assert.ok(excel.includes('cycle.running'));
assert.ok(excel.includes('cycle.errors.length'));
assert.ok(excel.includes('Number(entry.scannedAt||0)===Number(result.scannedAt||0)'));
assert.ok(excel.includes('Cache và hàng đợi Sapo vẫn được giữ nguyên'));
assert.ok(!excel.includes("chrome.storage.local.set({[BATCH_KEY]:{}})"));

const report=read('sapo-push-report-mode.js');
assert.ok(report.includes('ĐÃ NẠP TỒN KHO LÊN SAPO THÀNH CÔNG'));
assert.ok(report.includes('NẠP SAPO CHƯA HOÀN TẤT'));
assert.ok(report.includes("label:'ĐANG NẠP'"));
assert.ok(report.includes("label:'THẤT BẠI'"));
assert.ok(report.includes('manualPaused===true'));
assert.ok(report.includes('TẢI BÁO CÁO NẠP SAPO (.TXT)'));
assert.ok(report.includes('Shop:'));
assert.ok(report.includes('Còn lại:'));
assert.ok(report.includes('tồn định ghi'));
assert.ok(report.includes('successRows'));

const workflow=read('workflow-order-mode.js');
assert.ok(workflow.includes("document.getElementById('profileQuickTabs')"));
assert.ok(workflow.includes("document.getElementById('uiV2Panel')"));
assert.ok(workflow.includes("document.getElementById('batchPendingBox')"));
assert.ok(workflow.includes("document.getElementById('autoSyncPanel')"));
assert.ok(workflow.includes('BƯỚC 1 — CHỌN HỒ SƠ CẦN QUÉT'));
assert.ok(workflow.includes('BƯỚC 2 — QUÉT TAB NGUỒN'));
assert.ok(workflow.includes("document.getElementById('catalogMode')"));
assert.ok(workflow.includes('SP mới: quét cả danh mục 1 lượt'));


const profileTabs=read('profile-tabs-mode.js');
assert.ok(profileTabs.includes('profileTabsSignature'));
assert.ok(profileTabs.includes('if (rendering) return false'));
assert.ok(profileTabs.includes('requestAnimationFrame'));

console.log('BUILD V2 PASS',{version:manifest.version,sapoResolver:'variant first + nested API shapes + product/SKU fallback',queue:'per-row checkpoint + retry same index',manual:'dedicated cache + safe cleanup after successful direct Sapo push',newProducts:'direct Sapo POST + src image links + Size variants + stock checkpoint/retry',auto:'serialized config writes + stale-cycle-safe Excel',autoUi:'serialized control saves + runtime refresh without form rebuild',workflow:'profile -> scan -> output -> optional automation',report:'manual pause + status/remaining/error detail + TXT'});
