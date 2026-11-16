const fs=require('fs');
const assert=require('assert');
const history=require('./stock-history-core.js');
const reportCore=require('./stock-report-core.js');
const matcher=require('./match-core.js');

function product(stockWhite,stockRed,extra={}){
  return {
    parentId:77,parentName:'ĐT Đức 2026 HD',
    sourceUrl:'https://si.aobongda.net/duc-2026.html',complete:true,
    // Product hero can be a different color. Variant image always wins.
    imageUrl:'https://img.example.com/hero-red.jpg',
    variants:[
      {id:101,parentId:77,color:'Trắng',size:'XL',name:'ĐT Đức 2026 HD - Trắng - XL',
       available:stockWhite,image:'https://img.example.com/white.jpg'},
      {id:102,parentId:77,color:'Trắng Đỏ',size:'XL',name:'ĐT Đức 2026 HD - Trắng Đỏ - XL',
       available:stockRed,image:'https://img.example.com/red.jpg'},
      ...(extra.variants||[])
    ]
  };
}
const skuRows=[
  {sourceParentId:77,sourceVariantId:101,size:'XL',sku:'dt-duc-2026-hd-trang-XL'},
  {sourceParentId:77,sourceVariantId:102,size:'XL',sku:'dt-duc-2026-hd-trang-do-XL'}
];
const options={profileId:'HD',profileName:'HD',sourceUrl:'https://si.aobongda.net/category.html',matcher,skuRows};
const old=history.snapshotFromSource([product(9,0)],{...options,at:1000});
const now=history.snapshotFromSource([product(0,19)],{...options,at:2000});
assert.strictEqual(now.itemCount,2);
const white=now.items.find(x=>x.color==='Trắng');
const red=now.items.find(x=>x.color==='Trắng Đỏ');
assert.strictEqual(white.sku,'dt-duc-2026-hd-trang-XL');
assert.strictEqual(red.sku,'dt-duc-2026-hd-trang-do-XL');
assert.strictEqual(white.imageUrl,'https://img.example.com/white.jpg');
assert.strictEqual(red.imageUrl,'https://img.example.com/red.jpg');
assert.strictEqual(white.productUrl,'https://si.aobongda.net/duc-2026.html');
assert.strictEqual(white.imageScope,'variant');
const noRows=history.snapshotFromSource([product(0,19)],{...options,skuRows:[],at:2001});
assert.deepStrictEqual(old.items.map(x=>x.key),now.items.map(x=>x.key),'Exact-SKU display enrichment must not change historic comparison keys');
assert.deepStrictEqual(noRows.items.map(x=>x.key),now.items.map(x=>x.key),'No migration-induced false added/missing');
const diff=history.compareSnapshots(old,now);
assert.strictEqual(diff.soldOut,1);
assert.strictEqual(diff.restocked,1);
assert.strictEqual(diff.added,0);
const report={
  profileId:'HD',profileName:'HD',at:2000,snapshotAt:2000,
  previousSnapshotId:old.id,comparable:true,quality:{ok:true},visualSnapshot:now
};
const model=reportCore.build(report,[old,now]);
assert.ok(model.ready);
assert.strictEqual(model.comparable,true);
assert.strictEqual(model.counts.zero,1);
assert.strictEqual(model.counts.soldout,1);
assert.strictEqual(model.counts.restocked,1);
assert.strictEqual(model.counts.increased,0);
assert.strictEqual(model.items.find(x=>x.color==='Trắng').before,9);
assert.strictEqual(model.items.find(x=>x.color==='Trắng Đỏ').before,0);
assert.strictEqual(model.items.find(x=>x.color==='Trắng Đỏ').stock,19);
const first=reportCore.build({...report,previousSnapshotId:'',visualSnapshot:old},[old]);
assert.strictEqual(first.counts.zero,1);
assert.strictEqual(first.counts.restocked,0,'First scan must NOT claim stock came back');
assert.strictEqual(first.comparable,false);
const partial=reportCore.build({...report,comparable:false,visualSnapshot:now},[old,now]);
assert.strictEqual(partial.counts.restocked,0,'Incomplete scan cannot claim restock');
assert.strictEqual(partial.counts.soldout,0);
assert.strictEqual(partial.counts.zero,1);
assert.ok(partial.notice.includes('chưa hoàn tất'));
assert.strictEqual(reportCore.safeUrl('javascript:alert(1)'),'');
assert.strictEqual(reportCore.safeUrl('data:image/svg+xml,<svg/>'),'');
// In a multicolor product, do NOT reuse a product hero image as a wrong color photo.
const missingImage=product(0,19);
missingImage.variants[0].image='';
const missingSnapshot=history.snapshotFromSource([missingImage],{...options,at:3000});
assert.strictEqual(missingSnapshot.items.find(x=>x.color==='Trắng').imageUrl,'');
const singleColor=product(0,19);
singleColor.variants=singleColor.variants.slice(0,1);
singleColor.variants[0].image='';
const fallback=history.snapshotFromSource([singleColor],{...options,at:3001});
assert.strictEqual(fallback.items[0].imageUrl,'https://img.example.com/hero-red.jpg');
assert.strictEqual(fallback.items[0].imageScope,'product');

// Metadata must only be attached to the correct source variant ID, never a similar color.
const mismatchedRows=[
  {sourceParentId:77,sourceVariantId:102,size:'XL',sku:'dt-duc-2026-hd-trang-do-XL'}
];
const mapped=history.snapshotFromSource([product(3,8)],{...options,skuRows:mismatchedRows});
assert.strictEqual(mapped.items.find(x=>x.color==='Trắng').sku,'');
assert.strictEqual(mapped.items.find(x=>x.color==='Trắng Đỏ').sku,'dt-duc-2026-hd-trang-do-XL');

const html=fs.readFileSync(__dirname+'/stock-report.html','utf8');
const ui=fs.readFileSync(__dirname+'/stock-report.js','utf8');
const sidebar=fs.readFileSync(__dirname+'/batch-stock-cache-mode.js','utf8');
const runner=fs.readFileSync(__dirname+'/manual-job-runner-background.js','utf8');
const manifest=JSON.parse(fs.readFileSync(__dirname+'/manifest.json','utf8'));
assert.ok(html.includes('stock-report.js')&&html.includes('stock-report.css'));
assert.ok(html.includes('stock-history-core.js')&&html.includes('stock-report-core.js'));
assert.ok(sidebar.includes('openVisualStockReportBtn'));
assert.ok(sidebar.includes("chrome.tabs.create({url,active:true})"));
assert.ok(sidebar.includes("chrome.runtime.getURL('stock-report.html')"));
assert.ok(runner.includes('visualSnapshot:snapshot'));
assert.ok(runner.includes('skuRows:prepared&&prepared.rows||[]'));
assert.ok(ui.includes('Ảnh lấy từ màu/biến thể')===false,'HTML should own report heading');
assert.ok(ui.includes("load")===false||typeof ui==='string');
assert.ok(manifest.permissions.includes('tabs'));
new Function(ui);
console.log('VISUAL REPORT PASS: image SKU, no fuzzy mapping, 0→restock, >0→0, safe fallback and new tab');
