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
assert.ok(manifest.permissions.includes('tabs'));
assert.strictEqual(manifest.side_panel.default_path, 'popup.html');
assert.ok(!manifest.action.default_popup);
assert.strictEqual(manifest.content_scripts[0].js[0], 'safe-category-guard.js', 'Guard phải chạy trước scanner');
for (const file of manifest.content_scripts[0].js) assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);
for (const file of ['background.js','safe-category-guard.js','popup.html','popup.js','popup.css','catalog-ui-shell.js','catalog-mode.js','catalog-generic-mode.js','catalog-api-mode.js','maintenance-ui.js','simple-mode.js','one-file-mode.js','warehouse-core.js','generic-warehouse-mode.js','stock-import-core.js','product-create-core.js','shop-rules.js','generic-shop-rules.js','match-core.js','xlsx-lite.js','xlsx-preserve.js','dom-stock-parser.js']) {
  assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);
}

const popupHtml = fs.readFileSync(path.join(dir, 'popup.html'), 'utf8');
assert.ok(popupHtml.includes('Chọn file Quản lý kho Sapo'));
assert.ok(popupHtml.includes('templateStep" style="display:none"'));
assert.ok(popupHtml.includes('QUÉT KHO TRANG ĐANG MỞ'));
assert.ok(popupHtml.includes('ĐẦU RA = FILE NHẬP TỒN KHO CHÍNH THỨC SAPO'));
assert.ok(popupHtml.includes('generic-shop-rules.js'));
assert.ok(popupHtml.includes('generic-warehouse-mode.js'));
assert.ok(popupHtml.includes('kids-product-size-mode.js'));
assert.ok(popupHtml.includes('product-create-core.js'));
assert.ok(popupHtml.includes('catalog-ui-shell.js'), 'Phải dùng UI shell không có redirect HD');
assert.ok(!popupHtml.includes('<script src="catalog-mode.js"></script>'), 'Không được load scanner legacy ép tab sang HD');
assert.ok(popupHtml.includes('catalog-generic-mode.js'));
assert.ok(popupHtml.includes('catalog-api-mode.js'));
assert.ok(popupHtml.indexOf('catalog-ui-shell.js') < popupHtml.indexOf('catalog-generic-mode.js'), 'UI shell phải mount trước scanner danh mục an toàn');
assert.ok(popupHtml.indexOf('catalog-generic-mode.js') < popupHtml.indexOf('catalog-api-mode.js'), 'API mode phải override scanner cũ sau cùng');
assert.ok(popupHtml.includes('one-file-mode.js'));
assert.ok(popupHtml.includes('maintenance-ui.js'));

const catalogShell = fs.readFileSync(path.join(dir, 'catalog-ui-shell.js'), 'utf8');
assert.ok(catalogShell.includes('scanCatalogSource'));
assert.ok(catalogShell.includes('exportCatalogSource'));
assert.ok(catalogShell.includes('QUÉT TOÀN BỘ TRANG ĐANG MỞ'));
assert.ok(catalogShell.includes('không tự chuyển sang danh mục khác'));
assert.ok(!catalogShell.includes('chrome.tabs.update'), 'UI shell tuyệt đối không được đổi URL tab nguồn');
assert.ok(!catalogShell.includes('/hd-pc36029.html'), 'UI shell không được khóa cứng HD người lớn');

const safeGuard = fs.readFileSync(path.join(dir, 'safe-category-guard.js'), 'utf8');
assert.ok(safeGuard.includes('data-dhl-safe-action'));
assert.ok(safeGuard.includes("anchor.setAttribute('href', 'javascript:void(0)')"));
assert.ok(safeGuard.includes('event.preventDefault()'));
assert.ok(!safeGuard.includes('stopImmediatePropagation'), 'Guard không được chặn AJAX/delegated handler của web nguồn');
assert.ok(safeGuard.includes('MutationObserver'), 'Sản phẩm lazy-load cũng phải được bảo vệ');

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
assert.ok(domParser.includes('SIZE_TOKEN'));

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
assert.ok(oneFile.includes('products_export'), 'Luồng tạo file phải yêu cầu file Sapo có SKU');
assert.ok(oneFile.includes('hasOriginalSku'), 'Nút tạo file phải kiểm tra SKU gốc thay vì inputType warehouse');
assert.ok(!oneFile.includes("sapoData.inputType==='warehouse'"), 'Không được khóa nút chỉ vì file không phải warehouse export');
assert.ok(oneFile.includes('buildOfficialInventoryWorkbook'));
assert.ok(oneFile.includes("row.sapo&&row.sapo.sku"), 'File tồn phải dùng SKU gốc từ Sapo');
assert.ok(!oneFile.includes('skuBaseForStandardName'), 'Không được tự map/sinh SKU khi cập nhật tồn');
assert.ok(oneFile.includes('SAPO_NHAP_TON_KHO_'));
assert.ok(oneFile.includes('branchNameOneFile'), 'Phải có ô chi nhánh để product export vẫn tạo được file tồn chuẩn');

const catalogApi = fs.readFileSync(path.join(dir, 'catalog-api-mode.js'), 'utf8');
assert.ok(catalogApi.includes('/product/child?psId='));
assert.ok(catalogApi.includes('api-child-sequential-no-click'));
assert.ok(catalogApi.includes('TEST NHANH 1 SP'));
assert.ok(catalogApi.includes('KHÔNG click'));
assert.ok(catalogApi.includes('replaceButton'));
assert.ok(catalogApi.includes('scanProductApi'));
assert.ok(!catalogApi.includes('chrome.tabs.create('), 'API maintenance scan không được tạo tab nền');

const maintenanceUi = fs.readFileSync(path.join(dir, 'maintenance-ui.js'), 'utf8');
assert.ok(maintenanceUi.includes('BẢO TRÌ NGUỒN'));
assert.ok(maintenanceUi.includes('Chỉ dùng khi web có sản phẩm / màu mới'));
assert.ok(maintenanceUi.includes('body.hidden = true'));
assert.ok(maintenanceUi.includes('NẠP LẠI TOOL SAU KHI PULL CODE'));
assert.ok(maintenanceUi.includes('chrome.runtime.reload()'));

console.log('BUILD PASS', {
  version: manifest.version,
  scanner: 'current category + no legacy HD redirect + dynamic text/numeric sizes',
  matching: 'exact normalized product name + exact size; unmatched rows skipped',
  inventorySku: 'original Sapo SKU only',
  inventoryInput: 'product export with original SKU; warehouse export may supply branch only',
  maintenanceScan: 'API /product/child sequential scan, zero clicks, zero worker tabs',
  quickTest: 'one product via API only',
  devReload: 'pull code then chrome.runtime.reload',
  inventoryOutput: 'official Sapo inventory import template',
  newProductOutput: 'Sapo product import template + image links + stock',
  sourceHost: manifest.host_permissions[0]
});
