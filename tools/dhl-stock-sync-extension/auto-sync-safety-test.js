const fs=require('fs');
const assert=require('assert');
const path=require('path');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const manifest=JSON.parse(read('manifest.json'));
const background=read('background.js');
const safetyBg=read('auto-sync-safety-background.js');
const popup=read('popup.html');

assert.ok(manifest.permissions.includes('alarms'),'Thiếu quyền alarms');
assert.ok(manifest.host_permissions.includes('https://si.aobongda.net/*'),'Thiếu host nguồn');
assert.ok(manifest.host_permissions.includes('https://*.mysapo.net/*'),'Thiếu host Sapo');

// Kiến trúc hiện tại là manual-only: mở tool không được tự chạy lịch quét cũ.
assert.ok(!background.includes("'auto-sync-background-v2.js'"),'Không được load auto-sync background v2');
assert.ok(!background.includes("'auto-sync-background.js'"),'Không được load auto-sync background cũ');
assert.ok(background.includes('migrateToManualOnlyMode'),'Phải có migration tắt lịch auto cũ');
assert.ok(background.includes('enabled: false'),'Migration phải tắt auto sync');
assert.ok(background.includes('autoPushSapo: false'),'Migration phải tắt auto push Sapo');
assert.ok(background.includes("'dhl-auto-stock-sync'"),'Migration phải dọn alarm auto cũ');
assert.ok(background.includes("'dhl-auto-stock-step'"),'Migration phải dọn alarm step cũ');

// Safety credential vẫn được giữ ở background để invalidation xác minh cũ còn an toàn.
for(const field of ['storeHost','apiKey','apiSecret'])assert.ok(safetyBg.includes(field),`Safety guard phải theo dõi ${field}`);
assert.ok(safetyBg.includes('autoPushSapo:false'),'Đổi credential phải tắt autoPush cũ');
assert.ok(safetyBg.includes('verifiedAt:0'),'Đổi credential phải xóa verifiedAt');
assert.ok(safetyBg.includes('locationId:0'),'Đổi credential phải xóa locationId');

// UI mới không load các panel auto-sync cũ.
assert.ok(!popup.includes('auto-sync-mode.js'),'Popup không được load auto-sync UI cũ');
assert.ok(!popup.includes('auto-sync-safety-mode.js'),'Popup không được load safety UI cũ');
assert.ok(popup.includes('manual-job-runner-mode.js'),'Popup phải dùng Job Runner thủ công');
assert.ok(popup.includes('manual-sapo-output-mode.js'),'Popup phải có đầu ra Sapo thủ công');

// Không hard-code credential thật trong background đang chạy.
assert.ok(!/apiSecret\s*:\s*['"][^'"]{8,}['"]/.test(background),'Không được hard-code API Secret');
assert.ok(!/apiKey\s*:\s*['"][^'"]{8,}['"]/.test(background),'Không được hard-code API Key');

console.log('MANUAL-ONLY SAFETY PASS');
