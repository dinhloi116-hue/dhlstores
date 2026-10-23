import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {buildProductMarkdown,imagePrompts} from '../lib/core.mjs';
import {DRIVE_SHOPS,resolveProductFolder,uploadProductFile,DRIVE_ROOT} from '../lib/drive-sync.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const D={
 vi:{title:'Áo bóng đá Việt Nam',short:'Áo bóng đá',description:'Chi tiết vải, cổ thật.',seoTitle:'Áo bóng đá Việt Nam 2026',seoDescription:'Mô tả áo bóng đá',slug:'ao-bong-da',keywords:'áo bóng đá',altText:'Ảnh áo bóng đá'},
 en:{title:'Vietnam jersey',short:'Football jersey',description:'Fabric and collar',seoTitle:'Vietnam football jersey',seoDescription:'Sportswear',slug:'football-jersey',keywords:'football',altText:'Football shirt'},
 facts:{category:'Áo bóng đá',material:'Polyester đã kiểm tra',dimensions:'S/M',variants:'Trắng',usage:'Mặc thi đấu'},
 missing:['Giá vốn','Cân nặng'],photoPlan:['Ảnh bìa']
};
const product={shop:'DHL SPORTS',name:'Áo bóng đá Việt Nam',sku:'',notes:'Ảnh thật được chụp từ trang sản phẩm',sales:{saleTypes:['Không in','Có in'],dimensions:['type'],colors:'',sizes:''},shipping:{weightGrams:'',lengthCm:'',widthCm:'',heightCm:''},pageUrl:'https://example.org'};
test('single markdown contains all product data without invented SKU, cost or weight',()=>{
 const p=imagePrompts(D,product);
 const md=buildProductMarkdown({draft:D,product,prices:{cost:'',feePercent:''},imageNames:['Ảnh gốc 1.png','Ảnh thành phẩm 1.jpg'],prompts:p,sourceDocuments:[{name:'mô tả nguồn.txt',text:'Vải polyester từ người bán'}],recordKey:'DOC-12345'});
 for(const fragment of ['# Áo bóng đá Việt Nam','CHỜ BỔ SUNG','DOC-12345','Ảnh gốc 1.png','Ảnh thành phẩm 1.jpg','Không in, Có in','## 4. Giá vốn','## 5. Nội dung sản phẩm','## 6. Câu lệnh','### Ảnh 9','## 7. Tài liệu nguồn','mô tả nguồn.txt','## 8. Các thông tin chưa xác minh'])assert.ok(md.includes(fragment),`Missing ${fragment}`);
 assert.match(md,/Giá đề xuất:\*\* CHỜ CHỐT GIÁ VỐN/);
 assert.doesNotMatch(md,/(SKU bán hàng:\*\* DOC-12345)/);
 assert.match(md,/Không chèn logo cửa hàng ĐHL SPORTS/);
});
test('optional real price, shipping and SKU rows are in same markdown document',()=>{
 const md=buildProductMarkdown({draft:D,product:{...product,sku:'VN2026',shipping:{weightGrams:'280',lengthCm:'25',widthCm:'20',heightCm:'4'}},prices:{cost:55000,feePercent:20,packing:4000,targetProfit:25000},skuRows:[{sku:'VN2026-S',opt1:'S',opt2:'',price:'129000',stock:'5'}]});
 for(const fragment of ['VN2026-S','129.000 đ','280 g','25 × 20 × 4 cm','Giá Shopee đề xuất'])assert.ok(md.includes(fragment));
});
test('save handler only creates one markdown + source / finished images, no auto xlsx/json/txt',async()=>{
 const js=await readFile(join(root,'panel.js'),'utf8');
 const a=js.indexOf('async function productFolderAndFiles()'),b=js.indexOf('// GitHub version checker.',a);const action=js.slice(a,b);
 assert.ok(a>=0&&b>a);
 assert.match(action,/THÔNG TIN SẢN PHẨM\.md/);
 assert.match(action,/mime:'text\/markdown'/);
 assert.match(action,/files\.unshift/);
 assert.match(action,/dataUrlFile\(images\[i\]/);
 assert.match(action,/uploadedImage\(finishedPhotos\[i\]/);
 assert.doesNotMatch(action,/xlsxFile|\.json'|\.txt'|BigSeller\.xlsx|SEO website\.xlsx/);
 assert.match(action,/recordKey='DOC-'/);
});
test('drive uploader explicitly accepts Markdown, still protects manual same-name files',async()=>{
 const src=await readFile(join(root,'lib/drive-sync.mjs'),'utf8');
 assert.match(src,/text\\\/\(plain\|markdown\)/);
 assert.match(src,/Không ghi đè/);
 const m=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
 assert.equal(m.version,'0.9.0');
});
test('Drive UI only promises one MD with photos, older files are not deleted',async()=>{
 const html=await readFile(join(root,'panel.html'),'utf8');const js=await readFile(join(root,'panel.js'),'utf8');
 assert.match(html,/Lưu thư mục sản phẩm \(ảnh \+ 1 file MD\)/);
 assert.match(html,/không bắt buộc/);
 assert.doesNotMatch(js,/drive-delete|drive-trash|deleteProductFiles/);
});
