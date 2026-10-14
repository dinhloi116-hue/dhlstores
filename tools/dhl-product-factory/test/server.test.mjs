import test from 'node:test';import assert from 'node:assert/strict';import {makeServer,ceil9,computePrice,exportWorkbook,validateDraft,analyze,buildImagePrompts,makeGeminiRequest} from '../server.mjs';
const baseDraft={vi:{title:'Nameset thử',short:'Tên số',description:'Hình in ép nhiệt',seoTitle:'Nameset đẹp',seoDescription:'Tên số áo bóng đá',slug:'nameset-thu',keywords:'nameset',altText:'Hình in nameset'},en:{title:'Player Nameset',short:'Transfer print',description:'Transfer nameset',seoTitle:'Player nameset',seoDescription:'Football transfer nameset',slug:'player-nameset',keywords:'football nameset',altText:'Transfer nameset'},facts:{category:'Hình in PET',material:'PET',dimensions:'',variants:'',usage:'Ép nhiệt'},missing:['Kích thước'],photoPlan:['Ảnh bìa','Ảnh kích thước']};
test('round up to 9,000 endings',()=>{assert.equal(ceil9(125000),129000);assert.equal(ceil9(129000),129000);assert.equal(ceil9(129001),139000)});
test('cost and fees calculation not AI guessed',()=>{let p=computePrice({cost:45000,feePercent:20,targetProfit:35000,packing:4000,fixedFee:2000});assert.equal(p.shopeePrice,109000);assert.equal(p.actualProfit,36200);assert.equal(p.webOfflineSuggested,89000)});
test('bad fee rejected',()=>assert.throws(()=>computePrice({cost:1000,feePercent:99}),/phí/));
test('structured draft validates',()=>assert.equal(validateDraft(baseDraft).vi.title,'Nameset thử'));
test('excel information and SEO have valid ZIP signatures',()=>{for(const kind of ['info','seo','price']){const b=exportWorkbook({kind,draft:baseDraft,product:{shop:'DHL STUDIO',sku:'TEST-1'},priceInput:{cost:45000,feePercent:20,targetProfit:35000}});assert.equal(b.readUInt32LE(0),0x04034b50);assert.ok(b.length>1500)}});
test('Gemini request includes structured JSON and source inline image, no OpenAI token',()=>{
 const pic='data:image/png;base64,aGVsbG8=';
 const body=makeGeminiRequest({shop:'DHL STUDIO',name:'Nameset',images:[pic]});
 assert.equal(body.contents[0].parts[1].inlineData.mimeType,'image/png');
 assert.equal(body.contents[0].parts[1].inlineData.data,'aGVsbG8=');
 assert.equal(body.generationConfig.responseMimeType,'application/json');
 assert.ok(body.generationConfig.responseSchema.properties.vi);
});
test('Image prompts are zero API calls, nine individual prompts for ChatGPT',()=>{
 const list=buildImagePrompts({draft:baseDraft,product:{shop:'DHL STUDIO',sku:'TEST-1'}});
 assert.equal(list.length,9);assert.ok(list[0].prompt.includes('đính kèm ảnh THẬT'));
 assert.equal(list[7].kind,'requires-source-instruction');
 assert.match(list[7].prompt,/hướng dẫn in tên số.png/);
 assert.throws(()=>buildImagePrompts({draft:baseDraft,product:{shop:'INVALID'}}),/Shop không hợp lệ/);
});
test('mock Gemini contract, password, prompt endpoint and Excel',async()=>{
 let calls=0;const fetchMock=async(url,init)=>{
  calls++;assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent');
  assert.equal(init.headers['x-goog-api-key'],'stub');
  const b=JSON.parse(init.body);assert.equal(b.generationConfig.responseMimeType,'application/json');
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(baseDraft)}]}}]}),{status:200});
 };
 const app=makeServer({PRODUCT_STUDIO_PASSWORD:'secret',GEMINI_API_KEY:'stub'},fetchMock);
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));let url='http://127.0.0.1:'+app.address().port;
 try{
  const auth=await fetch(url+'/api/config',{headers:{'x-tool-password':'bad'}});assert.equal(auth.status,401);
  const cfg=await fetch(url+'/api/config',{headers:{'x-tool-password':'secret'}});let config=await cfg.json();assert.equal(config.provider,'gemini');assert.equal(config.hasKey,true);
  const analyzeRes=await fetch(url+'/api/analyze',{method:'POST',headers:{'x-tool-password':'secret','Content-Type':'application/json'},body:JSON.stringify({shop:'DHL STUDIO',name:'Nameset',images:[]})});
  assert.equal(analyzeRes.status,200);let data=await analyzeRes.json();assert.equal(data.draft.en.title,'Player Nameset');assert.equal(calls,1);
  const prompts=await fetch(url+'/api/prompts',{method:'POST',headers:{'x-tool-password':'secret','Content-Type':'application/json'},body:JSON.stringify({draft:data.draft,product:{shop:'DHL STUDIO',sku:'TEST-1'}})});
  assert.equal(prompts.status,200);assert.equal((await prompts.json()).prompts.length,9);assert.equal(calls,1);
  const image=await fetch(url+'/api/image',{method:'POST',headers:{'x-tool-password':'secret','Content-Type':'application/json'},body:'{}'});assert.equal(image.status,404);
  const exp=await fetch(url+'/api/export',{method:'POST',headers:{'x-tool-password':'secret','Content-Type':'application/json'},body:JSON.stringify({kind:'seo',draft:data.draft,product:{shop:'DHL STUDIO',sku:'TEST-1'},priceInput:{cost:'',feePercent:20}})});
  assert.equal(exp.status,200);assert.match(exp.headers.get('content-type'),/spreadsheetml/);assert.ok((await exp.arrayBuffer()).byteLength>1500);
 }finally{await new Promise(resolve=>app.close(resolve));}
});
test('Gemini free quota errors are explained, no silent paid fallback',async()=>{
 const f=async()=>new Response('rate limit',{status:429});
 await assert.rejects(()=>analyze({shop:'DHL STUDIO',name:'Test',images:[]},{GEMINI_API_KEY:'stub'},f),/hạn mức/);
});
