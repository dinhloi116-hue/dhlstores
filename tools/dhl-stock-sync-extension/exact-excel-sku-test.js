const assert=require('assert');
const match=require('./match-core.js');
const auto=require('./auto-sync-core.js');
const batch=require('./batch-stock-core.js');
const excelSku=require('./excel-sku-core.js');
const importer=require('./stock-import-core.js');
const xlsx=require('./xlsx-lite.js');
const fs=require('fs');

const sizes=['S','M','L','XL','XXL'];
const white=[0,0,0,0,0];
const redWhite=[4,8,38,19,10];
const source={
  parentId:900,parentName:'ĐT Đức 2026 HD',complete:true,
  variants:[
    ...sizes.map((size,i)=>({id:110+i,color:'Trắng',size,name:'ĐT Đức 2026 HD - Trắng - '+size,available:white[i]})),
    ...sizes.map((size,i)=>({id:120+i,color:'Trắng Đỏ',size,name:'ĐT Đức 2026 HD - Trắng Đỏ - '+size,available:redWhite[i]}))
  ]
};
const catalog={variants:source.variants.map((v,i)=>({
  name:'ĐT Đức 2026 HD - '+v.color,
  size:v.size,sku:'dt-duc-2026-hd-'+(v.color==='Trắng'?'trang':'trang-do')+'-'+v.size,
  variantId:1010+i,productId:222
}))};
const prepared=auto.prepareRows({},catalog,[source],match,{});
assert.strictEqual(prepared.missingSku.length,0);
assert.strictEqual(prepared.rows.length,10);
const expected=new Map();
for(let i=0;i<sizes.length;i++){
  expected.set('dt-duc-2026-hd-trang-'+sizes[i],white[i]);
  expected.set('dt-duc-2026-hd-trang-do-'+sizes[i],redWhite[i]);
}
for(const [sku,stock] of expected){
  const row=prepared.rows.find(r=>excelSku.skuKey(r.sku)===excelSku.skuKey(sku));
  assert.ok(row,'SKU omitted: '+sku);
  assert.strictEqual(row.stock,stock,'Stock mapped to wrong color for '+sku);
  assert.strictEqual(row.matchedBy,'clean-sku-exact');
  assert.ok(row.variantId>0,'Exact catalog variant ID missing for '+sku);
}
assert.notStrictEqual(excelSku.skuKey('dt-duc-2026-hd-trang-XXL'),excelSku.skuKey('dt-duc-2026-hd-trang-do-XXL'));

// A similarly named product must NOT link metadata via "name + size" fallback.
const crossedCatalog={variants:[
  {name:'ĐT Đức 2026 HD - Trắng',size:'XXL',sku:'dt-duc-2026-hd-trang-do-XXL',variantId:99999,productId:99999}
]};
const noFuzzy=auto.prepareRows({},crossedCatalog,[source],match,{});
const plainWhite=noFuzzy.rows.find(r=>r.sku==='dt-duc-2026-hd-trang-XXL');
assert.strictEqual(plainWhite.variantId,0);
assert.strictEqual(plainWhite.matchedBy,'clean-alias-size-new');
const redRow=noFuzzy.rows.find(r=>r.sku==='dt-duc-2026-hd-trang-do-XXL');
assert.strictEqual(redRow.variantId,99999,'Only an exact matching SKU may link metadata');

// Verify whole SKU and color identity, without accepting prefixes/partial names.
assert.throws(()=>excelSku.validate([{...plainWhite,sku:'dt-duc-2026-hd-trang-do-XXL'}]),/không khớp alias/);
assert.throws(()=>excelSku.validate([{...redRow,standardName:'ĐT Đức 2026 HD - Trắng'}]),/Tên màu\/biến thể khác SKU/);
assert.throws(()=>excelSku.validate([plainWhite,{...plainWhite,stock:3}]),/SKU trùng/);
assert.strictEqual(excelSku.validate(prepared.rows).length,10);
const combined=batch.combineEntries([{profileId:'HD',profileName:'HD',branch:'dhl sport',rows:prepared.rows}]);
assert.strictEqual(combined.rows.length,10);
assert.ok(combined.rows.every(row=>row.alias&&row.matchedBy),'SKU provenance must survive batch combine');
excelSku.validate(combined.rows);

(async()=>{
 const workbook=importer.buildOfficialInventoryWorkbook(xlsx,combined.rows,combined.branch);
 const sheet=await xlsx.readFirstSheet(workbook.bytes);
 const actual=new Map(sheet.rows.slice(4).filter(r=>r&&r[1]).map(r=>[excelSku.skuKey(r[1]),Number(r[5])]));
 assert.strictEqual(actual.size,10);
 for(const [sku,stock] of expected)assert.strictEqual(actual.get(excelSku.skuKey(sku)),stock,'Excel mismatch at '+sku);
 assert.strictEqual(sheet.rows[2][5],'dhl sport');
 assert.throws(()=>importer.buildOfficialInventoryWorkbook(xlsx,[plainWhite,{...plainWhite}],combined.branch),/SKU trùng/);
 const popup=fs.readFileSync(__dirname+'/popup.html','utf8');
 const exportUi=fs.readFileSync(__dirname+'/batch-stock-cache-mode.js','utf8');
 assert.ok(popup.includes('<script src="excel-sku-core.js"></script>'));
 assert.ok(exportUi.includes('excelSku.validate(combined.rows)'));
 console.log('EXACT EXCEL SKU PASS: Trắng 5×0, Trắng Đỏ 4/8/38/19/10; no prefix/name collision');
})().catch(e=>{console.error(e);process.exitCode=1;});
