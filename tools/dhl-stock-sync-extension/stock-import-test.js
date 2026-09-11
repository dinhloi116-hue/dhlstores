const assert=require('assert');
const xlsx=require('./xlsx-lite.js');
const stock=require('./stock-import-core.js');

(async()=>{
  const rows=[
    {variantName:'ĐT Mexico 2026 HD - Rêu Không in / S',sku:'Mexico xanh 26 HD-S',stock:6},
    {variantName:'ĐT Mexico 2026 HD - Rêu Không in / M',sku:'Mexico xanh 26 HD-M',stock:18}
  ];
  const out=stock.buildOfficialInventoryWorkbook(xlsx,rows,'dhl sport');
  const book=await xlsx.readFirstSheet(out.bytes);
  assert.strictEqual(book.rows[0][0],'Cập nhật tồn kho phiên bản sản phẩm');
  assert.strictEqual(book.rows[2][5],'dhl sport','Tên chi nhánh phải nằm trên cột Tồn kho');
  assert.deepStrictEqual(book.rows[3].slice(0,7),[
    'Tên phiên bản sản phẩm','SKU*','Mã lô','Ngày sản xuất','Hạn sử dụng','Tồn kho','Vị trí lưu kho'
  ]);
  assert.strictEqual(book.rows[4][0],rows[0].variantName);
  assert.strictEqual(book.rows[4][1],'Mexico xanh 26 HD-S');
  assert.strictEqual(book.rows[4][5],6);
  assert.strictEqual(book.rows[5][1],'Mexico xanh 26 HD-M');
  assert.strictEqual(book.rows[5][5],18);
  assert.strictEqual(out.rows,2);
  console.log('SAPO OFFICIAL INVENTORY IMPORT PASS',{branch:out.branchName,columns:7,rows:out.rows});
})().catch((error)=>{console.error(error);process.exit(1);});
