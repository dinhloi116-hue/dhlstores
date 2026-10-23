import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {readZip,sheetRows} from '../ooxml.mjs';import {exportPlatformTemplate} from '../import-templates.mjs';
const files=process.env.IMPORT_TEMPLATES_DIR||'/mnt/data';
const draft={vi:{title:'Sản phẩm thử nghiệm',description:'Thông tin kiểm thử, không đăng bán'},en:{title:'Test product'}};
const product={shop:'DHL STUDIO',sku:'TEST-100'};
const listing={reviewed:true,categoryConfirmed:true,categoryId:3070,brand:'No Brand',brandConfirmed:true,coverUrl:'https://example.org/cover.png',imageUrls:['https://example.org/a.png'],weightGrams:150,lengthCm:25,widthCm:20,heightCm:2,variantName1:'Màu',variants:[{sku:'TEST-100-RED',price:59000,stock:12,opt1:'Đỏ'},{sku:'TEST-100-BLUE',price:69000,stock:0,opt1:'Xanh'}]};
const templates={bigseller:'import_template_VN.xlsx',lazada:'simplifyExcelNewPub201152832204export1791716417143_1011-19-00-17.xlsx'};
for(const platform of ['bigseller','lazada'])test(`${platform}: preserve original workbook structure and replace examples`,async t=>{
 let src;try{src=await readFile(`${files}/${templates[platform]}`);}catch{t.skip('Real user template not installed locally');return;}
 const generated=exportPlatformTemplate({platform,draft,product,listing,templateBytes:src});let old=readZip(src),nw=readZip(generated);
 assert.deepEqual([...nw.keys()].sort(),[...old.keys()].sort());
 const sheet=platform==='bigseller'?'Sheet1':'template';const rows=sheetRows(nw,sheet,8);assert.equal(rows.length,platform==='bigseller'?3:6);
 const row=rows.find(x=>x.row===(platform==='bigseller'?2:5));assert.equal(row.cells[platform==='bigseller'?'J':'W'],'TEST-100-RED');
 assert.equal(row.cells[platform==='bigseller'?'L':'V'],'59000');
 const last=rows.at(-1);assert.equal(last.cells[platform==='bigseller'?'J':'W'],'TEST-100-BLUE');
 for(const [path,bytes] of old)if(!path.includes('worksheets/sheet1.xml'))assert.deepEqual(nw.get(path),bytes,`Must not change ${path}`);
 if(platform==='bigseller')assert.ok(!generated.includes(Buffer.from('Bohemian Women'))); // compressed and source demo row removed
});
test('block unreviewed and missing mandatory values',async t=>{let bytes;try{bytes=await readFile(`${files}/${templates.bigseller}`);}catch{t.skip();return;}
 assert.throws(()=>exportPlatformTemplate({platform:'bigseller',draft,product,listing:{...listing,reviewed:false},templateBytes:bytes}),/duyệt/);
 assert.throws(()=>exportPlatformTemplate({platform:'bigseller',draft,product,listing:{...listing,weightGrams:''},templateBytes:bytes}),/cân nặng/);
 assert.throws(()=>exportPlatformTemplate({platform:'bigseller',draft,product,listing:{...listing,variants:[listing.variants[0],listing.variants[0]]},templateBytes:bytes}),/Trùng SKU/);
});
