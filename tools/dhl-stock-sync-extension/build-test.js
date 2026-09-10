const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;

const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
assert.strictEqual(manifest.manifest_version,3);
assert.strictEqual(manifest.version,'0.8.0');
assert.ok(manifest.host_permissions.includes('https://si.aobongda.net/*'));
assert.ok(!manifest.host_permissions.some(x=>/sapo/i.test(x)));
assert.ok(manifest.permissions.includes('sidePanel'));
assert.ok(manifest.permissions.includes('scripting'));
assert.ok(manifest.permissions.includes('tabs'));
assert.strictEqual(manifest.side_panel.default_path,'popup.html');
assert.strictEqual(manifest.background.service_worker,'background.js');
assert.ok(!manifest.action.default_popup);
assert.deepStrictEqual(manifest.content_scripts[0].js,['stock-core.js','dom-stock-parser.js','content.js']);
for(const file of ['background.js','stock-core.js','dom-stock-parser.js','content.js','match-core.js','xlsx-lite.js','xlsx-preserve.js','popup.html','popup.css','popup.js'])assert.ok(fs.existsSync(path.join(dir,file)),`Thiếu ${file}`);

const content=fs.readFileSync(path.join(dir,'content.js'),'utf8');
assert.ok(content.includes('DHL_DISCOVER_HD_2026'));
assert.ok(content.includes('DHL_SCAN_PAGE_DOM'));
assert.ok(content.includes('ensureStockRoot'));
assert.ok(content.includes('controls(root)'));
assert.ok(content.includes('readRows'));
assert.ok(content.includes('dom-popup'));
assert.ok(content.includes('/product/child?psId='),'Giữ 1 request API chỉ để lấy màu mặc định dự phòng');
assert.ok(!content.includes('collectForProduct'),'Không được quay lại vòng lặp child API cũ');

const popupJs=fs.readFileSync(path.join(dir,'popup.js'),'utf8');
assert.ok(popupJs.includes('scanHdViaTabs'));
assert.ok(popupJs.includes("chrome.tabs.create({url:'about:blank',active:false})"));
assert.ok(popupJs.includes('DHL_SCAN_PAGE_DOM'));
assert.ok(popupJs.includes("files:['dom-stock-parser.js']"));
assert.ok(popupJs.includes('fullMatchReady'));
assert.ok(popupJs.includes('buildErrorReport'));
assert.ok(popupJs.includes('DHL_STOCK_SYNC_LOI_'));
assert.ok(popupJs.includes('Phiên bản tool: 0.8.0'));
assert.ok(popupJs.includes('buildSapoImport'));

const xlsx=fs.readFileSync(path.join(dir,'xlsx-lite.js'),'utf8');
assert.ok(xlsx.includes('detectSizeDimension'));
assert.ok(xlsx.includes("label==='size'||label==='kichco'"));
assert.ok(xlsx.includes('sizeFromSku'));
assert.ok(xlsx.includes('skuBase'));

const preserve=fs.readFileSync(path.join(dir,'xlsx-preserve.js'),'utf8');
for(const field of ['Tên sản phẩm*','Mã SKU','Ảnh đại diện','Ảnh phiên bản','Giá','Giá so sánh','Giá vốn','Id phiên bản'])assert.ok(preserve.includes(field),`Thiếu bảo vệ ${field}`);
assert.ok(preserve.includes('chưa ghép đủ size'));

console.log('BUILD PASS',{version:manifest.version,scanner:'real DOM popup',backgroundTabs:true,dynamicColor:true,dynamicSize:true,txtDiagnostics:true,stockOnlyImport:true});
