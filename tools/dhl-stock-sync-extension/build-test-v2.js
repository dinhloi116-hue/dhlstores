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
  'auto-sync-safety-background.js','auto-sync-mode.js','auto-sync-safety-mode.js','auto-sync-ui-sticky-mode.js',
  'sapo-push-report-mode.js','batch-stock-core.js','stock-history-core.js','popup.html','popup.js','content.js'
]) assert.ok(fs.existsSync(path.join(dir,file)),`Thiếu ${file}`);

const background=read('background.js');
assert.ok(background.includes("'sapo-inventory-resolver-core.js'"));
assert.ok(background.includes("'auto-sync-background-v2.js'"));
assert.ok(!background.includes("\n  'auto-sync-background.js',"),'Không được chạy đồng thời background Sapo cũ và v2');
assert.ok(background.indexOf("'warehouse-sku-link-mode.js'")<background.indexOf("'auto-sync-background-v2.js'"));

const bg=read('auto-sync-background-v2.js');
assert.ok(bg.includes("const ALARM='dhl-auto-stock-sync'"));
assert.ok(bg.includes("const PUSH_ALARM='dhl-sapo-push-queue'"));
assert.ok(bg.includes("chrome.tabs.create({url,active:false})"));
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

// Inventory item lookup: variant_id là khóa chính và KHÔNG kèm location_id.
assert.ok(bg.includes("tryInventoryQuery(sapo,row,{variant_id:String(row.variantId)},'variant')"));
assert.ok(bg.includes("const q=new URLSearchParams({...params,limit:'50'})"));
assert.ok(!bg.includes("new URLSearchParams({...params,location_id:String(sapo.locationId),limit:'50'})"));
assert.ok(bg.includes("new URLSearchParams({limit:String(LIST_PAGE_LIMIT),page:String(page)})"));
assert.ok(!bg.includes("new URLSearchParams({location_id:String(sapo.locationId),limit:String(LIST_PAGE_LIMIT),page:String(page)})"));

// Queue phải checkpoint sau TỪNG dòng thành công; retry không reset index/success.
assert.ok(bg.includes('Lưu NGAY sau từng dòng thành công'));
assert.ok(bg.includes("await chrome.storage.local.set({[SAPO_MAP_KEY]:map,[SAPO_QUEUE_KEY]:queue});\n        await writeStatus({push:pushState(queue,'running',config)});"));
assert.ok(bg.includes("if(q&&q.status==='paused'){q.status='running';await chrome.storage.local.set({[SAPO_QUEUE_KEY]:q})"));
assert.ok(!bg.includes('q.index=0'));

const resolver=read('sapo-inventory-resolver-core.js');
assert.ok(resolver.includes('variant_id là định danh chính'));
assert.ok(resolver.includes('Number(x&&x.variant_id)===variantId'));
assert.ok(resolver.includes('normSku'));

const popup=read('popup.html');
assert.ok(popup.includes('auto-sync-ui-sticky-mode.js'));
assert.ok(popup.includes('sapo-push-report-mode.js'));
assert.ok(popup.indexOf('sapo-push-report-mode.js')>popup.indexOf('auto-sync-mode.js'));

const report=read('sapo-push-report-mode.js');
assert.ok(report.includes('ĐÃ NẠP TỒN KHO LÊN SAPO THÀNH CÔNG'));
assert.ok(report.includes('NẠP SAPO CHƯA HOÀN TẤT'));
assert.ok(report.includes("label:'ĐANG NẠP'"));
assert.ok(report.includes("label:'THẤT BẠI'"));
assert.ok(report.includes('TẢI BÁO CÁO NẠP SAPO (.TXT)'));
assert.ok(report.includes('Shop:'));
assert.ok(report.includes('Còn lại:'));
assert.ok(report.includes('tồn định ghi'));
assert.ok(report.includes('successRows'));

console.log('BUILD V2 PASS',{version:manifest.version,sapoResolver:'variant_id primary, no location_id lookup + SKU fallback',queue:'per-row checkpoint + retry same index',report:'status/remaining/error detail + TXT'});
