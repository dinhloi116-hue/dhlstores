import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {makeWorkbook} from '../lib/xlsx-lite.mjs';
import {makeGeminiRequest,validateDraft,imagePrompts,calculatePrice,ceil9000,SHOPS} from '../lib/core.mjs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const base=dirname(dirname(fileURLToPath(import.meta.url)));
const demo={vi:{title:'Nameset M10',short:'Hình in',description:'Hình in PET',seoTitle:'Nameset M10',seoDescription:'Hình in áo bóng đá',slug:'nameset-m10',keywords:'nameset',altText:'Hình in nameset'},en:{title:'Player nameset',short:'Heat transfer',description:'Heat transfer print',seoTitle:'Nameset M10',seoDescription:'Transfer print',slug:'player-nameset',keywords:'football',altText:'Nameset photograph'},facts:{category:'Nameset',material:'PET',dimensions:'',variants:'',usage:'Ép nhiệt'},missing:['Kích thước'],photoPlan:['Ảnh bìa']};
test('manifest MV3 and minimum permissions',async()=>{const p=JSON.parse(await readFile(join(base,'manifest.json'),'utf8'));assert.equal(p.manifest_version,3);assert.equal(p.side_panel.default_path,'panel.html');assert.ok(p.host_permissions.includes('https://generativelanguage.googleapis.com/*'));assert.ok(!p.host_permissions.includes('<all_urls>'));assert.ok(!p.permissions.includes('tabs'));});
test('six shop rules, Gemini structured response',()=>{assert.equal(Object.keys(SHOPS).length,6);const body=makeGeminiRequest({shop:'DHL STUDIO',name:'Nameset',images:['data:image/png;base64,aGVsbG8=']});assert.equal(body.contents[0].parts[1].inlineData.mimeType,'image/png');assert.equal(body.generationConfig.responseMimeType,'application/json');assert.equal(validateDraft(demo).vi.title,'Nameset M10');});
test('invalid shop and oversized image rejected',()=>{assert.throws(()=>makeGeminiRequest({shop:'FAKE'}));assert.throws(()=>makeGeminiRequest({shop:'DHL STUDIO',images:['data:image/png;base64,'+'A'.repeat(4_300_000)]}),/3MB/);});
test('nine independently copyable image prompts',()=>{const a=imagePrompts(demo,{shop:'DHL STUDIO',name:'Nameset M10'});assert.equal(a.length,9);assert.match(a[7].prompt,/hướng dẫn in tên số.png/);assert.match(a[0].prompt,/ẢNH GỐC THẬT/);});
test('five shop logos mandatory and DHL SPORTS exempt in every image prompt',()=>{
  for(const shop of Object.keys(SHOPS)){
    const list=imagePrompts(demo,{shop,name:'Test product'});
    assert.equal(list.length,9);
    for(const p of list){
      if(shop==='DHL SPORTS'){
        assert.match(p.prompt,/KHÔNG CHÈN logo\/watermark ĐHL SPORTS/);
        assert.doesNotMatch(p.prompt,/BẮT BUỘC đính kèm ảnh FILE LOGO GỐC/);
      }else{
        assert.match(p.prompt,/BẮT BUỘC chèn/);
        assert.match(p.prompt,/CHỜ LOGO GỐC/);
        assert.match(p.prompt,/không tự thiết kế logo/);
        if(shop==='DHL STUDIO')assert.match(p.prompt,/KHÔNG được đưa vào FILE IN PET/);
      }
    }
  }
});
test('price rounding, missing fees blocked',()=>{assert.equal(ceil9000(125000),129000);assert.equal(ceil9000(129000),129000);const p=calculatePrice({cost:45000,feePercent:20,packing:4000,fixedFee:2000,targetProfit:35000});assert.equal(p.shopeePrice,109000);assert.equal(p.profit,36200);assert.throws(()=>calculatePrice({cost:'',feePercent:20}),/giá vốn/);assert.throws(()=>calculatePrice({cost:10000,feePercent:''}),/phí sàn/);});
test('Excel bytes generated without API or external libraries',()=>{const bytes=makeWorkbook([{name:'Tiếng Việt',rows:[['Trường','Nội dung'],['Tên sản phẩm','Tên thử'],['Giá',109000]]},{name:'English',rows:[['Field','Value'],['Name','Test product']]}]);assert.equal(new DataView(bytes.buffer).getUint32(0,true),0x04034b50);assert.ok(bytes.length>1500);});
test('sidepanel hooks all declared UI element ids used',async()=>{const js=await readFile(join(base,'panel.js'),'utf8'),html=await readFile(join(base,'panel.html'),'utf8');const all=[...js.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]);for(const id of new Set(all))assert.ok(html.includes('id="'+id+'"'),`Missing UI id ${id}`);});
test('source code contains no hardcoded API key or external script',async()=>{for(const name of ['background.js','panel.html','panel.js']){const data=await readFile(join(base,name),'utf8');assert.ok(!/AIza[A-Za-z0-9_-]{25,}/.test(data));assert.ok(!/<script\s+src="https?:/i.test(data));}});

test('stable public extension key keeps OAuth Client extension ID fixed',async()=>{
  const m=JSON.parse(await readFile(join(base,'manifest.json'),'utf8'));
  const digest=createHash('sha256').update(Buffer.from(m.key,'base64')).digest().subarray(0,16);
  const id=[...digest].map(v=>String.fromCharCode(97+(v>>4))+String.fromCharCode(97+(v&15))).join('');
  assert.equal(id,'ojbejkjaalblfimeojmobicanhbipkel');
  assert.equal(m.oauth2.scopes[0],'https://www.googleapis.com/auth/drive');
});
