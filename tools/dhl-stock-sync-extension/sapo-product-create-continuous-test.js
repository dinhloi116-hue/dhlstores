const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const bg=read('sapo-product-create-continuous-background.js');
assert.ok(bg.includes("queue.status!=='paused'"));
assert.ok(bg.includes("item.status!=='error'"));
assert.ok(bg.includes('function isSystemError'));
assert.ok(bg.includes('if(isSystemError(item.error))'));
assert.ok(bg.includes('queue.systemPaused=true'));
assert.ok(bg.includes('Request path is not found'));
assert.ok(bg.includes('item.skipped=true'));
assert.ok(bg.includes('queue.failed=Number(queue.failed||0)+1'));
assert.ok(bg.includes('queue.index=index+1'));
assert.ok(bg.includes("queue.status='running'"));
assert.ok(bg.includes("chrome.alarms.create(ALARM,{when:Date.now()+650})"));
assert.ok(bg.includes('Lỗi hệ thống/mất xác minh/endpoint phải dừng toàn queue'));

const productBg=read('sapo-product-create-background.js');
assert.ok(productBg.includes("while(queue.index<queue.items.length&&queue.items[queue.index]&&queue.items[queue.index].status==='done')"));
assert.ok(productBg.includes('retry unfinished product/image/stock checkpoints'));
assert.ok(productBg.includes("item.status=Number(item.productId)?'stock':'pending'"));
assert.ok(productBg.includes('queue.index=unfinished[0]'));
assert.ok(productBg.includes("queue.success=items.filter(item=>item&&item.status==='done').length"));
assert.ok(productBg.includes('Giữ nguyên productId/imageIndex/variantIndex'));

const background=read('background.js');
assert.ok(background.includes("'sapo-product-create-background.js'"));
assert.ok(background.includes("'sapo-product-create-continuous-background.js'"));
assert.ok(background.indexOf("'sapo-product-create-continuous-background.js'")>background.indexOf("'sapo-product-create-background.js'"));

const report=read('sapo-product-create-report-mode.js');
assert.ok(report.includes('CẦN XỬ LÝ TIẾP ẢNH / TỒN'));
assert.ok(report.includes('TẢI BÁO CÁO ĐĂNG SAPO (.TXT)'));
assert.ok(report.includes('cần xử lý tiếp'));
assert.ok(report.includes('item.skipped===true'));

const popup=read('popup.html');
const lazy=read('lazy-product-mode.js');
assert.ok(!popup.includes('sapo-product-create-report-mode.js'),'Report không nạp lúc mở panel');
assert.ok(lazy.includes("'sapo-product-create-report-mode.js'"));
assert.ok(lazy.indexOf("'sapo-product-create-report-mode.js'")>lazy.indexOf("'sapo-product-create-mode.js'"));

console.log('SAPO PRODUCT CREATE CONTINUOUS PASS',{behavior:'item error -> report -> skip -> next product',systemError:'still stops',report:'TXT'});
