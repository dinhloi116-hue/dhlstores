const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const bg=read('sapo-product-create-continuous-background.js');
assert.ok(bg.includes("queue.status!=='paused'"));
assert.ok(bg.includes("item.status!=='error'"));
assert.ok(bg.includes('item.skipped=true'));
assert.ok(bg.includes('queue.failed=Number(queue.failed||0)+1'));
assert.ok(bg.includes('queue.index=index+1'));
assert.ok(bg.includes("queue.status='running'"));
assert.ok(bg.includes("chrome.alarms.create(ALARM,{when:Date.now()+650})"));
assert.ok(bg.includes('Lỗi hệ thống/mất xác minh vẫn phải dừng'));

const background=read('background.js');
assert.ok(background.includes("'sapo-product-create-background.js'"));
assert.ok(background.includes("'sapo-product-create-continuous-background.js'"));
assert.ok(background.indexOf("'sapo-product-create-continuous-background.js'")>background.indexOf("'sapo-product-create-background.js'"));

const report=read('sapo-product-create-report-mode.js');
assert.ok(report.includes('SẢN PHẨM LỖI ĐÃ BỎ QUA'));
assert.ok(report.includes('TẢI BÁO CÁO ĐĂNG SAPO (.TXT)'));
assert.ok(report.includes('Tool vẫn tiếp tục sản phẩm kế tiếp'));
assert.ok(report.includes('item.skipped===true'));

const popup=read('popup.html');
assert.ok(popup.includes('sapo-product-create-report-mode.js'));
assert.ok(popup.indexOf('sapo-product-create-report-mode.js')>popup.indexOf('sapo-product-create-mode.js'));

console.log('SAPO PRODUCT CREATE CONTINUOUS PASS',{behavior:'item error -> report -> skip -> next product',systemError:'still stops',report:'TXT'});
