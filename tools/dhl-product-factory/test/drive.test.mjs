import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {makeServer,computePrice} from '../server.mjs';import {readZip,sheetRows} from '../ooxml.mjs';
import {lookupFees,readShopFile,listShopFiles} from '../drive.mjs';
const DIR=process.env.IMPORT_TEMPLATES_DIR||'/mnt/data';
const folder='shop_folder_123456789',id='file_source_123456789';
const env={PRODUCT_STUDIO_PASSWORD:'test-pass',GOOGLE_CLIENT_ID:'test-id',GOOGLE_CLIENT_SECRET:'test-secret',GOOGLE_REFRESH_TOKEN:'test-refresh',DRIVE_SHOP_FOLDERS_JSON:JSON.stringify({'DHL STUDIO':folder}),DRIVE_BIGSELLER_TEMPLATE_ID:'file_template_123456789',DRIVE_SHOPEE_PRICE_FILE_ID:'file_pricing_123456789'};
const mockFetch=async(url,opts={})=>{url=String(url);if(url==='https://oauth2.googleapis.com/token')return new Response(JSON.stringify({access_token:'fake-token'}),{status:200});
 if(url.includes('/files?'))return new Response(JSON.stringify({files:[{id,name:'Anh goc.png',mimeType:'image/png',size:'3'}]}));
 if(url.includes('file_source_123456789?fields='))return new Response(JSON.stringify({id,parents:[folder],name:'Nguon.txt',mimeType:'text/plain',size:'4'}));
 if(url.includes('file_source_123456789?alt=media'))return new Response('demo');
 if(url.includes('file_template_123456789?fields=')){const b=await readFile(DIR+'/import_template_VN.xlsx');return new Response(JSON.stringify({id:'file_template_123456789',name:'import_template_VN.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',size:b.length}));}
 if(url.includes('file_template_123456789?alt=media'))return new Response(await readFile(DIR+'/import_template_VN.xlsx'));
 return new Response(JSON.stringify({message:'mock no route'}),{status:404});
};
test('Drive reads only direct shop resources, token kept server-side',async()=>{
 const files=await listShopFiles('DHL STUDIO','',env,mockFetch);assert.equal(files[0].id,id);
 const file=await readShopFile('DHL STUDIO',id,env,mockFetch);assert.deepEqual(file,{kind:'text',data:'demo',name:'Nguon.txt'});
 await assert.rejects(()=>listShopFiles('OTHER','',env,mockFetch),/chưa cấu hình|không hợp lệ/);
});
test('Price reference category lookup uses exact match; no inferred category',async t=>{
 let b;try{b=await readFile(DIR+'/tham chiếu làm bảng giá sản phẩm bán shopee đừng động vào.xlsx')}catch{t.skip();return;}
 const category=sheetRows(readZip(b),'Ngành hàng',3)[1].cells.G;
 const match=lookupFees(b,category);assert.equal(match.match,true);assert.equal(match.source,'Ngành hàng!F2');
 const absent=lookupFees(b,'Điện thoại > Danh mục không tồn tại');assert.equal(absent.match,false);
});
test('Missing cost never becomes zero-priced product',()=>{
 assert.throws(()=>computePrice({cost:'',feePercent:20}),/Thiếu giá vốn/);
 assert.throws(()=>computePrice({cost:5000,feePercent:''}),/Thiếu tổng phí/);
});
test('HTTP export platform reads configured real template and preserves formats',async t=>{
 try{await readFile(DIR+'/import_template_VN.xlsx')}catch{t.skip();return;}
 const server=makeServer(env,mockFetch);await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const base='http://127.0.0.1:'+server.address().port;
 try{
  const payload={platform:'bigseller',draft:{vi:{title:'Kiểm thử Excel',description:'Mô tả sản phẩm kiểm thử nội bộ'},en:{title:'Test'}},product:{shop:'DHL STUDIO',sku:'TEST-1'},listing:{reviewed:true,categoryConfirmed:true,categoryId:3070,coverUrl:'https://example.org/a.png',weightGrams:200,lengthCm:10,widthCm:15,heightCm:2,variants:[{sku:'TEST-1',price:129000,stock:3}]}};
  const res=await fetch(base+'/api/export-platform',{method:'POST',headers:{'Content-Type':'application/json','x-tool-password':'test-pass'},body:JSON.stringify(payload)});
  if(res.status!==200)assert.fail(`HTTP ${res.status}: ${await res.text()}`);
  const rows=sheetRows(readZip(Buffer.from(await res.arrayBuffer())),'Sheet1',4);assert.equal(rows[1].cells.J,'TEST-1');
 }finally{await new Promise(ok=>server.close(ok));}
});
