const assert=require('assert');
global.DHLXlsxLite=require('./xlsx-lite.js');
global.DHLMatchCore=require('./match-core.js');
global.DHLShopRules=require('./shop-rules.js');
require('./generic-shop-rules.js');
const productCreate=require('./product-create-core.js');
const rules=global.DHLShopRules;

(async()=>{
  const catalog=[{
    parentId:4978420,
    parentName:'ĐT Brazil Trẻ Em 2025 HD',
    sourceUrl:'https://si.aobongda.net/dt-brazil-tre-em-2025-hd-p4978420.html',
    imageUrl:'https://cdn.example.com/brazil-kids-parent.jpg',
    variants:[
      {id:101,color:'Vàng',size:'16',available:5,image:'https://cdn.example.com/brazil-kids-yellow.jpg'},
      {id:102,color:'Vàng',size:'18',available:7,image:'https://cdn.example.com/brazil-kids-yellow.jpg'},
      {id:103,color:'Vàng',size:'20',available:0,image:''}
    ]
  }];
  const built=productCreate.makeRows(catalog);
  assert.strictEqual(built.groups.length,1);
  assert.strictEqual(built.rows.length,3);
  const productName='ĐT Brazil Trẻ Em 2025 HD - Vàng';
  const alias=rules.generatedAliasForStandardName(productName);
  assert.strictEqual(built.rows[0].values[0],alias,'Cột A phải là Đường dẫn/Alias');
  assert.strictEqual(built.rows[0].values[16],`${alias}-16`,'SKU phải dùng cột A làm base');
  assert.strictEqual(built.rows[1].values[16],`${alias}-18`);
  assert.strictEqual(built.rows[2].values[16],`${alias}-20`);
  assert.strictEqual(built.rows[0].values[19],'https://cdn.example.com/brazil-kids-yellow.jpg','Ảnh đại diện phải lấy link nguồn');
  assert.strictEqual(built.rows[0].values[29],'https://cdn.example.com/brazil-kids-yellow.jpg','Ảnh phiên bản phải có link cho từng SKU');
  assert.strictEqual(built.rows[1].values[29],'https://cdn.example.com/brazil-kids-yellow.jpg');
  assert.strictEqual(built.rows[2].values[29],'https://cdn.example.com/brazil-kids-yellow.jpg','Size không có ảnh riêng phải dùng ảnh màu làm fallback');
  assert.strictEqual(built.rows[2].values[34],0);

  const api=productCreate.makeApiProducts(catalog);
  assert.strictEqual(api.products.length,1);
  assert.strictEqual(api.products[0].alias,alias);
  assert.deepStrictEqual(api.products[0].variants.map(v=>v.sku),[
    `${alias}-16`,`${alias}-18`,`${alias}-20`
  ]);


  const brazilReal=[{
    parentId:62029,
    parentName:'ĐT Brazil 2026 HD',
    sourceUrl:'https://si.aobongda.net/dt-brazil-2026-hd-xanh-den-6qjk3f-p62029.html',
    imageUrl:'https://cdn.example.com/brazil.jpg',
    variants:[
      {id:201,color:'Xanh Đen',size:'S',available:9,image:'https://cdn.example.com/brazil.jpg'},
      {id:202,color:'Xanh Đen',size:'M',available:8,image:'https://cdn.example.com/brazil.jpg'},
      {id:203,color:'Xanh Đen',size:'L',available:7,image:'https://cdn.example.com/brazil.jpg'},
      {id:204,color:'Xanh Đen',size:'XL',available:6,image:'https://cdn.example.com/brazil.jpg'},
      {id:205,color:'Xanh Đen',size:'XXL',available:5,image:'https://cdn.example.com/brazil.jpg'}
    ]
  }];
  const brazilBuilt=productCreate.makeRows(brazilReal);
  const brazilAlias='dt-brazil-2026-hd-xanh-den-6qjk3f';
  assert.strictEqual(brazilBuilt.rows[0].values[0],brazilAlias,'Phải giữ alias thật có suffix nguồn');
  assert.deepStrictEqual(brazilBuilt.rows.map(r=>r.values[16]),[
    `${brazilAlias}-S`,`${brazilAlias}-M`,`${brazilAlias}-L`,`${brazilAlias}-XL`,`${brazilAlias}-XXL`
  ]);
  const brazilApi=productCreate.makeApiProducts(brazilReal);
  assert.strictEqual(brazilApi.products[0].alias,brazilAlias);
  assert.deepStrictEqual(brazilApi.products[0].variants.map(v=>v.sku),[
    `${brazilAlias}-S`,`${brazilAlias}-M`,`${brazilAlias}-L`,`${brazilAlias}-XL`,`${brazilAlias}-XXL`
  ]);

  const out=productCreate.buildWorkbook(catalog);
  const book=await global.DHLXlsxLite.readFirstSheet(out.bytes);
  assert.strictEqual(book.rows[0][0],'Đường dẫn/Alias');
  assert.strictEqual(book.rows[0][16],'Mã SKU');
  assert.strictEqual(book.rows[1][0],alias);
  assert.strictEqual(book.rows[1][16],`${alias}-16`);
  assert.strictEqual(book.rows[1][19],'https://cdn.example.com/brazil-kids-yellow.jpg');
  assert.strictEqual(book.rows[1][29],'https://cdn.example.com/brazil-kids-yellow.jpg');
  assert.strictEqual(book.rows[2][29],'https://cdn.example.com/brazil-kids-yellow.jpg');
  assert.strictEqual(book.rows[3][29],'https://cdn.example.com/brazil-kids-yellow.jpg');
  assert.strictEqual(book.rows[1][34],5);
  console.log('PRODUCT CREATE PASS',{aliasIsSkuBase:true,rows:out.rows,directSapo:true});
})().catch(error=>{console.error(error);process.exit(1);});
