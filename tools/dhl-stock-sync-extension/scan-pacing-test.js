const fs=require('fs');
const assert=require('assert');

const runner=fs.readFileSync(__dirname+'/manual-job-runner-background.js','utf8');
const content=fs.readFileSync(__dirname+'/content.js','utf8');
const catalog=fs.readFileSync(__dirname+'/catalog-popup-v3-mode.js','utf8');

assert.ok(runner.includes("const PRODUCT_SETTLE_MS=850"));
assert.ok(runner.includes("const CHUNK_SIZE=1"));
assert.ok(runner.includes("scheduleNext(PRODUCT_SETTLE_MS)"));
assert.ok(!runner.includes("const CHUNK_SIZE=4"));

assert.ok(content.includes("await sleep(130)"),'Popup reader phải polling chậm hơn');
assert.ok(content.includes("stable >= 2"),'Đủ size vẫn phải ổn định nhiều nhịp');
assert.ok(content.includes("stable >= 5"),'Dữ liệu chưa đủ phải ổn định lâu hơn');
assert.ok(content.includes("await sleep(420)"),'Đóng/mở popup phải có thời gian settle');
assert.ok(content.includes("await sleep(450)"),'Giữ popup sau khi đọc để DOM không trôi');
assert.ok(content.includes("await sleep(550)"),'Retry cùng SP phải chờ đủ lâu');

assert.ok(catalog.includes("await sleep(700)"),'Quét hàng loạt SP mới phải nghỉ giữa sản phẩm');
assert.ok(catalog.includes("await sleep(650)"),'Luồng popup batch phải có nhịp chờ an toàn');

console.log('SCAN PACING PASS',{
  oneProductPerTick:true,
  interProductMs:850,
  stableReads:true,
  popupSettle:true,
  batchSlowdown:true
});
