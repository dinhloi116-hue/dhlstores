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
    imageUrl:'https://cdn.example.com/brazil-kids.jpg',
    variants:[
      {color:'Vàng',size:'16',available:5,image:''},
      {color:'Vàng',size:'18',available:7,image:''},
      {color:'Vàng',size:'20',available:0,image:''}
    ]
  }];
  const built=productCreate.makeRows(catalog);
  assert.strictEqual(built.groups.length,1);
  assert.strictEqual(built.rows.length,3);
  assert.strictEqual(built.rows[0].values[1],'ĐT Brazil Trẻ Em 2025 HD - Vàng');
  assert.strictEqual(built.rows[0].values[10],'16');
  assert.ok(/^ABDN-/.test(built.rows[0].values[16]),'Sản phẩm mới phải có SKU tự sinh ổn định');
  assert.ok(built.rows[0].values[16].endsWith('-16'));
  assert.strictEqual(built.rows[0].values[19],'https://cdn.example.com/brazil-kids.jpg');
  assert.strictEqual(built.rows[0].values[29],'https://cdn.example.com/brazil-kids.jpg');
  assert.strictEqual(built.rows[2].values[34],0,'Tồn 0 phải được giữ đúng');

  const out=productCreate.buildWorkbook(catalog);
  const book=await global.DHLXlsxLite.readFirstSheet(out.bytes);
  assert.strictEqual(book.rows[0].length>=36,true);
  assert.strictEqual(book.rows[0][0],'Đường dẫn/Alias');
  assert.strictEqual(book.rows[0][1],'Tên sản phẩm*');
  assert.strictEqual(book.rows[0][19],'Ảnh đại diện');
  assert.strictEqual(book.rows[0][29],'Ảnh phiên bản');
  assert.strictEqual(book.rows[0][34],'Cửa hàng chính_Tồn kho');
  assert.strictEqual(book.rows[0][35],'Id phiên bản');
  assert.strictEqual(book.rows[1][34],5);
  assert.strictEqual(book.rows[3][34],0);
  console.log('PRODUCT CREATE PASS',{columns:36,rows:out.rows,image:true,kidsNumericSizes:true});
})().catch(error=>{console.error(error);process.exit(1);});
