const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {selectMainGrid}=require('./visible-category-grid-core.js');
const source=fs.readFileSync(path.join(__dirname,'content.js'),'utf8');
const background=fs.readFileSync(path.join(__dirname,'manual-job-runner-background.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));

function element(parentElement=null){return{parentElement};}
const body=element();
const main=element(body);
const grid=element(main);
const promo=element(main);
const cards=[];
for(let i=1;i<=24;i++){
  const col=element(grid);
  cards.push({id:i,title:'HD '+i,card:element(col)});
}
cards.push({id:999,title:'ĐT Đức trẻ em không có trong lưới HD',card:element(promo)});
const picked=selectMainGrid(cards,body);
assert.strictEqual(picked.length,24,'HD page 1 has 24 visible product cards, not 25');
assert.ok(picked.every(x=>x.id!==999),'Unrelated product was not excluded');
assert.deepStrictEqual(picked.map(x=>x.id),Array.from({length:24},(_,i)=>i+1));
assert.strictEqual(selectMainGrid(cards.slice(0,2),body).length,2,'Small pages still work');

// Ensure a full category grid is preferred over an unrelated sidebar section.
const sidebar=element(main);
const extra=[...cards.slice(0,24)];
for(let i=1000;i<1003;i++)extra.push({id:i,title:'Ngoài danh mục '+i,card:element(element(sidebar))});
assert.strictEqual(selectMainGrid(extra,body).length,24);
assert.ok(source.includes('function visibleStockProductCard(anchor,productId)'));
assert.ok(source.includes('const selected=grid.selectMainGrid('));
assert.ok(source.includes("type === 'DHL_DISCOVER_VISIBLE_CATEGORY'"));
assert.ok(source.includes('Sản phẩm không có trong lưới đang hiển thị'));
assert.ok(background.includes("type:'DHL_DISCOVER_VISIBLE_CATEGORY'"));
assert.ok(!background.includes("for(const a of document.querySelectorAll('a[href]'))"));
assert.ok(background.includes('const discovered=await discoverProducts(tabId)'));
assert.ok(background.includes('job.results=visibleItems.map(item=>savedById.get(Number(item.id))||null)'));
assert.ok(background.includes('job.outsideGridRemoved=oldItems.filter'));
assert.ok(background.includes('job.descriptors=visibleItems'));
assert.ok(background.includes('job.retryQueue=remaining'));
assert.ok(manifest.content_scripts[0].js.indexOf('visible-category-grid-core.js')
  <manifest.content_scripts[0].js.indexOf('content.js'),'Module must load before scanner');
assert.strictEqual(manifest.version,'0.26.0');
console.log('VISIBLE GRID SCOPE PASS: 24/24 HD cards, stray kids product excluded, old checkpoint reconciled.');
