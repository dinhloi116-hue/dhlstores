const fs=require('fs');
const assert=require('assert');
const ui=fs.readFileSync(__dirname+'/single-product-add-mode.js','utf8');
const popup=fs.readFileSync(__dirname+'/popup.html','utf8');
const lazy=fs.readFileSync(__dirname+'/lazy-product-mode.js','utf8');
const content=fs.readFileSync(__dirname+'/content.js','utf8');

assert.ok(ui.includes("type:'DHL_SCAN_CURRENT_POPUP'"));
assert.ok(ui.includes("productCreate.makeApiProducts([result])"));
assert.ok(ui.includes("type:'DHL_SAPO_PRODUCT_CREATE_START'"));
assert.ok(ui.includes('QUÉT 1 SP ĐANG MỞ'));
assert.ok(ui.includes('ĐĂNG 1 SP LÊN SAPO'));
assert.ok(ui.includes('TẠO EXCEL 1 SP'));
assert.ok(ui.includes('cột A Đường dẫn/Alias làm SKU gốc'));
assert.ok(ui.includes('SKU Sapo = Đường dẫn/Alias + Size'));
assert.ok(!popup.includes('<script src="single-product-add-mode.js"></script>'),'Không nạp 1-SP mode lúc mở panel');
assert.ok(lazy.includes("'single-product-add-mode.js'"),'1-SP mode phải được lazy-load trong phần Thêm sản phẩm');
assert.ok(content.includes('const popupParentId=core.extractParentIdFromHtml(root.outerHTML'));
assert.ok(content.includes('const candidates=findProductLinksInDocument(document,location.href)'));
assert.ok(content.includes('const card=candidates.find(item=>Number(item&&item.id)===parentId)||null'));
assert.ok(content.includes('title:core.normalizeText(card&&card.title)||productTitleFromDocument()'));
assert.ok(content.includes('cardFound:Boolean(card)'));

console.log('SINGLE PRODUCT ADD PASS',{
  scan:'current popup only',
  sku:'column A alias + size',
  create:'direct Sapo',
  excelFallback:true,
  identity:'same card descriptor as batch scan'
});
