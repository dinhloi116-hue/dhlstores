(() => {
  'use strict';

  const resolver=globalThis.DHLSapoInventoryResolver;
  if(!resolver)return;

  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const QUEUE_KEY='dhlSapoProductCreateQueueV1';
  const ALARM='dhl-sapo-product-create-queue';
  const LIST_PAGE_LIMIT=250;
  const MAX_LIST_PAGES=12;
  const text=(v)=>String(v==null?'':v).trim();
  const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
  const normSku=(v)=>resolver.normSku(v);

  function storeHost(value){
    let raw=text(value).replace(/^https?:\/\//i,'').replace(/\/.*$/,'').toLowerCase();
    if(raw&&!raw.includes('.'))raw=`${raw}.mysapo.net`;
    if(!/^[a-z0-9][a-z0-9.-]*\.mysapo\.net$/i.test(raw))throw new Error('Tên shop Sapo phải dạng ten-shop.mysapo.net');
    return raw;
  }

  function authHeaders(sapo){
    const key=text(sapo&&sapo.apiKey),secret=text(sapo&&sapo.apiSecret);
    if(!key||!secret)throw new Error('Chưa có API Key / API Secret của Ứng dụng riêng Sapo.');
    return{Authorization:`Basic ${btoa(`${key}:${secret}`)}`,Accept:'application/json','Content-Type':'application/json'};
  }

  async function sapoFetch(sapo,path,{method='GET',body=null}={}){
    const host=storeHost(sapo&&sapo.storeHost);
    const response=await fetch(`https://${host}${path}`,{
      method,
      headers:authHeaders(sapo),
      body:body==null?undefined:JSON.stringify(body)
    });
    const raw=await response.text();
    let data={};
    try{data=raw?JSON.parse(raw):{};}catch{data={raw};}
    if(!response.ok){
      let detail='';
      const candidate=data&&typeof data==='object'?(data.message||data.error||data.errors):'';
      if(candidate&&typeof candidate==='object'){
        try{detail=JSON.stringify(candidate);}catch{detail=String(candidate);}
      }else detail=text(candidate||raw);
      throw new Error(`Sapo HTTP ${response.status}${detail?`: ${detail.slice(0,420)}`:''}`);
    }
    return data||{};
  }

  async function readConfig(){
    const s=await chrome.storage.local.get(CONFIG_KEY);
    const cfg=s[CONFIG_KEY]&&typeof s[CONFIG_KEY]==='object'?s[CONFIG_KEY]:{};
    return cfg;
  }

  function httpUrl(value){
    try{const u=new URL(text(value));return /^https?:$/.test(u.protocol)?u.href:'';}catch{return'';}
  }

  function sanitizeProduct(raw){
    const alias=text(raw&&raw.alias);
    const name=text(raw&&raw.name);
    if(!alias||!name)throw new Error('Sản phẩm thiếu alias hoặc tên.');
    const variants=(Array.isArray(raw&&raw.variants)?raw.variants:[]).map(v=>({
      size:text(v&&v.size),
      sku:text(v&&v.sku),
      stock:Number(v&&v.stock),
      imageUrl:httpUrl(v&&v.imageUrl)
    })).filter(v=>v.size&&v.sku&&Number.isFinite(v.stock)&&v.stock>=0);
    if(!variants.length)throw new Error(`${name}: không có biến thể Size/SKU/tồn hợp lệ.`);
    const skuSet=new Set();
    for(const v of variants){
      const key=normSku(v.sku);
      if(!key||skuSet.has(key))throw new Error(`${name}: SKU trống hoặc trùng ${v.sku}.`);
      skuSet.add(key);
    }
    const images=[];const seen=new Set();
    for(const candidate of [...(Array.isArray(raw&&raw.images)?raw.images:[]),...variants.map(v=>v.imageUrl)]){
      const url=httpUrl(candidate);
      if(!url||seen.has(url))continue;
      seen.add(url);images.push(url);
      if(images.length>=20)break;
    }
    return{
      alias,name,
      parentId:Number(raw&&raw.parentId)||0,
      color:text(raw&&raw.color),
      sourceUrl:httpUrl(raw&&raw.sourceUrl),
      images,variants,
      productId:0,variantIndex:0,imagesDone:false,status:'pending',created:false,adopted:false,error:''
    };
  }

  function productsFrom(data){
    if(Array.isArray(data&&data.products))return data.products;
    if(Array.isArray(data&&data.data))return data.data;
    if(data&&data.data&&Array.isArray(data.data.products))return data.data.products;
    return[];
  }

  function productFrom(data){
    if(data&&data.product&&typeof data.product==='object')return data.product;
    if(data&&data.data&&data.data.product&&typeof data.data.product==='object')return data.data.product;
    if(data&&data.data&&typeof data.data==='object'&&!Array.isArray(data.data))return data.data;
    return null;
  }

  function variantsOf(product){return Array.isArray(product&&product.variants)?product.variants:[];}
  function imagesOf(product){return Array.isArray(product&&product.images)?product.images:[];}

  function expectedSkuSet(item){return new Set((item.variants||[]).map(v=>normSku(v.sku)).filter(Boolean));}
  function productSkuSet(product){return new Set(variantsOf(product).map(v=>normSku(v&&v.sku)).filter(Boolean));}
  function sameExpectedSkus(product,item){
    const expected=expectedSkuSet(item),actual=productSkuSet(product);
    if(expected.size!==actual.size)return false;
    for(const sku of expected)if(!actual.has(sku))return false;
    return true;
  }

  async function findExistingByAlias(sapo,item){
    const q=new URLSearchParams({alias:item.alias,limit:'20',fields:'id,name,alias,tags,variants,images'});
    const data=await sapoFetch(sapo,`/admin/products.json?${q.toString()}`);
    return productsFrom(data).find(p=>text(p&&p.alias)===item.alias)||null;
  }

  function productPayload(item){
    return{
      product:{
        name:item.name,
        alias:item.alias,
        tags:'Nguồn aobongda.net',
        published_on:new Date().toISOString(),
        options:[{name:'Size'}],
        images:(item.images||[]).map((src,index)=>({src,alt:index===0?item.name:`${item.name} ${index+1}`})),
        variants:(item.variants||[]).map(v=>({
          option1:v.size,
          sku:v.sku,
          inventory_management:'bizweb',
          inventory_quantity:0,
          inventory_policy:'deny',
          requires_shipping:true
        }))
      }
    };
  }

  async function loadProduct(sapo,productId){
    const data=await sapoFetch(sapo,`/admin/products/${Number(productId)}.json?fields=id,name,alias,tags,variants,images`);
    const product=productFrom(data);
    if(!product||!Number(product.id))throw new Error(`Không đọc lại được sản phẩm Sapo #${productId}.`);
    return product;
  }

  async function createOrAdopt(sapo,item,queue){
    if(Number(item.productId))return loadProduct(sapo,item.productId);
    const existing=await findExistingByAlias(sapo,item);
    if(existing){
      if(!sameExpectedSkus(existing,item))throw new Error(`Alias “${item.alias}” đã tồn tại trên Sapo nhưng bộ SKU khác. Tool không ghi đè.`);
      item.productId=Number(existing.id);
      item.adopted=true;
      item.status='stock';
      await chrome.storage.local.set({[QUEUE_KEY]:queue});
      return existing;
    }
    const data=await sapoFetch(sapo,'/admin/products.json',{method:'POST',body:productPayload(item)});
    const created=productFrom(data);
    if(!created||!Number(created.id))throw new Error(`${item.name}: Sapo không trả về ID sản phẩm sau khi tạo.`);
    item.productId=Number(created.id);
    item.created=true;
    item.status='stock';
    // Checkpoint ngay sau POST để service worker dừng cũng không tạo trùng khi chạy lại.
    await chrome.storage.local.set({[QUEUE_KEY]:queue});
    return created;
  }

  async function ensureProductImages(sapo,item,product,queue){
    if(item.imagesDone)return;
    if(!(item.images||[]).length){item.imagesDone=true;await chrome.storage.local.set({[QUEUE_KEY]:queue});return;}
    if(imagesOf(product).length){item.imagesDone=true;await chrome.storage.local.set({[QUEUE_KEY]:queue});return;}
    // Fallback: nếu POST product không nhận images, dùng API Product Image với src URL.
    for(const src of item.images){
      await sapoFetch(sapo,`/admin/products/${Number(item.productId)}/images.json`,{method:'POST',body:{image:{src}}});
      await sleep(350);
    }
    item.imagesDone=true;
    await chrome.storage.local.set({[QUEUE_KEY]:queue});
  }

  async function inventoryItemId(sapo,sapoVariant,expected){
    let id=resolver.variantInventoryItemId({variant:sapoVariant});
    if(id)return id;
    const variantId=Number(sapoVariant&&sapoVariant.id);
    if(!variantId)throw new Error(`Không có variant ID cho SKU ${expected.sku}.`);
    try{
      const detail=await sapoFetch(sapo,`/admin/variants/${variantId}.json`);
      id=resolver.variantInventoryItemId(detail);
      if(id)return id;
    }catch{}
    try{
      const q=new URLSearchParams({variant_id:String(variantId),limit:'50'});
      const data=await sapoFetch(sapo,`/admin/inventory_items.json?${q.toString()}`);
      const candidates=resolver.inventoryCandidates(data);
      const exact=candidates.find(x=>Number(x&&x.variant_id)===variantId)||resolver.findCandidate(candidates,{variantId,sku:expected.sku});
      if(exact&&Number(exact.id))return Number(exact.id);
    }catch{}
    for(let page=1;page<=MAX_LIST_PAGES;page+=1){
      const q=new URLSearchParams({limit:String(LIST_PAGE_LIMIT),page:String(page)});
      const data=await sapoFetch(sapo,`/admin/inventory_items.json?${q.toString()}`);
      const candidates=resolver.inventoryCandidates(data);
      const exact=candidates.find(x=>Number(x&&x.variant_id)===variantId)||null;
      if(exact&&Number(exact.id))return Number(exact.id);
      if(candidates.length<LIST_PAGE_LIMIT)break;
    }
    throw new Error(`Không tìm thấy inventory item cho SKU ${expected.sku} / variant ${variantId}.`);
  }

  async function syncStock(sapo,item,product,queue){
    let current=product;
    if(!sameExpectedSkus(current,item))current=await loadProduct(sapo,item.productId);
    const bySku=new Map(variantsOf(current).map(v=>[normSku(v&&v.sku),v]));
    if(bySku.size!==item.variants.length)throw new Error(`${item.name}: Sapo tạo thiếu biến thể (${bySku.size}/${item.variants.length}).`);
    while(item.variantIndex<item.variants.length){
      const expected=item.variants[item.variantIndex];
      const sapoVariant=bySku.get(normSku(expected.sku));
      if(!sapoVariant)throw new Error(`${item.name}: không thấy SKU ${expected.sku} sau khi tạo.`);
      const invId=await inventoryItemId(sapo,sapoVariant,expected);
      await sapoFetch(sapo,`/admin/inventory_items/${invId}/locations/${Number(sapo.locationId)}.json`,{
        method:'PUT',body:{inventory_level:{available:Number(expected.stock)}}
      });
      item.variantIndex+=1;
      await chrome.storage.local.set({[QUEUE_KEY]:queue});
      await sleep(450);
    }
  }

  async function finalize(queue){
    queue.status='done';queue.finishedAt=Date.now();queue.index=queue.items.length;
    await chrome.storage.local.set({[QUEUE_KEY]:queue});
  }

  async function processQueue(){
    const s=await chrome.storage.local.get([QUEUE_KEY,CONFIG_KEY]);
    const queue=s[QUEUE_KEY];
    const config=s[CONFIG_KEY]&&typeof s[CONFIG_KEY]==='object'?s[CONFIG_KEY]:{};
    const sapo=config.sapo||{};
    if(!queue||queue.status!=='running')return;
    if(!sapo.verifiedAt||!sapo.locationId)throw new Error('Mất xác minh Ứng dụng riêng Sapo.');
    if(queue.index>=queue.items.length){await finalize(queue);return;}
    const item=queue.items[queue.index];
    try{
      let product=await createOrAdopt(sapo,item,queue);
      await ensureProductImages(sapo,item,product,queue);
      product=await loadProduct(sapo,item.productId);
      await syncStock(sapo,item,product,queue);
      item.status='done';item.error='';item.finishedAt=Date.now();
      queue.success=Number(queue.success||0)+1;
      if(item.created)queue.created=Number(queue.created||0)+1;
      if(item.adopted)queue.adopted=Number(queue.adopted||0)+1;
      queue.index+=1;
      await chrome.storage.local.set({[QUEUE_KEY]:queue});
      if(queue.index>=queue.items.length)await finalize(queue);
      else chrome.alarms.create(ALARM,{when:Date.now()+900});
    }catch(error){
      item.status='error';item.error=error&&error.message||String(error);
      queue.status='paused';
      queue.errors=Array.isArray(queue.errors)?queue.errors:[];
      queue.errors.push({at:Date.now(),index:queue.index,name:item.name,alias:item.alias,productId:Number(item.productId)||0,error:item.error});
      await chrome.storage.local.set({[QUEUE_KEY]:queue});
    }
  }

  async function start(products){
    const config=await readConfig(),sapo=config.sapo||{};
    if(!sapo.verifiedAt||!sapo.locationId)throw new Error('Chưa xác minh Ứng dụng riêng Sapo. Bấm KIỂM TRA KẾT NỐI SAPO trước.');
    const state=await chrome.storage.local.get(QUEUE_KEY),old=state[QUEUE_KEY];
    if(old&&['running','paused'].includes(old.status))throw new Error('Đang có hàng đợi tạo sản phẩm Sapo chưa hoàn tất. Hãy tiếp tục hoặc xử lý hàng đợi đó trước.');
    const items=(Array.isArray(products)?products:[]).slice(0,250).map(sanitizeProduct);
    if(!items.length)throw new Error('Không có sản phẩm hợp lệ để đăng lên Sapo.');
    const queue={
      id:`product-create-${Date.now()}`,status:'running',createdAt:Date.now(),startedAt:Date.now(),finishedAt:0,
      shop:storeHost(sapo.storeHost),locationId:Number(sapo.locationId),locationName:text(sapo.locationName),
      index:0,total:items.length,success:0,created:0,adopted:0,errors:[],items
    };
    await chrome.storage.local.set({[QUEUE_KEY]:queue});
    chrome.alarms.create(ALARM,{when:Date.now()+500});
    return queue;
  }

  async function retry(){
    const state=await chrome.storage.local.get(QUEUE_KEY),queue=state[QUEUE_KEY];
    if(!queue||queue.status!=='paused')throw new Error('Không có hàng đợi tạo sản phẩm đang tạm dừng.');
    const item=queue.items&&queue.items[queue.index];
    if(item){item.status=Number(item.productId)?'stock':'pending';item.error='';}
    queue.status='running';
    await chrome.storage.local.set({[QUEUE_KEY]:queue});
    chrome.alarms.create(ALARM,{when:Date.now()+500});
    return queue;
  }

  chrome.alarms.onAlarm.addListener(alarm=>{
    if(alarm.name!==ALARM)return;
    processQueue().catch(async error=>{
      const state=await chrome.storage.local.get(QUEUE_KEY),queue=state[QUEUE_KEY];
      if(!queue)return;
      queue.status='paused';
      queue.errors=Array.isArray(queue.errors)?queue.errors:[];
      queue.errors.push({at:Date.now(),index:queue.index,error:error&&error.message||String(error)});
      await chrome.storage.local.set({[QUEUE_KEY]:queue});
    });
  });

  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(!message||!message.type)return;
    if(message.type==='DHL_SAPO_PRODUCT_CREATE_GET_STATE'){
      Promise.all([readConfig(),chrome.storage.local.get(QUEUE_KEY)]).then(([config,s])=>{
        const sapo=config.sapo||{};
        sendResponse({ok:true,verified:Boolean(sapo.verifiedAt&&sapo.locationId),shop:text(sapo.storeHost),locationName:text(sapo.locationName),queue:s[QUEUE_KEY]||null});
      }).catch(error=>sendResponse({ok:false,error:error&&error.message||String(error)}));
      return true;
    }
    if(message.type==='DHL_SAPO_PRODUCT_CREATE_START'){
      start(message.products||[]).then(queue=>sendResponse({ok:true,queue})).catch(error=>sendResponse({ok:false,error:error&&error.message||String(error)}));
      return true;
    }
    if(message.type==='DHL_SAPO_PRODUCT_CREATE_RETRY'){
      retry().then(queue=>sendResponse({ok:true,queue})).catch(error=>sendResponse({ok:false,error:error&&error.message||String(error)}));
      return true;
    }
  });
})();
