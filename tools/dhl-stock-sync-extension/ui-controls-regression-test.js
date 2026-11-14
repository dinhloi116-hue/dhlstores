const fs=require('fs');
const path=require('path');
const assert=require('assert');
const vm=require('vm');
const dir=__dirname;
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');
const html=read('popup.html');
const profile=read('saved-profiles-mode.js');
const runner=read('manual-job-runner-mode.js');
const reset=read('tool-reset-mode.js');
const layout=read('workflow-order-mode.js');
const scripts=[...html.matchAll(/src="([^"]+\.js)"/g)].map(x=>x[1]);

const unique=new Set(scripts);
assert.strictEqual(unique.size,scripts.length,'Duplicate module in popup');
for(const filename of scripts){
  assert.ok(fs.existsSync(path.join(dir,filename)),'Missing UI module: '+filename);
  new vm.Script(read(filename),{filename});
}
assert.ok(scripts.includes('manual-job-runner-mode.js'),'Main scan module not loaded');
assert.ok(scripts.includes('stock-history-mode.js'),'Stock history module not loaded');
assert.ok(scripts.indexOf('stock-history-core.js')<scripts.indexOf('stock-history-mode.js'));
assert.ok(scripts.indexOf('saved-profiles-mode.js')<scripts.indexOf('manual-job-runner-mode.js'));
assert.ok(profile.includes('id="stockSyncRescueBtn"'),'Main scan recovery button is missing');
assert.ok(profile.includes("addEventListener('click',fallbackSync)"),'Recovery control not connected');
assert.ok(profile.includes("type:'DHL_MANUAL_JOB_START'"),'Recovery must start the actual scan job');
assert.ok(runner.includes('id="manualStartBtn"'),'Advanced runner lost primary action');
assert.ok(runner.includes("rescue.style.display='none'"),'Duplicate fallback not hidden after runner mounts');
assert.ok(!layout.includes('#sapoPushReportPanel,#stockHistoryPanel'),'History panel forcibly hidden');
for(const name of ['dhlSavedStockProfilesV1','dhlStockHistoryV1','dhlStockScanHistoryV1','dhlManualStockReportV1','dhlSelectedStockProfileId']){
  assert.ok(!reset.includes("'"+name+"'"),'Reset must preserve persistent data: '+name);
}
const manifest=JSON.parse(read('manifest.json'));
const pkg=JSON.parse(read('package.json'));
assert.strictEqual(pkg.version,manifest.version,'Extension version mismatch');
assert.ok(html.includes('v'+pkg.version),'Visible version is stale');
console.log('UI CONTROLS REGRESSION PASS: main scan available, history mounted, profiles protected');

const iconSizes=[16,32,48,128];
const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
for(const size of iconSizes){
  const expected='icons/icon-'+size+'.png';
  assert.strictEqual(manifest.icons[String(size)],expected,'Missing extension icon '+size);
  assert.strictEqual(manifest.action.default_icon[String(size)],expected,'Missing toolbar icon '+size);
  const png=fs.readFileSync(path.join(dir,expected));
  assert.ok(png.subarray(0,8).equals(pngSignature),'Invalid PNG icon '+size);
  assert.strictEqual(png.readUInt32BE(16),size,'Unexpected PNG width '+size);
  assert.strictEqual(png.readUInt32BE(20),size,'Unexpected PNG height '+size);
}
assert.ok(html.includes('src="icons/icon-32.png"'),'Side panel logo missing');
console.log('BRANDED ICON PASS: 16 / 32 / 48 / 128 PNGs referenced by manifest and panel');
