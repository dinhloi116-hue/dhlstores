const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const preview=require('./stock-push-preview-core.js');
const quality=require('./scan-quality-core.js');
const batch=require('./batch-stock-core.js');
const excelSku=require('./excel-sku-core.js');
const branchCore=require('./stock-branch-core.js');
const content=fs.readFileSync(__dirname+'/content.js','utf8');
const background=fs.readFileSync(__dirname+'/background.js','utf8');
const excelUi=fs.readFileSync(__dirname+'/batch-stock-cache-mode.js','utf8');
const sapoBg=fs.readFileSync(__dirname+'/manual-sapo-background.js','utf8');
const sapoUi=fs.readFileSync(__dirname+'/manual-sapo-output-mode.js','utf8');

// Extraction of real popup selection helpers rather than duplicating logic.
const start=content.indexOf('  function exactColor(name,expected){');
const end=content.indexOf('  async function clickElement(',start);
const sourceStart=content.indexOf('  function findSourceSkuVariant(');
const sourceEnd=content.indexOf('  function makeVariant(',sourceStart);
assert.ok(start>=0&&end>start&&sourceStart>=0&&sourceEnd>sourceStart);
const context=vm.createContext({
 dom:require('./dom-stock-parser.js'),
 expectedColorHints:hint=>hint.colors||[],
 matcher:require('./match-core.js')
});
vm.runInContext(content.slice(start,end)+content.slice(sourceStart,sourceEnd)+
 '\nglobalThis.helpers={exactColor,selectTargetControls,findSourceSkuVariant};',context);
const {exactColor,selectTargetControls,findSourceSkuVariant}=context.helpers;
assert.strictEqual(exactColor('Trắng','Trắng Đỏ'),false);
assert.strictEqual(exactColor('Trắng/Đỏ','Trắng Đỏ'),true);
assert.strictEqual(exactColor('Xanh','Xanh Đen'),false);
const controls=['Trắng','Trắng Đỏ','Xanh Đen'].map(name=>({name,el:{}}));
let selected=selectTargetControls(controls,{colors:['Trắng','Trắng Đỏ']});
assert.deepStrictEqual(Array.from(selected.controls,x=>x.name),['Trắng','Trắng Đỏ']);
assert.deepStrictEqual(Array.from(selected.missingHints),[]);
selected=selectTargetControls(controls,{colors:['Xanh']});
assert.strictEqual(selected.controls.length,0);
assert.deepStrictEqual(Array.from(selected.missingHints),['Xanh']);
selected=selectTargetControls(controls,{colors:['Trắng','Trắng','Trắng Đỏ']});
assert.strictEqual(selected.controls.length,2);
assert.strictEqual(selected.missingHints.length,1);
const sourceVariants=[
 {sku:'GER-TRANG-XL',size:'XL',color:'Trắng',id:1},
 {sku:'GER-TRANG-DO-XL',size:'XL',color:'Trắng Đỏ',id:2}
];
assert.strictEqual(findSourceSkuVariant(sourceVariants,'Trắng','XL').id,1);
assert.strictEqual(findSourceSkuVariant(sourceVariants,'Trắng Đỏ','XL').id,2);
assert.strictEqual(findSourceSkuVariant(sourceVariants,'Xanh','XL'),null);
assert.strictEqual(findSourceSkuVariant([sourceVariants[1]],'Trắng','XL'),null,
 'A single size candidate from the wrong color must NOT be reused');

const rows=[
 {sku:'dt-duc-2026-hd-trang-XL',stock:0,variantName:'Đức Trắng XL'},
 {sku:'dt-duc-2026-hd-trang-do-XL',stock:19,variantName:'Đức Trắng Đỏ XL'}
];
const rowQuality=quality.evaluate({total:1,index:1},
 [{complete:true,variants:[{size:'XL',available:0},{size:'XL',available:19}]}],{rows},[]);
assert.ok(rowQuality.ok);
const entry={profileId:'hd',profileName:'HD',scannedAt:100,jobId:'job-1',
 rows,rowCount:2,qualityValidated:true,report:{quality:rowQuality,issueCount:0}};
const config={sapo:{storeHost:'shop.mysapo.net',locationId:9,locationName:'dhl sport',verifiedAt:200}};
const dependencies={quality,batch,excelSku,branchCore};
const latestQueue={source:'manual',host:'shop.mysapo.net',locationId:9,finishedAt:300,
 successRows:[{sku:'dt-duc-2026-hd-trang-XL',stock:4}]};
const p=preview.build([entry],config,latestQueue,dependencies);
assert.strictEqual(p.summary.count,2);
assert.strictEqual(p.summary.zero,1);
assert.strictEqual(p.summary.changed,1);
assert.strictEqual(p.summary.unknown,1);
const white=p.rows.find(x=>x.sku==='dt-duc-2026-hd-trang-XL');
const red=p.rows.find(x=>x.sku==='dt-duc-2026-hd-trang-do-XL');
assert.strictEqual(white.stock,0);
assert.strictEqual(white.oldStock,4);
assert.strictEqual(red.stock,19);
assert.strictEqual(red.oldStock,null);
assert.strictEqual(white.risk,'sold-out');
assert.notStrictEqual(p.signature,preview.build([{...entry,rows:[{...rows[0],stock:1},rows[1]]}],config,latestQueue,dependencies).signature);
assert.notStrictEqual(p.signature,preview.build([entry],{sapo:{...config.sapo,locationId:10}},latestQueue,dependencies).signature);
assert.notStrictEqual(p.signature,preview.build([entry],{sapo:{...config.sapo,verifiedAt:201}},latestQueue,dependencies).signature);
assert.throws(()=>preview.build([{...entry,qualityValidated:false}],config,latestQueue,dependencies),/chưa xác minh/);
assert.throws(()=>preview.build([entry],{sapo:{...config.sapo,verifiedAt:0}},latestQueue,dependencies),/Chưa xác minh/);
assert.ok(background.includes("const PANEL_AUTO_CLEANUP_KEYS = [];"));
assert.ok(background.includes("reason:'preserved-until-user-action'"));
const exportBody=excelUi.slice(excelUi.indexOf('  async function exportBatch(){'),
 excelUi.indexOf('  async function clearBatch(){'));
assert.ok(!exportBody.includes('await chrome.storage.local.set({[BATCH_KEY]:{}});'),
 'Excel download must NOT clear the verified scan (explicit XÓA CACHE may clear it)');
assert.ok(excelUi.includes("if(!confirm('Xóa dữ liệu tồn kho đã quét?"));
assert.ok(sapoBg.includes("DHL_SAPO_PREVIEW_MANUAL"));
assert.ok(sapoBg.includes("approved.signature!==proposed.signature"));
assert.ok(sapoBg.includes("await chrome.storage.local.remove(PREVIEW_KEY)"));
assert.ok(sapoUi.includes("XÁC NHẬN ĐẨY"));
assert.ok(sapoUi.includes("previewToken:token"));
assert.ok(sapoUi.includes("KHÔNG phải số tồn Sapo đang đọc trực tiếp"));
assert.ok(!/scoreColorHint/.test(content.slice(start,end)),'Fuzzy color selection must not reappear');
console.log('STOCK SAFETY TEST PASS: cache preservation; exact Trắng/Trắng Đỏ; preview token invalidation');
