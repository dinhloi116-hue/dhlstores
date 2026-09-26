const fs=require('fs');
const assert=require('assert');
const path=require('path');
const dir=__dirname;
const core=require('./auto-sync-core.js');

const background=fs.readFileSync(path.join(dir,'auto-sync-background.js'),'utf8');
const safetyBg=fs.readFileSync(path.join(dir,'auto-sync-safety-background.js'),'utf8');
const safetyUi=fs.readFileSync(path.join(dir,'auto-sync-safety-mode.js'),'utf8');
const bgEntry=fs.readFileSync(path.join(dir,'background.js'),'utf8');
const popup=fs.readFileSync(path.join(dir,'popup.html'),'utf8');
const ui=fs.readFileSync(path.join(dir,'auto-sync-mode.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));

for(const hours of [1,2,3]){
  assert.strictEqual(core.normalizeConfig({intervalHours:hours}).intervalHours,hours);
}
assert.strictEqual(core.normalizeConfig({intervalHours:0}).intervalHours,2);
assert.strictEqual(core.normalizeConfig({intervalHours:4}).intervalHours,2);

assert.ok(manifest.permissions.includes('alarms'),'Thiếu quyền alarms');
assert.ok(manifest.host_permissions.includes('https://si.aobongda.net/*'),'Thiếu host nguồn');
assert.ok(manifest.host_permissions.includes('https://*.mysapo.net/*'),'Thiếu host Sapo');

assert.ok(background.includes("periodInMinutes:config.intervalHours*60"),'Lịch phải chạy đúng chu kỳ giờ');
assert.ok(background.includes("chrome.tabs.create({url,active:false})"),'Tab tự động phải mở nền');
assert.ok(background.includes("chrome.tabs.remove(tab.id)"),'Phải đóng tab sau quét khi bật tùy chọn');
assert.ok(background.includes("cycle.errors.length===0"),'Có lỗi hồ sơ thì không được coi lượt quét thành công');
assert.ok(background.includes("config.autoPushSapo===true"),'Chỉ ghi Sapo khi người dùng chủ động bật');
assert.ok(background.includes("config.sapo.verifiedAt"),'Phải xác minh Sapo trước khi ghi');
assert.ok(background.includes("config.sapo.locationId"),'Phải có chi nhánh xác minh trước khi ghi');
assert.ok(background.includes("if(!key||!secret)throw new Error"),'Thiếu key/secret phải chặn request Sapo');

assert.ok(ui.includes("${verified?'':'disabled'}"),'Checkbox tự ghi phải khóa khi chưa xác minh');
assert.ok(ui.includes("autoPushSapo:false"),'Kiểm tra kết nối phải tắt tự ghi trước khi xác minh');

for(const field of ['storeHost','apiKey','apiSecret'])assert.ok(safetyBg.includes(field),`Safety guard phải theo dõi ${field}`);
assert.ok(safetyBg.includes('autoPushSapo:false'),'Đổi credential phải tắt tự ghi');
assert.ok(safetyBg.includes('verifiedAt:0'),'Đổi credential phải xóa xác minh cũ');
assert.ok(safetyBg.includes('locationId:0'),'Đổi credential phải xóa location cũ');
assert.ok(safetyUi.includes("cb.checked=false;cb.disabled=true"),'UI phải khóa ngay tự ghi khi credential thay đổi');
assert.ok(bgEntry.indexOf("'auto-sync-safety-background.js'")>bgEntry.indexOf("'auto-sync-background.js'"),'Safety background phải load sau auto sync');
assert.ok(popup.indexOf('auto-sync-safety-mode.js')>popup.indexOf('auto-sync-mode.js'),'Safety UI phải load sau auto sync UI');

// Không có khóa thật nào được hard-code trong code tự động.
assert.ok(!/apiSecret\s*:\s*['\"][^'\"]{8,}['\"]/.test(background),'Không được hard-code API Secret');
assert.ok(!/apiKey\s*:\s*['\"][^'\"]{8,}['\"]/.test(background),'Không được hard-code API Key');

console.log('AUTO SYNC SAFETY PASS');
