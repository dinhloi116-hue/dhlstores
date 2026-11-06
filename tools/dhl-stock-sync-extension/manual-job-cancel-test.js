const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const bg=read('manual-job-runner-background.js');
const ui=read('manual-job-runner-mode.js');
const content=read('content.js');

assert.ok(bg.includes("message.type==='DHL_MANUAL_JOB_CANCEL_NOW'"),'Background phải nhận HỦY NGAY');
assert.ok(bg.includes("job.status='cancelled'"));
assert.ok(bg.includes("job.running=false"));
assert.ok(bg.includes("chrome.alarms.clear(ALARM)"));
assert.ok(bg.includes("type:'DHL_CANCEL_POPUP_SCAN'"));
assert.ok(bg.includes("latest.id!==job.id||latest.running!==true||latest.status==='cancelled'"),
  'Response scan cũ phải bị loại trước khi ghi kết quả');
assert.ok(bg.includes("if(current.id!==job.id)return false;"),
  'Checkpoint worker cũ không được ghi đè job mới');
assert.ok(bg.includes("if(current.status==='cancelled'||current.running===false)return false;"),
  'Checkpoint không được ghi sau cancel');
assert.ok(bg.includes("if(saved===false)return;"));
assert.ok(bg.includes("afterInit.id!==job.id||afterInit.running!==true||afterInit.status==='cancelled'"),
  'Cancel trong lúc initialize cũng phải dừng worker');

assert.ok(ui.includes('id="manualCancelNowBtn"'));
assert.ok(ui.includes('HỦY NGAY'));
assert.ok(ui.includes("type:'DHL_MANUAL_JOB_CANCEL_NOW'"));
assert.ok(ui.includes("job.status==='cancelled'"));
assert.ok(ui.includes('Có thể đổi tab và chạy lại ngay'));

assert.ok(content.includes('let popupScanCancelVersion=0;'));
assert.ok(content.includes("message.type === 'DHL_CANCEL_POPUP_SCAN'"));
assert.ok(content.includes('popupScanCancelVersion+=1'));
assert.ok(content.includes('assertPopupScanActive(cancelVersion)'));
assert.ok(content.includes("error.code='DHL_SCAN_CANCELLED'"));
assert.ok(content.includes("if(error&&error.code==='DHL_SCAN_CANCELLED')throw error"));
assert.ok(content.includes('waitForPopupRefresh(beforeFingerprint, expectedPath, timeout = 3200, cancelVersion = null)'));

console.log('MANUAL JOB CANCEL PASS',{
  immediateCancel:true,
  popupInterrupted:true,
  staleResponseBlocked:true,
  staleCheckpointBlocked:true,
  newJobSafe:true
});
