const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const popup=read('popup.html');
const css=read('popup.css');
const runner=read('manual-job-runner-mode.js');
const sapo=read('manual-sapo-output-mode.js');
const lazy=read('lazy-product-mode.js');
const workflow=read('workflow-order-mode.js');
const profiles=read('saved-profiles-mode.js');

const order=[
  'saved-profiles-mode.js',
  'manual-job-runner-mode.js',
  'batch-stock-cache-mode.js',
  'manual-sapo-output-mode.js',
  'lazy-product-mode.js',
  'workflow-order-mode.js'
];
let last=-1;
for(const file of order){
  const at=popup.indexOf(file);
  assert.ok(at>last,`Sai thứ tự startup UI: ${file}`);
  last=at;
}

assert.ok(runner.includes('id="manualStartBtn"'));
assert.ok(runner.includes('DỪNG SAU SP NÀY'));
assert.ok(runner.includes('TÙY CHỌN NÂNG CAO'));
assert.ok(runner.includes('manualJobProgressBar'));
assert.ok(runner.includes('manualJobProgressFill'));
assert.ok(runner.includes("fill.style.width=`${percent}%`"));
assert.ok(runner.includes("chrome.storage.onChanged.addListener"));
assert.ok(runner.includes("chrome.tabs.onActivated.addListener"));
assert.ok(!runner.includes('setInterval('),'Job Runner không được polling bằng setInterval');
assert.ok(!runner.includes('new MutationObserver'),'Job Runner không được dùng MutationObserver nền');

assert.ok(sapo.includes('ĐẨY LÊN SAPO'));
assert.ok(sapo.includes('DỪNG ĐẨY SAPO'));
assert.ok(sapo.includes('manualSapoProgress'));
assert.ok(sapo.includes('manualSapoProgressFill'));
assert.ok(!sapo.includes('setInterval('),'Sapo UI không được polling bằng setInterval');
assert.ok(!sapo.includes('new MutationObserver'),'Sapo UI không được dùng MutationObserver nền');

assert.ok(lazy.includes("document.dispatchEvent(new CustomEvent('dhl:product-modules-loaded'))"));
assert.ok(workflow.includes("document.addEventListener('dhl:product-modules-loaded',schedule)"));
assert.ok(workflow.includes('requestAnimationFrame'));
assert.ok(!workflow.includes('setInterval('));

assert.ok(css.includes('button:not(:disabled):hover'));
assert.ok(css.includes('button:not(:disabled):active'));
assert.ok(css.includes(':focus-visible'));
assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
assert.ok(css.includes('transition-duration:.01ms!important'));

const startup=[profiles,runner,sapo,lazy,workflow].join('\n');
assert.ok(!/animation\s*:\s*[^;]*infinite/i.test(startup),'Startup UI không được có animation infinite');

console.log('UI EFFECTS PASS',{
  startupOrder:true,
  progress:['scan','sapo'],
  lazyRelayout:true,
  polling:false,
  mutationObserver:false,
  reducedMotion:true,
  effects:'lightweight'
});
