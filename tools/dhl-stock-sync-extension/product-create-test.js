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
  assert.strictEqual(built.rows[2].values[34],0);

  const api=productCreate.makeApiProducts(catalog);
  assert.strictEqual(api.products.length,1);
  assert.strictEqual(api.products[0].alias,alias);
  assert.deepStrictEqual(api.products[0].variants.map(v=>v.sku),[
    `${alias}-16`,`${alias}-18`,`${alias}-20`
  ]);

  const out=productCreate.buildWorkbook(catalog);
  const book=await global.DHLXlsxLite.readFirstSheet(out.bytes);
  assert.strictEqual(book.rows[0][0],'Đường dẫn/Alias');
  assert.strictEqual(book.rows[0][16],'Mã SKU');
  assert.strictEqual(book.rows[1][0],alias);
  assert.strictEqual(book.rows[1][16],`${alias}-16`);
  assert.strictEqual(book.rows[1][34],5);
  console.log('PRODUCT CREATE PASS',{aliasIsSkuBase:true,rows:out.rows,directSapo:true});
})().catch(error=>{console.error(error);process.exit(1);});
