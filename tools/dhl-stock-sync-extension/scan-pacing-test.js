const fs=require('fs'); const assert=require('assert');
const bg=fs.readFileSync(__dirname+'/manual-job-runner-background.js','utf8');
const content=fs.readFileSync(__dirname+'/content.js','utf8');
const ui=fs.readFileSync(__dirname+'/manual-job-runner-mode.js','utf8');
const catalog=fs.readFileSync(__dirname+'/catalog-popup-v3-mode.js','utf8');
// Chrome alarm không được ép nghỉ 30s sau mỗi chunk.
assert.ok(bg.includes('const CHUNK_SIZE=4'));
assert.ok(bg.includes('scheduleNext(80)'));
assert.ok(bg.includes('setTimeout(()=>processStep().catch(()=>{})'));
assert.ok(bg.includes('when:Date.now()+30000'));
assert.ok(bg.includes('let stepInFlight=false'));
assert.ok(bg.includes('if(stepInFlight)return'));
// Quét trên tab độc lập, không chiếm tab người dùng.
assert.ok(bg.includes('chrome.windows.create({'));
assert.ok(bg.includes("type:'normal'"));
assert.ok(bg.includes('focused:false'));
assert.ok(bg.includes('chrome.windows.remove(job.scanWindowId)'));
assert.ok(bg.includes('job.ownsWindow=true'));
assert.ok(bg.includes('if(job.index<=3&&job.consecutiveEmpty>=3)'));
assert.ok(bg.includes('job.lastPopupError'));
assert.ok(bg.includes('if(job.ownsTab===true'));
assert.ok(bg.includes('tabId:0,'));
assert.ok(!bg.includes('job.tabId=preferredId'));
assert.ok(ui.includes('job.ownsTab===true&&Number(job.tabId)===Number(tab.id)'));
assert.ok(ui.includes('Có thể chuyển tab'));
// Tăng tốc nhưng vẫn đợi dữ liệu ổn định và giữ retry khi thiếu size.
assert.ok(content.includes('index===0?4600:2400'));
assert.ok(content.includes('await sleep(70)'));
assert.ok(content.includes('stable >= 1'));
assert.ok(content.includes('stable >= 3'));
assert.ok(content.includes('elapsed >= 650'));
assert.ok(content.includes('stableTargetRows(currentRoot, targetSizes, 1800, cancelVersion)'));
assert.ok(content.includes('targetSelection.controls.length ? null : await firstVariant'));
assert.ok(content.includes("if(findStockRoot())throw new Error('Popup chưa đóng"));
assert.ok(catalog.includes('await sleep(180)'));
assert.ok(catalog.includes('await sleep(120)'));
console.log('SCAN PACING PASS: unfocused active scan window, early abort, stable stock validation');
