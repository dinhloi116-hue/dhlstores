const assert=require('assert');
global.DHLXlsxLite=require('./xlsx-lite.js');
global.DHLMatchCore=require('./match-core.js');
global.DHLShopRules=require('./shop-rules.js');
require('./generic-shop-rules.js');
const productCreate=require('./product-create-core.js');

(async()=>{
  const catalog=[{
    parentId:4978420,
    parentName:'ĐT Brazil Trẻ Em 2025 HD',
    sourceUrl:'https://si.aobongda.net/dt-brazil-tre-em-2025-hd-p4978420.html',
    imageUrl:'https://cdn.example.com/brazil-kids-parent.jpg',
    variants:[
      {id:101,sku:'WEB-BRAZIL-VANG-16',color:'Vàng',size:'16',available:5,image:'https://cdn.example.com/brazil-kids-yellow.jpg'},
      {id:102,sku:'WEB-BRAZIL-VANG-18',color:'Vàng',size:'18',available:7,image:'https://cdn.example.com/brazil-kids-yellow.jpg'},
      {id:103,sku:'WEB-BRAZIL-VANG-20',color:'Vàng',size:'20',available:0,image:''}
    ]
  }];
  const built=productCreate.makeRows(catalog);
  assert.strictEqual(built.groups.length,1);
  assert.strictEqual(built.rows.length,3);
  assert.strictEqual(built.rows[0].values[1],'ĐT Brazil Trẻ Em 2025 HD - Vàng');
  assert.strictEqual(built.rows[0].values[10],'16');
  assert.strictEqual(built.rows[0].values[16],'WEB-BRAZIL-VANG-16','Phải giữ đúng SKU gốc website');
  assert.strictEqual(built.rows[1].values[16],'WEB-BRAZIL-VANG-18');
  assert.strictEqual(built.rows[0].values[19],'https://cdn.example.com/brazil-kids-yellow.jpg');
  assert.strictEqual(built.rows[2].values[34],0);

  const api=productCreate.makeApiProducts(catalog);
  assert.strictEqual(api.products.length,1);
  assert.strictEqual(api.products[0].name,'ĐT Brazil Trẻ Em 2025 HD - Vàng');
  assert.ok(api.products[0].alias);
  assert.deepStrictEqual(api.products[0].variants.map(v=>v.size),['16','18','20']);
  assert.deepStrictEqual(api.products[0].variants.map(v=>v.stock),[5,7,0]);
  assert.deepStrictEqual(api.products[0].variants.map(v=>v.sku),[
    'WEB-BRAZIL-VANG-16','WEB-BRAZIL-VANG-18','WEB-BRAZIL-VANG-20'
  ]);

  assert.throws(
    ()=>productCreate.makeApiProducts([{parentId:1,parentName:'Thiếu SKU',variants:[{color:'Đỏ',size:'M',available:1,sku:''}]}]),
    /nguồn chưa trả SKU thật/
  );

  const out=productCreate.buildWorkbook(catalog);
  const book=await global.DHLXlsxLite.readFirstSheet(out.bytes);
  assert.strictEqual(book.rows[0].length>=36,true);
  assert.strictEqual(book.rows[0][16],'Mã SKU');
  assert.strictEqual(book.rows[1][16],'WEB-BRAZIL-VANG-16');
  assert.strictEqual(book.rows[1][34],5);
  assert.strictEqual(book.rows[3][34],0);
  console.log('PRODUCT CREATE PASS',{sourceSkuExact:true,rows:out.rows,directSapo:true});
})().catch(error=>{console.error(error);process.exit(1);});
