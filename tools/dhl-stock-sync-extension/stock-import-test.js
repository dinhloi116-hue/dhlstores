const assert=require('assert');
const xlsx=require('./xlsx-lite.js');
const stock=require('./stock-import-core.js');

(async()=>{
  const rows=[
    {variantName:'CLB ARS 26-27 HD - Đỏ / Size S',sku:'clb-ars-26-27-hd-do-S',stock:6},
    {variantName:'CLB ARS 26-27 HD - Đỏ / Size M',sku:'clb-ars-26-27-hd-do-M',stock:18}
  ];
  const out=stock.buildOfficialInventoryWorkbook(xlsx,rows,'dhl sport');
  const book=await xlsx.readFirstSheet(out.bytes);
  assert.strictEqual(out.templateSignature,'SAPO-INVENTORY-TEMPLATE-V3');
  assert.strictEqual(book.rows[0][0],'Cập nhật tồn kho phiên bản sản phẩm');
  assert.ok(!book.rows[1]||book.rows[1].every((v)=>v==null||v===''),'Hàng 2 phải trống giống mẫu Sapo');
  assert.strictEqual(book.rows[2][5],'dhl sport','Tên chi nhánh phải nằm ở F3');
  assert.ok(book.rows[2][7]==null||book.rows[2][7]==='','Cặp chi nhánh thứ 2 phải để trống nếu chỉ cập nhật 1 chi nhánh');
  assert.deepStrictEqual(book.rows[3].slice(0,9),[
    'Tên phiên bản sản phẩm','SKU*','Mã lô','Ngày sản xuất','Hạn sử dụng',
    'Tồn kho','Vị trí lưu kho','Tồn kho','Vị trí lưu kho'
  ]);
  assert.strictEqual(book.rows[4][0],rows[0].variantName);
  assert.strictEqual(book.rows[4][1],'clb-ars-26-27-hd-do-S');
  assert.strictEqual(book.rows[4][5],6);
  assert.ok(book.rows[4][7]==null||book.rows[4][7]==='');
  assert.strictEqual(book.rows[5][1],'clb-ars-26-27-hd-do-M');
  assert.strictEqual(book.rows[5][5],18);
  assert.strictEqual(out.rows,2);

  const sheetXml=book.xml;
  assert.ok(sheetXml.includes('<dimension ref="A1:I6"/>'),'File đầu ra phải theo mẫu Sapo 9 cột người dùng vừa cung cấp');
  assert.ok(sheetXml.includes('min="8" max="8" width="19"'),'Phải giữ cặp cột chi nhánh thứ 2 của mẫu');
  assert.ok(!sheetXml.includes('<mergeCell'),'Không merge tiêu đề');

  console.log('SAPO OFFICIAL INVENTORY IMPORT PASS',{
    branch:out.branchName,
    columns:9,
    rows:out.rows,
    template:out.templateSignature,
    skuRule:'Alias + Size'
  });
})().catch((error)=>{console.error(error);process.exit(1);});
