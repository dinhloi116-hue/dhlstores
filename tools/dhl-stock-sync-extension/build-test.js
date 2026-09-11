const fs = require('fs');
const path = require('path');
const assert = require('assert');
const dir = __dirname;

const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.strictEqual(manifest.manifest_version, 3);
assert.ok(manifest.host_permissions.includes('https://si.aobongda.net/*'));
assert.ok(!manifest.host_permissions.some((x) => /sapo/i.test(x)), 'Extension không truy cập Sapo trực tiếp');
assert.ok(manifest.permissions.includes('sidePanel'));
assert.ok(manifest.permissions.includes('scripting'));
assert.strictEqual(manifest.side_panel.default_path, 'popup.html');
assert.ok(!manifest.action.default_popup);
for (const file of manifest.content_scripts[0].js) assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);
for (const file of ['background.js','popup.html','popup.js','popup.css','catalog-mode.js','catalog-generic-mode.js','maintenance-ui.js','simple-mode.js','one-file-mode.js','warehouse-core.js','generic-warehouse-mode.js','stock-import-core.js','product-create-core.js','shop-rules.js','generic-shop-rules.js','match-core.js','xlsx-lite.js','xlsx-preserve.js','dom-stock-parser.js']) {
  assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);
}

const popupHtml = fs.readFileSync(path.join(dir, 'popup.html'), 'utf8');
assert.ok(popupHtml.includes('Chọn file Quản lý kho Sapo'));
assert.ok(popupHtml.includes('templateStep" style="display:none"'));
assert.ok(popupHtml.includes('QUÉT KHO TRANG ĐANG MỞ'));
assert.ok(popupHtml.includes('ĐẦU RA = FILE NHẬP TỒN KHO CHÍNH THỨC SAPO'));
assert.ok(popupHtml.includes('generic-shop-rules.js'));
assert.ok(popupHtml.includes('generic-warehouse-mode.js'));
assert.ok(popupHtml.includes('product-create-core.js'));
assert.ok(popupHtml.includes('catalog-generic-mode.js'));
assert.ok(popupHtml.includes('one-file-mode.js'));
assert.ok(popupHtml.includes('maintenance-ui.js'));

const content = fs.readFileSync(path.join(dir, 'content.js'), 'utf8');
assert.ok(content.includes('DHL_SCAN_HD_LIVE'));
assert.ok(content.includes('openStockPopup'));
assert.ok(content.includes('discoverCurrentCategory'));
assert.ok(content.includes('detectedSizesFromRoot'));
assert.ok(content.includes('navigation-guard-v1'), 'Scanner phải có guard chống nhảy trang chi tiết');
assert.ok(content.includes('inertActionHref'), 'Scanner phải loại link điều hướng thật');
assert.ok(content.includes('clickQuickCandidate'), 'Scanner phải click quick action với preventDefault');
assert.ok(!content.includes('HD_PATH'), 'Scanner không được khóa cứng danh mục HD');

const popupJs = fs.readFileSync(path.join(dir, 'popup.js'), 'utf8');
assert.ok(popupJs.includes('ensureCurrentCategoryTab'));
assert.ok(!popupJs.includes('ensureHdCategoryTab'));
assert.ok(popupJs.includes('DHL_SCAN_HD_LIVE'));
assert.ok(popupJs.includes('variantMatches'));
assert.ok(!popupJs.includes('fullMatchReady'));

const domParser = fs.readFileSync(path.join(dir, 'dom-stock-parser.js'), 'utf8');
assert.ok(domParser.includes('FREESIZE'));
assert.ok(domParser.includes('[1-9]\\d'));

const genericWarehouse = fs.readFileSync(path.join(dir, 'generic-warehouse-mode.js'), 'utf8');
assert.ok(genericWarehouse.includes('parseGenericWarehouse'));
assert.ok(genericWarehouse.includes('genericSizes:true'));

const stockImport = fs.readFileSync(path.join(dir, 'stock-import-core.js'), 'utf8');
assert.ok(stockImport.includes('Cập nhật tồn kho phiên bản sản phẩm'));
assert.ok(stockImport.includes("'Tên phiên bản sản phẩm','SKU*','Mã lô','Ngày sản xuất','Hạn sử dụng','Tồn kho','Vị trí lưu kho'"));
assert.ok(stockImport.includes('buildOfficialInventoryWorkbook'));

const genericRules = fs.readFileSync(path.join(dir, 'generic-shop-rules.js'), 'utf8');
assert.ok(genericRules.includes('generatedSkuBaseForStandardName'));
assert.ok(genericRules.includes('generatedAliasForStandardName'));

const productCreate = fs.readFileSync(path.join(dir, 'product-create-core.js'), 'utf8');
assert.ok(productCreate.includes("'Đường dẫn/Alias','Tên sản phẩm*'"));
assert.ok(productCreate.includes("'Ảnh đại diện'"));
assert.ok(productCreate.includes("'Ảnh phiên bản'"));
assert.ok(productCreate.includes("'Cửa hàng chính_Tồn kho'"));
assert.ok(productCreate.includes('buildWorkbook'));

const oneFile = fs.readFileSync(path.join(dir, 'one-file-mode.js'), 'utf8');
assert.ok(oneFile.includes('TẠO FILE NHẬP TỒN KHO SAPO'));
assert.ok(oneFile.includes("sapoData.inputType==='warehouse'"));
assert.ok(oneFile.includes('buildOfficialInventoryWorkbook'));
assert.ok(oneFile.includes('skuBaseForStandardName'));
assert.ok(oneFile.includes('SAPO_NHAP_TON_KHO_'));

const catalogGeneric = fs.readFileSync(path.join(dir, 'catalog-generic-mode.js'), 'utf8');
assert.ok(catalogGeneric.includes('QUÉT SẢN PHẨM TRANG ĐANG MỞ'));
assert.ok(catalogGeneric.includes('TẠO FILE SẢN PHẨM SAPO (.XLSX)'));
assert.ok(catalogGeneric.includes('imageUrl'));
assert.ok(catalogGeneric.includes('DHL_SCAN_CURRENT_POPUP'));

const maintenanceUi = fs.readFileSync(path.join(dir, 'maintenance-ui.js'), 'utf8');
assert.ok(maintenanceUi.includes('BẢO TRÌ NGUỒN'));
assert.ok(maintenanceUi.includes('Chỉ dùng khi web có sản phẩm / màu mới'));
assert.ok(maintenanceUi.includes('body.hidden = true'));

console.log('BUILD PASS', {
  version: manifest.version,
  scanner: 'current category + dynamic text/numeric sizes + no product-detail navigation',
  dailyInput: 'Sapo warehouse export',
  inventoryOutput: 'official Sapo inventory import template',
  newProductOutput: 'Sapo product import template + image links + stock',
  maintenanceCatalog: 'collapsed by default',
  sourceHost: manifest.host_permissions[0]
});
