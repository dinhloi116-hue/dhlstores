const fs=require('fs');
const path=require('path');
const assert=require('assert');
const report=fs.readFileSync(path.join(__dirname,'sapo-product-create-report-mode.js'),'utf8');
const bg=fs.readFileSync(path.join(__dirname,'sapo-product-create-background.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'sapo-product-create-mode.js'),'utf8');

assert.ok(report.includes('Lượt đăng:'));
assert.ok(!report.includes('Queue:'));
assert.ok(report.includes('Đã có Product ID trên Sapo'));
assert.ok(report.includes('Hoàn tất toàn bộ quy trình'));
assert.ok(report.includes('CẦN XỬ LÝ TIẾP ẢNH / TỒN'));
assert.ok(report.includes("Bước lỗi: ${phase}"));
assert.ok(report.includes("phase==='TỒN KHO'"));
assert.ok(report.includes("item.imagesDone!==true"));
assert.ok(report.includes("Number(item&&item.productId)>0"));

assert.ok(bg.includes('item.createdCounted!==true'));
assert.ok(bg.includes('item.adoptedCounted!==true'));
assert.ok(bg.includes('queue.created=Number(queue.created||0)+1'));
assert.ok(bg.includes('queue.adopted=Number(queue.adopted||0)+1'));
assert.ok(!bg.includes('if(item.created)queue.created=Number(queue.created||0)+1'));
assert.ok(!bg.includes('if(item.adopted)queue.adopted=Number(queue.adopted||0)+1'));

assert.ok(ui.includes('sản phẩm đã có trên Sapo'));
assert.ok(ui.includes('hoàn tất đủ ảnh+tồn'));
assert.ok(ui.includes('cần xử lý tiếp'));

console.log('SAPO PRODUCT REPORT PASS',{
  productCreated:'counted immediately after Product ID',
  fullSuccess:'separate image + stock metric',
  report:'phase-aware'
});